import { useEffect, useMemo, useState } from "react";
import {
  apiCreateTraffic,
  apiDeleteTraffic,
  apiGetTraffic,
  apiMe,
  apiUpdateTraffic,
  type MeResponse,
  type TrafficItem,
} from "../api/client";
import { TrafficChart } from "./TrafficChart";
import { TrafficTable } from "./TrafficTable";

type Order = "asc" | "desc";

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function Dashboard() {
  const [me, setMe] = useState<MeResponse | null>(null);

  const [rawItems, setRawItems] = useState<TrafficItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Controls
  const [order, setOrder] = useState<Order>("asc");
  const [limit, setLimit] = useState<number>(10);

  // Bonus filters: date range
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = me?.role ?? "viewer";

  async function loadFirstPage() {
    setError(null);
    setLoading(true);
    try {
      const [meRes, trafficRes] = await Promise.all([
        apiMe(),
        apiGetTraffic({ limit, order, cursor: null }),
      ]);

      setMe(meRes);
      setRawItems(trafficRes.items);
      setNextCursor(trafficRes.nextCursor);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor) return;
    setError(null);
    setLoadingMore(true);
    try {
      const res = await apiGetTraffic({ limit, order, cursor: nextCursor });
      setRawItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, limit]);

  // Apply bonus filters client-side (fast + simple for take-home)
  const filteredItems = useMemo(() => {
    let out = [...rawItems];

    if (fromDate && isIsoDate(fromDate)) {
      out = out.filter((x) => x.date >= fromDate);
    }
    if (toDate && isIsoDate(toDate)) {
      out = out.filter((x) => x.date <= toDate);
    }

    // Keep table sorted exactly as user chose
    out.sort((a, b) => (order === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));

    return out;
  }, [rawItems, fromDate, toDate, order]);

  async function handleCreate(input: { date: string; visits: number }) {
    setError(null);
    try {
      await apiCreateTraffic(input);
      await loadFirstPage();
    } catch (e: any) {
      setError(e?.message ?? "Create failed");
    }
  }

  async function handleUpdate(id: string, input: { visits: number }) {
    setError(null);
    try {
      await apiUpdateTraffic(id, input);
      setRawItems((prev) => prev.map((x) => (x.id === id ? { ...x, visits: input.visits } : x)));
    } catch (e: any) {
      setError(e?.message ?? "Update failed");
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await apiDeleteTraffic(id);
      setRawItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      setError(e?.message ?? "Delete failed");
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Cortex Traffic Dashboard</h2>
          <div style={{ fontSize: 14, opacity: 0.8 }}>
            User: <b>{me?.email ?? "…"}</b> • Role: <b>{role}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 14 }}>
            Order{" "}
            <select value={order} onChange={(e) => setOrder(e.target.value as Order)}>
              <option value="asc">asc (old → new)</option>
              <option value="desc">desc (new → old)</option>
            </select>
          </label>

          <label style={{ fontSize: 14 }}>
            Page size{" "}
            <select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </label>

          <button onClick={loadFirstPage} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {/* Bonus: date range filter */}
      <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 600 }}>Filters (bonus)</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <label style={{ fontSize: 14 }}>
            From{" "}
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label style={{ fontSize: 14 }}>
            To{" "}
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>

          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
          >
            Clear
          </button>
        </div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>
          Note: filtering is applied client-side (simple + fast for the take-home).
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <TrafficChart items={filteredItems} />
      </div>

      <div style={{ marginTop: 16 }}>
        <TrafficTable
          items={filteredItems}
          loading={loading}
          loadingMore={loadingMore}
          error={error}
          role={role}
          nextCursor={nextCursor}
          onRefresh={loadFirstPage}
          onLoadMore={loadMore}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}