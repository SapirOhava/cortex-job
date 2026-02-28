import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Editors (email-based RBAC)
 * Doc id = normalized email (lowercase, trimmed)
 */
const editors = [
  { email: "ohavasapir@gmail.com" },
  { email: "example@mail.com" },
];

/**
 * Full traffic data
 */
const trafficStats = [
  { date: "2025-03-01", visits: 120 },
  { date: "2025-03-02", visits: 140 },
  { date: "2025-03-03", visits: 98 },
  { date: "2025-03-04", visits: 132 },
  { date: "2025-03-05", visits: 101 },
  { date: "2025-03-06", visits: 87 },
  { date: "2025-03-07", visits: 94 },
  { date: "2025-03-08", visits: 178 },
  { date: "2025-03-09", visits: 164 },
  { date: "2025-03-10", visits: 112 },
  { date: "2025-03-11", visits: 106 },
  { date: "2025-03-12", visits: 133 },
  { date: "2025-03-13", visits: 90 },
  { date: "2025-03-14", visits: 124 },
  { date: "2025-03-15", visits: 110 },
  { date: "2025-03-16", visits: 175 },
  { date: "2025-03-17", visits: 188 },
  { date: "2025-03-18", visits: 147 },
  { date: "2025-03-19", visits: 133 },
  { date: "2025-03-20", visits: 119 },
  { date: "2025-03-21", visits: 102 },
  { date: "2025-03-22", visits: 111 },
  { date: "2025-03-23", visits: 154 },
  { date: "2025-03-24", visits: 162 },
  { date: "2025-03-25", visits: 120 },
  { date: "2025-03-26", visits: 108 },
  { date: "2025-03-27", visits: 113 },
  { date: "2025-03-28", visits: 95 },
  { date: "2025-03-29", visits: 142 },
  { date: "2025-03-30", visits: 170 },
  { date: "2025-03-31", visits: 128 },
  { date: "2025-04-01", visits: 105 },
  { date: "2025-04-02", visits: 87 },
  { date: "2025-04-03", visits: 156 },
  { date: "2025-04-04", visits: 131 },
  { date: "2025-04-05", visits: 122 },
  { date: "2025-04-06", visits: 149 },
  { date: "2025-04-07", visits: 95 },
  { date: "2025-04-08", visits: 143 },
  { date: "2025-04-09", visits: 137 },
  { date: "2025-04-10", visits: 128 },
  { date: "2025-04-11", visits: 109 },
  { date: "2025-04-12", visits: 117 },
  { date: "2025-04-13", visits: 138 },
  { date: "2025-04-14", visits: 160 },
  { date: "2025-04-15", visits: 151 },
  { date: "2025-04-16", visits: 100 },
  { date: "2025-04-17", visits: 134 },
  { date: "2025-04-18", visits: 141 },
  { date: "2025-04-19", visits: 108 },
  { date: "2025-04-20", visits: 157 },
  { date: "2025-04-21", visits: 120 },
  { date: "2025-04-22", visits: 99 },
  { date: "2025-04-23", visits: 126 },
  { date: "2025-04-24", visits: 153 },
  { date: "2025-04-25", visits: 115 },
  { date: "2025-04-26", visits: 130 },
  { date: "2025-04-27", visits: 98 },
  { date: "2025-04-28", visits: 118 },
  { date: "2025-04-29", visits: 167 },
  { date: "2025-04-30", visits: 148 },
];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function seed() {
  console.log("Seeding trafficStats + editors...");

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Seed trafficStats (upsert by date doc id)
  trafficStats.forEach((item) => {
    const ref = db.collection("trafficStats").doc(item.date);
    batch.set(
      ref,
      {
        date: item.date,
        visits: item.visits,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  });

  // Seed editors (doc id = email)
  editors.forEach((e) => {
    const email = normalizeEmail(e.email);
    const ref = db.collection("editors").doc(email);
    batch.set(
      ref,
      {
        email,
        addedAt: now,
        source: "seed",
      },
      { merge: true }
    );
  });

  await batch.commit();

  console.log(`Seeded ${trafficStats.length} trafficStats docs.`);
  console.log(`Seeded ${editors.length} editors.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });