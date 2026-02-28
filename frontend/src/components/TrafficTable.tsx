import React, { useMemo, useState } from "react";
import type { TrafficItem } from "../api/client";

type Props = {
  items: TrafficItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  role: "editor" | "viewer";
  nextCursor: string | null;
  onRefresh: () => void;
  onLoadMore: () => void;

  // CRUD actions:
  onCreate: (input: { date: string; visits: number }) => Promise<void>;
  onUpdate: (id: string, input: { visits: number }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function TrafficTable({
  items,
  loading,
  loadingMore,
  error,
  role,
  nextCursor,
  onRefresh,
  onLoadMore,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const isEditor = role === "editor";

  const [newDate, setNewDate] = useState<string>("");
  const [newVisits, setNewVisits] = useState<string>("0");

  const [editId, setEditId] = useState<string | null>(null);
  const [editVisits, setEditVisits] = useState<string>("");

  const totalVisits = useMemo(() => {
    return items.reduce((sum, it) => sum + (typeof it.visits === "number" ? it.visits : 0), 0);
  }, [items]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const visitsNum = Number(newVisits);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      alert("Date must be YYYY-MM-DD");
      return;
    }
    if (!Number.isFinite(visitsNum) || visitsNum < 0) {
      alert("Visits must be a non-negative number");
      return;
    }
    await onCreate({ date: newDate, visits: visitsNum });
  }

  function startEdit(it: TrafficItem) {
    setEditId(it.id);
    setEditVisits(String(it.visits ?? 0));
  }

  async function saveEdit(id: string) {
    const v = Number(editVisits);
    if (!Number.isFinite(v) || v < 0) {
      alert("Visits must be a non-negative number");
      return;
    }
    await onUpdate(id, { visits: v });
    setEditId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete ${id}?`)) return;
    await onDelete(id);
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0 }}>Traffic table</h3>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            Rows: <b>{items.length}</b> • Total visits: <b>{totalVisits}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={onRefresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid #f99", borderRadius: 10 }}>
          <b>Error:</b> {error}
        </div>
      )}

      {/* Create */}
      <div style={{ marginTop: 12, padding: 10, border: "1px solid #eee", borderRadius: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 600 }}>Add / Upsert by date</div>
          {!isEditor && <div style={{ fontSize: 13, opacity: 0.7 }}>Viewer mode: write disabled</div>}
        </div>

        <form onSubmit={handleCreate} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <label style={{ fontSize: 14 }}>
            Date{" "}
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              disabled={!isEditor}
              required
            />
          </label>

          <label style={{ fontSize: 14 }}>
            Visits{" "}
            <input
              type="number"
              min={0}
              step={1}
              value={newVisits}
              onChange={(e) => setNewVisits(e.target.value)}
              disabled={!isEditor}
            />
          </label>

          <button type="submit" disabled={!isEditor}>
            Save
          </button>
        </form>
      </div>

      {/* Table */}
      <div style={{ marginTop: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Date</th>
              <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #eee" }}>Visits</th>
              <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #eee" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ padding: 12 }}>
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 12 }}>
                  No results.
                </td>
              </tr>
            ) : (
              items.map((it) => {
                const isEditing = editId === it.id;

                return (
                  <tr key={it.id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>{it.date}</td>

                    <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3", textAlign: "right" }}>
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={editVisits}
                          onChange={(e) => setEditVisits(e.target.value)}
                          style={{ width: 110 }}
                          disabled={!isEditor}
                        />
                      ) : (
                        it.visits ?? "—"
                      )}
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3", textAlign: "right" }}>
                      {!isEditor ? (
                        <span style={{ fontSize: 13, opacity: 0.7 }}>—</span>
                      ) : isEditing ? (
                        <>
                          <button onClick={() => saveEdit(it.id)}>Save</button>{" "}
                          <button onClick={() => setEditId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(it)}>Edit</button>{" "}
                          <button onClick={() => handleDelete(it.id)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
        <button onClick={onLoadMore} disabled={!nextCursor || loadingMore || loading}>
          {nextCursor ? (loadingMore ? "Loading…" : "Load more") : "No more results"}
        </button>
      </div>
    </div>
  );
}