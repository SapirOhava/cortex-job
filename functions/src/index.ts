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

// GET all entries
app.get("/traffic", requireAuth, async (_req: AuthedRequest, res: Response) => {
  const snap = await db.collection("trafficStats").orderBy("date", "asc").get();
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
});

// POST create
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

  const ref = await db.collection("trafficStats").add({
    date,
    visits,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  res.status(201).json({ id: ref.id });
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