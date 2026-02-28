# Cortex Job Dashboard

**Fullstack Developer Home Task -- Interactive Dashboard with Firebase**

📄 **Assignment PDF:**\
[View Assignment](docs/Fullstack%20home%20task.pdf)

------------------------------------------------------------------------

# Overview

This project is a fullstack web application built with:

-   React (Vite + TypeScript)
-   Firebase Firestore
-   Firebase Cloud Functions (Express API)
-   Firebase Authentication (Google Sign-In)
-   Recharts (Open-source chart library)

The application displays and manages daily traffic data (date → visits)
in both a table and an interactive chart, following the assignment
requirements.

The project is structured with:

-   Backend API layer (no direct DB access from frontend)
-   Authentication middleware
-   Role-based access control
-   Environment configuration
-   Modular and readable code

------------------------------------------------------------------------

# How to Run the Project Locally

## Requirements

-   Node.js (v18+ recommended)
-   Firebase CLI

Install Firebase CLI:

``` bash
npm install -g firebase-tools
```

Login:

``` bash
firebase login
```

Select project:

``` bash
firebase use cortex-job-dashboard
```

------------------------------------------------------------------------

## Step 1 --- Install Backend Dependencies

``` bash
cd functions
npm install
npm run build
```

⚠ Important:\
The backend runs from `lib/index.js` (compiled output), so
`npm run build` is required after any TypeScript changes.

------------------------------------------------------------------------

## Step 2 --- Install Frontend Dependencies

``` bash
cd ../frontend
npm install
```

------------------------------------------------------------------------

## Step 3 --- Configure Environment Variables

Create:

frontend/.env.local

Add:

    VITE_FIREBASE_API_KEY=...
    VITE_FIREBASE_AUTH_DOMAIN=cortex-job-dashboard.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=cortex-job-dashboard
    VITE_FIREBASE_APP_ID=...
    VITE_FIREBASE_MEASUREMENT_ID=...

    VITE_API_BASE_URL=http://127.0.0.1:5001/cortex-job-dashboard/us-central1/api

------------------------------------------------------------------------

## Step 4 --- Start Firebase Emulators

From project root:

``` bash
firebase emulators:start --only functions,firestore --import ./emulator-data --export-on-exit
```

This starts:

-   Functions Emulator → http://127.0.0.1:5001\
-   Firestore Emulator → http://127.0.0.1:8080\
-   Emulator UI → http://127.0.0.1:4000

------------------------------------------------------------------------

## Step 5 --- Start Frontend

In a second terminal:

``` bash
cd frontend
npm run dev
```

Open the local URL shown in the terminal.

Login with Google and the dashboard will load.

------------------------------------------------------------------------

# Assignment Requirements → Implementation

## Frontend (React)

-   Responsive dashboard layout
-   Table displaying traffic entries
-   Line chart using Recharts
-   Sorting by date (asc/desc)
-   Date range filtering
-   Daily / Weekly / Monthly aggregation toggle
-   CRUD form (add, edit, delete)

------------------------------------------------------------------------

## Data Structure (Firestore)

Collection:

trafficStats

Document structure:

``` json
{
  "date": "YYYY-MM-DD",
  "visits": number
}
```

-   Document ID = date
-   Full dataset seeded (March--April 2025)
-   Emulator import/export supported

------------------------------------------------------------------------

## Backend (Cloud Functions)

Express API endpoints:

  Method   Endpoint       Description
  -------- -------------- ----------------------------
  GET      /health        Health check
  GET      /traffic       Fetch traffic entries
  POST     /traffic       Add new entry
  PUT      /traffic/:id   Update entry
  DELETE   /traffic/:id   Remove entry
  GET      /me            Return current user + role

Frontend does NOT access Firestore directly.

------------------------------------------------------------------------

## Authentication

-   Firebase Authentication (Google Sign-In)
-   Only logged-in users can access dashboard
-   Backend verifies token using:

``` ts
admin.auth().verifyIdToken()
```

Authorization header:

    Authorization: Bearer <ID_TOKEN>

------------------------------------------------------------------------

## Pagination (Bonus)

Cursor-based pagination:

``` ts
.orderBy("date", order)
.limit(limit)
.startAfter(cursor)
```

Example:

    GET /traffic?limit=10
    GET /traffic?limit=10&cursor=2025-03-10

------------------------------------------------------------------------

# Build for Production

Frontend:

``` bash
cd frontend
npm run build
```

Backend:

``` bash
cd functions
npm run build
```

------------------------------------------------------------------------

# Deployment

Deploy both hosting and functions:

``` bash
firebase deploy --only functions,hosting
```

(Add deployed link here)

------------------------------------------------------------------------

# Summary

This project demonstrates:

-   Secure frontend/backend integration
-   Firebase Authentication + token verification
-   Firestore querying with pagination
-   Data aggregation for chart views
-   Clean, modular TypeScript architecture
-   Production-oriented project structure
