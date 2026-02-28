# Cortex Job Dashboard (React + Firebase Auth + Firestore + Cloud Functions)

A fullstack dashboard that displays and manages daily traffic stats:
- **Frontend:** React (Vite) + Recharts
- **Backend:** Firebase Cloud Functions (Express API)
- **Database:** Firestore
- **Auth:** Firebase Authentication (Google sign-in)
- **Local dev:** Firebase emulators (Functions + Firestore) with pre-seeded emulator data

---

## Features

- View traffic stats in a **table** + **line chart**
- **Pagination** (`limit` + `cursor`) with “Load more”
- **Sorting** (ascending / descending by date)
- **Date range filter** (client-side)
- CRUD (create/update/delete) for traffic entries (role-based in backend)

---

## Project Structure
