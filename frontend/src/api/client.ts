// src/api/client.ts
import { getAuth } from "firebase/auth";

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

// Remove trailing slash if someone adds it in env
const BASE_URL = API_BASE_URL.replace(/\/+$/, "");

/**
 * -------------------------
 * Types
 * -------------------------
 */

export type TrafficItem = {
  id: string;
  date: string; // YYYY-MM-DD
  visits: number | null;
  createdAt: any | null;
  updatedAt: any | null;
};

export type TrafficResponse = {
  items: TrafficItem[];
  nextCursor: string | null;
};

export type MeResponse = {
  uid: string;
  email: string | null;
  role: "editor" | "viewer";
};

/**
 * -------------------------
 * Helpers
 * -------------------------
 */

async function getIdToken(): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not authenticated");
  }

  // Automatically refreshes if expired
  return await user.getIdToken();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getIdToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;

    try {
      const data = await res.json();
      if (data?.error) {
        message = `${message}: ${data.error}`;
      }
    } catch {
      // ignore JSON parse errors
    }

    throw new Error(message);
  }

  // Handle empty response (204)
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return (await res.json()) as T;
}

/**
 * -------------------------
 * API Calls
 * -------------------------
 */

export async function apiMe(): Promise<MeResponse> {
  return request<MeResponse>("/me", {
    method: "GET",
  });
}

export async function apiGetTraffic(params: {
  limit?: number;
  cursor?: string | null;
  order?: "asc" | "desc";
}): Promise<TrafficResponse> {
  const qs = new URLSearchParams();

  qs.set("limit", String(params.limit ?? 10));
  qs.set("order", params.order ?? "asc");

  if (params.cursor) {
    qs.set("cursor", params.cursor);
  }

  return request<TrafficResponse>(`/traffic?${qs.toString()}`, {
    method: "GET",
  });
}

export async function apiCreateTraffic(input: {
  date: string;
  visits: number;
}): Promise<{ id: string }> {
  return request<{ id: string }>("/traffic", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function apiUpdateTraffic(
  id: string,
  input: { visits: number }
): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/traffic/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function apiDeleteTraffic(
  id: string
): Promise<{ ok: true }> {
  return request<{ ok: true }>(
    `/traffic/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}