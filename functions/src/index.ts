import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

type AuthedRequest = Request & { user?: admin.auth.DecodedIdToken };

/** Verify Firebase ID token from Authorization: Bearer <token> */
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
    return;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
}

function isValidIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// Health check (no auth) for testing
app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// GET entries (paginated)
// GET /traffic?limit=10&cursor=2025-03-10
app.get("/traffic", requireAuth, async (req: AuthedRequest, res: Response) => {
  // 1) Parse limit
  const limitRaw = req.query.limit;
  const limitNum = Number(Array.isArray(limitRaw) ? limitRaw[0] : limitRaw);
  const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(limitNum, 100) : 10;

  // 2) Parse cursor (a date string "YYYY-MM-DD")
  const cursorRaw = req.query.cursor;
  const cursor = Array.isArray(cursorRaw) ? cursorRaw[0] : cursorRaw;

  if (cursor !== undefined && (typeof cursor !== "string" || !isValidIsoDate(cursor))) {
    res.status(400).json({ error: "cursor must be YYYY-MM-DD string" });
    return;
  }

  // 3) Build query
  let q = db.collection("trafficStats").orderBy("date", "asc").limit(limit);

  // cursor means: start AFTER this date
  if (cursor) {
    q = q.startAfter(cursor);
  }

  // 4) Execute
  const snap = await q.get();

  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // 5) Compute nextCursor from the LAST document in this page
  const last = snap.docs[snap.docs.length - 1];
  const nextCursor =
    last && typeof last.get("date") === "string" ? (last.get("date") as string) : null;

  res.json({ items, nextCursor });
});

// POST create (upsert by date to avoid duplicates)
app.post("/traffic", requireAuth, async (req: AuthedRequest, res: Response) => {
  const body = req.body ?? {};
  const date = body.date as unknown;
  const visits = body.visits as unknown;

  if (typeof date !== "string" || !isValidIsoDate(date)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD string" });
    return;
  }
  if (typeof visits !== "number" || !Number.isFinite(visits) || visits < 0) {
    res.status(400).json({ error: "visits must be a non-negative number" });
    return;
  }

  const ref = db.collection("trafficStats").doc(date);

  // If doc exists, keep createdAt, update updatedAt
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const createdAt = snap.exists
      ? snap.get("createdAt")
      : admin.firestore.FieldValue.serverTimestamp();

    tx.set(
      ref,
      {
        date,
        visits,
        createdAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  res.status(201).json({ id: date });
  return;
});

// PUT update
app.put("/traffic/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  const id = String(req.params.id); // force string safely

  const body = req.body ?? {};
  const date = body.date as unknown;
  const visits = body.visits as unknown;

  const updates: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (date !== undefined) {
    if (typeof date !== "string" || !isValidIsoDate(date)) {
      res.status(400).json({ error: "date must be YYYY-MM-DD string" });
      return;
    }
    updates.date = date;
  }

  if (visits !== undefined) {
    if (typeof visits !== "number" || !Number.isFinite(visits) || visits < 0) {
      res.status(400).json({ error: "visits must be a non-negative number" });
      return;
    }
    updates.visits = visits;
  }

  await db.collection("trafficStats").doc(id).set(updates, { merge: true });
  res.json({ ok: true });
  return;
});

// DELETE
app.delete("/traffic/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  const id = String(req.params.id); // force string safely

  await db.collection("trafficStats").doc(id).delete();
  res.json({ ok: true });
  return;
});

// Export as one HTTP function
export const api = functions.https.onRequest(app);