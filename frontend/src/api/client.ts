import { getAuth } from "firebase/auth";

/**
 * Your traffic entry shape as returned by the backend.
 * (Backend returns: { id, date, visits, ... })
 */
export type TrafficEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  visits: number;
};

/**
 * Base URL of your backend API.
 *
 * - In local dev (emulator): set VITE_API_BASE_URL to:
 *   http://127.0.0.1:5001/cortex-job-dashboard/us-central1/api
 *
 * - In production (after deploy): set to your deployed functions URL.
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:5001/cortex-job-dashboard/us-central1/api";

/**
 * Reads the currently logged-in Firebase user and returns a fresh ID token.
 *
 * Why this matters:
 * - Your backend (Cloud Function) verifies this token to know "who is calling".
 * - This is how you prevent anonymous users from calling your API.
 */
async function getIdTokenOrThrow(): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    // No logged-in user => we cannot call protected endpoints
    throw new Error("Not authenticated. Please log in first.");
  }

  // forceRefresh=true makes sure we don't use an expired token
  return user.getIdToken(true);
}

/**
 * A small wrapper around fetch() that:
 * - Adds Authorization: Bearer <token>
 * - Sends/receives JSON
 * - Throws nice errors when backend returns non-2xx
 */
async function fetchJson<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getIdTokenOrThrow();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  // If server returned an error status code, try to read JSON error message
  if (!res.ok) {
    let message = `Request failed (${res.status})`;

    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON
    }

    throw new Error(message);
  }

  // For endpoints that return no JSON, handle empty body safely
  const text = await res.text();
  if (!text) return undefined as T;

  return JSON.parse(text) as T;
}

/** ============================
 *  API functions (CRUD)
 *  ============================
 */

export async function getTraffic(): Promise<TrafficEntry[]> {
  return fetchJson<TrafficEntry[]>("/traffic", { method: "GET" });
}

export async function createTraffic(input: {
  date: string;
  visits: number;
}): Promise<{ id: string }> {
  return fetchJson<{ id: string }>("/traffic", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTraffic(
  id: string,
  updates: Partial<{ date: string; visits: number }>
): Promise<{ ok: true }> {
  return fetchJson<{ ok: true }>(`/traffic/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteTraffic(id: string): Promise<{ ok: true }> {
  return fetchJson<{ ok: true }>(`/traffic/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}