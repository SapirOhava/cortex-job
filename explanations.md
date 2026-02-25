Seed script explained in depth (beginner-friendly)

Here is the script conceptually:

“Connect to Firestore as an admin, and insert many documents into the trafficStats collection.”

Firestore is not “tables/rows”. It’s:

Collection = like a table

Document = like a row

Fields = columns inside the document

1) Import Admin SDK
import * as admin from "firebase-admin";

This loads the Firebase Admin SDK:

It is the “server library” for Firebase.

It can read/write Firestore and verify auth tokens.

It has full access.

In Cloud Functions, this works without you adding keys because Firebase provides credentials automatically.

2) Initialize Admin SDK
admin.initializeApp();

This tells admin SDK:

“Use the Firebase project configuration for this environment.”

When you run this:

In emulator mode: it connects to emulator if env vars are set

In production mode: it connects to real Firestore in Google Cloud

If you forget this line, admin.firestore() won’t work.

3) Get Firestore database object
const db = admin.firestore();

This creates a Firestore client called db.

From now on:

db.collection("trafficStats") = go to that collection

.doc("someId") = go to a specific document

.set(...) = write data

.delete() = remove data

4) Your seed data array
const trafficStats = [
  { date: "2025-03-01", visits: 120 },
  ...
];

This is just plain JavaScript data in memory.

Each object is one traffic record:

date = "YYYY-MM-DD"

visits = number of visits that day

5) The seed function
async function seed() {
  console.log("Seeding trafficStats...");

async means:

the function will use await inside it.

it returns a Promise (because Firestore calls are async).

console.log just prints to terminal, so you know it started.

6) Create a batch
const batch = db.batch();

A batch is Firestore’s way of saying:

“I want to do many writes together as one operation.”

Why batch is good:

Faster than doing 60 separate network calls

If something fails, you don’t end up with “half the data inserted”

Looks more professional

Firestore has a limit: max 500 operations per batch.
You have ~61 docs, so it’s totally safe.

7) Loop over data and prepare writes
trafficStats.forEach((item) => {
  const ref = db.collection("trafficStats").doc(item.date);
What this does:

db.collection("trafficStats") means “use the collection named trafficStats”

.doc(item.date) means “use document ID = the date”

So document IDs become:

2025-03-01

2025-03-02

This is a key “impressive” design choice because:

It avoids duplicates if you run seed again

It makes each date unique automatically

This is what “upsert by date” means:

If doc exists → overwrite/update it

If doc doesn’t exist → create it

Same command works for both.

8) Add the set operation into the batch
batch.set(ref, {
  date: item.date,
  visits: item.visits,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});

This does NOT write yet.

It only says:

“When we commit, write this data to that document.”

What is serverTimestamp()?

It means:

Firestore fills the timestamp on the server (not your computer clock)

It’s consistent and trustworthy

We add:

createdAt and updatedAt (common production pattern)

Note: In real production, createdAt should not be overwritten on reseed, but for the assignment it’s totally fine. If you want, we can make it “createdAt only if missing” later.

9) Execute the batch
await batch.commit();

This is the moment that actually writes everything to Firestore.

It sends all the writes in one “commit”.

10) Print success
console.log(`Seeded ${trafficStats.length} documents (upsert by date).`);

Just tells you how many docs were inserted.

11) Run seed() and exit process
seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });

This is standard “script runner” style.

If it succeeds → exit with code 0 (success)

If it fails → print error and exit with code 1 (failure)

Why exit?
Because this is a one-time script, not a server.
You want it to finish and stop.

Why this works for emulator vs production

This script always uses:

admin.initializeApp();

Then Admin SDK decides “where to connect”:

If you run with FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
→ it connects to local emulator

If you run without that env var
→ it connects to real Firestore in Google Cloud

So the same script can seed both environments safely.

First: Firestore is NOT SQL

There is:

❌ No CREATE TABLE

❌ No predefined schema

❌ No need to “create collection first”

Firestore is document-based and collections are created automatically.

🔹 What are the rules to use batch?

Batch rules:

Max 500 operations per batch

All operations execute together

If commit fails → nothing is written

You must call batch.commit() for it to execute

That’s it.

You use batch when:

Writing multiple docs

Want atomic behavior

Want performance

For 60 docs?
Not required — but it looks professional.

🔹 Where did we create db.collection("trafficStats")?

You didn’t.

And that’s correct.

In Firestore:

👉 A collection is created automatically when the first document is written.

There is no separate “create collection” step.

The first time you do:

db.collection("trafficStats").doc("2025-03-01").set(...)

Firestore:

creates collection trafficStats

creates document 2025-03-01

inserts fields

All in one go.

🔹 The line you’re confused about
const ref = db.collection("trafficStats").doc(item.date);

This does NOT:

fetch anything

read anything

check if it exists

It only creates a reference object in memory.

Think of it like this:

SQL world analogy:
INSERT INTO trafficStats (id, date, visits) VALUES (...)

In SQL, you must define table first.

In Firestore:

You define “where” you want to write using a reference.

🔹 What is a “reference”?

A reference is simply:

A pointer to a location in the database.

It does not mean data exists.

It’s like writing an address on an envelope.

You are not checking if someone lives there.
You are just preparing the address.

🔹 Let’s break this line into pieces
1️⃣ db

Your Firestore database instance.

2️⃣ .collection("trafficStats")

This means:

“I want the collection called trafficStats.”

If it exists → fine
If it doesn’t → still fine

This does NOT create anything yet.

It just creates a CollectionReference object.

3️⃣ .doc(item.date)

This means:

“Inside that collection, I want the document whose ID equals item.date.”

Example:

item.date = "2025-03-01"

So this becomes:

doc("2025-03-01")

Again:

It does not fetch

It does not check existence

It does not create

It just creates a pointer to:

trafficStats / 2025-03-01

That’s it.

🔹 Why do we need a reference?

Because Firestore write methods require one.

For example:

batch.set(ref, data)

set() needs:

where to write (reference)

what to write (data)

The reference tells Firestore:

collection: trafficStats
document id: 2025-03-01
🔹 So what actually creates the document?

This line:

await batch.commit();

Inside the batch we added:

batch.set(ref, {...})

When commit runs:

If document exists → overwrite

If document doesn’t exist → create it

Firestore does not care.

🔹 Visual representation

Before running seed:

Database:

(empty)

During loop:

Create pointer to:
trafficStats / 2025-03-01

Create pointer to:
trafficStats / 2025-03-02
...

After commit():

Database:

trafficStats
  ├── 2025-03-01
  ├── 2025-03-02
  ├── 2025-03-03
  ...
🔹 Important mental shift

In Firestore:

You don’t create tables.
You don’t create schemas.
You don’t create collections manually.

You just write to a path.

And that path becomes real when data is written.

🔹 Why use the date as document ID?

Because this:

doc(item.date)

means:

Each date is unique.

If you run seed twice:

It won’t duplicate

It overwrites same ID

That’s called upsert behavior.

🔹 What if we didn’t use .doc(item.date)?

If we wrote:

db.collection("trafficStats").add({...})

Firestore would:

auto-generate random ID

create duplicates every time you run seed

That would look sloppy.

🔹 Big picture summary

This line:

const ref = db.collection("trafficStats").doc(item.date);

Does NOT:

read

check

create

It only defines:

“This is the location I want to write to.”

The actual creation happens during:

batch.set(...)
await batch.commit()

1) Is the error handling “correct”?

Yes — for a seed script, this is absolutely acceptable and common:

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });

What it gives you

If batch.commit() throws → it goes to .catch(...)

You see the error in the terminal

Exit code 1 tells CI / the reviewer “this failed”

That’s “correct enough” for a home task.

Small improvement (optional but nice)
In Node, it’s a bit cleaner to set the exit code without forcing immediate exit:

process.exitCode = 1;

…but your current approach is totally fine.

2) “If commit fails, will it partially write data?”

With a single batch: no.

Either the commit succeeds and all writes happen,

or it fails and none happen.

So your handling is fine.

(If you split into multiple batches, then partial success is possible across batches — but you’re not doing that here.)

3) “Don’t you need to set the id in the document?”

You’re already setting the ID — just not inside the object.

This line sets the document ID:

const ref = db.collection("trafficStats").doc(item.date);

So the ID becomes the date, e.g.:

doc id = "2025-03-01"

Then:

batch.set(ref, { ... })

writes the fields into that doc.

So you do not need to add an id field unless you want it for convenience in the frontend.

Do you want an id field?

Often the frontend wants a stable id to use as a React key and for editing/deleting.

You have two options:

✅ Option A (recommended): don’t store id as a field

Keep DB clean

When reading, return { id: doc.id, ...doc.data() } from your API (you already do this in GET)

✅ Option B: store id field too

Slight duplication, but sometimes convenient

If you choose B, you can add:

batch.set(ref, {
  id: item.date,
  date: item.date,
  visits: item.visits,
  ...
});

But again: not required, and many teams avoid duplicating id.

Tiny “impress” tweak: preserve createdAt on reseed

Right now, if you run the seed again, you overwrite createdAt with a new timestamp.

If you want to look extra professional, set createdAt only if it doesn’t exist:

That requires reading existing docs (slower) or using a transaction. For a home task it’s optional.

1️⃣ Do I need try/catch or is .catch() enough?

You currently have:

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
What’s happening here?

Inside seed() you do:

await batch.commit();

If commit() fails:

it throws an error

because seed() is async, that error becomes a rejected Promise

the .catch(...) at the bottom catches it

So yes — this is already proper error handling.

You do NOT need an internal try/catch unless:

You want to log something specific

You want to recover from the error

You want custom cleanup logic

Equivalent version using try/catch

This would also be correct:

async function seed() {
  try {
    const batch = db.batch();
    ...
    await batch.commit();
    console.log("Seed successful");
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

Both are valid.

When do you NEED try/catch?

You need it when:

You want to handle the error inside the function.

You want to continue execution even if something fails.

You want to retry something.

For a simple seed script?

Your current .catch() at the end is perfectly clean and acceptable.

2️⃣ What is FieldValue.serverTimestamp()?

This is important 🔥

createdAt: admin.firestore.FieldValue.serverTimestamp(),
updatedAt: admin.firestore.FieldValue.serverTimestamp(),
What does it mean?

It tells Firestore:

“When you write this document, fill this field with the current timestamp on the SERVER.”

Not your computer.
Not the client.
Not JavaScript Date.now().

The Firestore server inserts the timestamp.

Why is that important?

If you did this:

createdAt: new Date()

That would:

use your local machine time

be different depending on where the code runs

possibly be manipulated

Using serverTimestamp() ensures:

consistent time

trusted server-side time

same timezone (UTC)

production-safe pattern

What actually gets stored?

Firestore stores it as a special Timestamp type, not a string.

Example stored value:

createdAt: 2026-02-25T14:31:22.391Z

It’s a Firestore Timestamp object internally.

What happens when writing?

When you call:

batch.set(ref, {
  createdAt: admin.firestore.FieldValue.serverTimestamp()
});

You are not sending an actual date.

You are sending an instruction:

“Replace this field with the server’s current time when committing.”

So the server fills it in during commit().

Why do we use both createdAt and updatedAt?

Common production pattern:

createdAt → when document was first created

updatedAt → when document was last modified

In a real system:

createdAt should only be set once

updatedAt changes every update

For a seed script, both being set is totally fine.

Is it “wrong” that createdAt and updatedAt are the same in the seed?

Short answer:

👉 No. It’s normal for initial creation.

When a document is first created:

createdAt = now

updatedAt = now

That is correct.

Because at creation time:

The document was created AND last updated at the same moment.

When should updatedAt change?

Only when you update the document later.

For example in your PUT route:

updates: {
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
}

So:

Seed → both timestamps equal

Later PUT → only updatedAt changes

That’s the correct lifecycle.

Why do we even add these fields in seed?

You asked something very important:

Is it just to make the field exist and then in PUT I change it?

Yes — exactly.

It establishes a consistent document shape.

Professional systems like consistency:

Every document in the collection should have:

date

visits

createdAt

updatedAt

Not some docs missing fields.

What would be wrong?

This would be wrong:

❌ Not setting updatedAt at all
❌ Using local Date.now() instead of serverTimestamp
❌ Forgetting to update updatedAt in PUT route

But what you have? Completely fine.

When would you improve it?

If this were real production, and you wanted to be extremely clean:

You would:

Only set createdAt when document does not exist

Never overwrite createdAt on reseed

Always update updatedAt on change

But that requires:

reading existing doc first

or using transaction

For a home task?

What you have is perfectly acceptable.

Actually better than 90% of candidates.

Mental model timeline
First seed
createdAt = 10:00
updatedAt = 10:00
Later PUT update
createdAt = 10:00
updatedAt = 10:30

That’s exactly what we want.

When would it be wrong?

It would be wrong if:

You reseed production again later and overwrite createdAt.

But:

For a demo project, that’s not a real concern.

Important distinction

Your seed script is not part of the runtime system.

It’s just for initial data population.

So it’s okay that it sets both timestamps.

Your PUT endpoint is responsible for maintaining updatedAt afterward.

Verdict

✅ Not wrong
✅ Industry standard pattern
✅ Totally acceptable for assignment
✅ Clean enough to impress