import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

// Initialize Admin once
admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

/**
 * -------------------------
 * Types
 * -------------------------
 */
type AuthedRequest = Request & {
  user?: admin.auth.DecodedIdToken;
};

/**
 * -------------------------
 * Helpers / Validation
 * -------------------------
 */
function isValidIsoDate(s: string): boolean {
  // YYYY-MM-DD (string ordering == chronological ordering)
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseLimit(raw: unknown, fallback = 10): number {
  const val = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), 100);
}

function parseOrder(raw: unknown): "asc" | "desc" {
  const val = Array.isArray(raw) ? raw[0] : raw;
  return val === "desc" ? "desc" : "asc";
}

/**
 * -------------------------
 * Auth middleware
 * -------------------------
 * Expects: Authorization: Bearer <Firebase ID Token>
 */
async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization ?? "";
  const match = header.match(/^Bearer (.+)$/);

  if (!match) {
    res.status(401).json({ error: "Missing Bearer token" });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * -------------------------
 * RBAC (Firestore - email based)
 * -------------------------
 * Collection: editors
 * Doc id: normalized email (lowercase)
 * If doc exists => editor
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function isEditorEmail(email: string): Promise<boolean> {
  const key = normalizeEmail(email);
  const snap = await db.collection("editors").doc(key).get();
  return snap.exists;
}

async function requireEditor(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthenticated" });
    return;
  }

  const email = req.user.email;
  if (!email) {
    res.status(403).json({ error: "Forbidden (no email on token)" });
    return;
  }

  try {
    const ok = await isEditorEmail(email);
    if (!ok) {
      res.status(403).json({ error: "Forbidden (editor role required)" });
      return;
    }
    next();
  } catch {
    // Fail closed (deny) if role check fails unexpectedly
    res.status(500).json({ error: "Failed to validate editor role" });
  }
}

/**
 * -------------------------
 * Router mounted under /api
 * -------------------------
 * This is IMPORTANT for Firebase Hosting rewrites:
 * Hosting forwards /api/... to the function, so Express must handle /api/... routes.
 */
const apiRouter = express.Router();

// Optional root handler (nice for quick checks)
apiRouter.get("/", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "cortex-job-dashboard-api", hint: "Try /api/health" });
});

// Health check (no auth) - useful for deployments
apiRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "cortex-job-dashboard-api" });
});

/**
 * GET /api/traffic?limit=10&cursor=2025-03-10&order=asc
 * - Pagination is by date field ordering (string YYYY-MM-DD).
 * - Cursor means "start AFTER this date" in the chosen order.
 */
apiRouter.get("/traffic", requireAuth, async (req: AuthedRequest, res: Response) => {
  const limit = parseLimit(req.query.limit, 10);
  const order = parseOrder(req.query.order);

  const cursorRaw = req.query.cursor;
  const cursor = (Array.isArray(cursorRaw) ? cursorRaw[0] : cursorRaw) as unknown;

  if (cursor !== undefined) {
    if (typeof cursor !== "string" || !isValidIsoDate(cursor)) {
      res.status(400).json({ error: "cursor must be a YYYY-MM-DD string" });
      return;
    }
  }

  let q = db.collection("trafficStats").orderBy("date", order).limit(limit);

  if (cursor) {
    q = q.startAfter(cursor);
  }

  const snap = await q.get();

  const items = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id, // doc id is the date
      date: (data.date as string) ?? d.id,
      visits: (data.visits as number) ?? null,
      createdAt: data.createdAt ?? null,
      updatedAt: data.updatedAt ?? null,
    };
  });

  const lastDoc = snap.docs[snap.docs.length - 1];
  const nextCursor =
    lastDoc && typeof lastDoc.get("date") === "string" ? (lastDoc.get("date") as string) : null;

  res.json({ items, nextCursor });
});

/**
 * POST /api/traffic  (UPSERT by date)
 * Body: { date: "YYYY-MM-DD", visits: number }
 * - Editor only.
 * - Date is immutable and must match document id.
 */
apiRouter.post(
  "/traffic",
  requireAuth,
  requireEditor,
  async (req: AuthedRequest, res: Response) => {
    const body = req.body ?? {};
    const date = body.date as unknown;
    const visits = body.visits as unknown;

    if (typeof date !== "string" || !isValidIsoDate(date)) {
      res.status(400).json({ error: "date must be a YYYY-MM-DD string" });
      return;
    }
    if (typeof visits !== "number" || !Number.isFinite(visits) || visits < 0) {
      res.status(400).json({ error: "visits must be a non-negative number" });
      return;
    }

    const ref = db.collection("trafficStats").doc(date);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      const createdAt = snap.exists ? snap.get("createdAt") : FieldValue.serverTimestamp();

      tx.set(
        ref,
        {
          date, // keep aligned with id
          visits,
          createdAt,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    res.status(201).json({ id: date });
  }
);

/**
 * PUT /api/traffic/:id
 * Body: { visits: number }
 * - Editor only.
 * - Date is IMMUTABLE (not allowed here).
 * - 404 if doc doesn't exist.
 */
apiRouter.put(
  "/traffic/:id",
  requireAuth,
  requireEditor,
  async (req: AuthedRequest, res: Response) => {
    const id = String(req.params.id);

    if (!isValidIsoDate(id)) {
      res.status(400).json({ error: "id must be a YYYY-MM-DD date (document id)" });
      return;
    }

    const body = req.body ?? {};
    const visits = body.visits as unknown;

    if (typeof visits !== "number" || !Number.isFinite(visits) || visits < 0) {
      res.status(400).json({ error: "visits must be a non-negative number" });
      return;
    }

    const ref = db.collection("trafficStats").doc(id);

    await db
      .runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error("NOT_FOUND");

        tx.set(
          ref,
          {
            visits,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      })
      .catch((err) => {
        if (String(err?.message || "").includes("NOT_FOUND")) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        throw err;
      });

    if (res.headersSent) return;

    res.json({ ok: true });
  }
);

/**
 * DELETE /api/traffic/:id
 * - Editor only.
 * - 404 if doc doesn't exist.
 */
apiRouter.delete(
  "/traffic/:id",
  requireAuth,
  requireEditor,
  async (req: AuthedRequest, res: Response) => {
    const id = String(req.params.id);

    if (!isValidIsoDate(id)) {
      res.status(400).json({ error: "id must be a YYYY-MM-DD date (document id)" });
      return;
    }

    const ref = db.collection("trafficStats").doc(id);

    await db
      .runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error("NOT_FOUND");
        tx.delete(ref);
      })
      .catch((err) => {
        if (String(err?.message || "").includes("NOT_FOUND")) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        throw err;
      });

    if (res.headersSent) return;

    res.json({ ok: true });
  }
);

/**
 * GET /api/me
 * Expose current user's role (handy for UI gating)
 */
apiRouter.get("/me", requireAuth, async (req: AuthedRequest, res: Response) => {
  const user = req.user!;
  const email = user.email ?? null;

  let role: "editor" | "viewer" = "viewer";
  if (email) {
    role = (await isEditorEmail(email)) ? "editor" : "viewer";
  }

  res.json({
    uid: user.uid,
    email,
    role,
  });
});

// Mount router under /api (THIS is the important change)
app.use("/api", apiRouter);

/**
 * Export HTTPS function
 */
export const api = functions.https.onRequest(app);