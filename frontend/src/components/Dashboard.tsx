import { useMemo, useState } from "react";
import { useTraffic } from "../hooks/useTraffic";
import type { TrafficEntry } from "../api/client";
import TrafficChart from "./TrafficChart";

type SortKey = "date" | "visits";
type SortDir = "asc" | "desc";

function compare(a: TrafficEntry, b: TrafficEntry, key: SortKey, dir: SortDir) {
  const mul = dir === "asc" ? 1 : -1;

  if (key === "date") {
    // date is YYYY-MM-DD => string comparison works
    return a.date.localeCompare(b.date) * mul;
  }
  return (a.visits - b.visits) * mul;
}

export default function Dashboard() {
  const { items, loading, error, refresh, add, update, remove } = useTraffic();

  // Filters
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Create form
  const [newDate, setNewDate] = useState("");
  const [newVisits, setNewVisits] = useState<number>(0);

  // Edit (simple: one row at a time)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editVisits, setEditVisits] = useState<number>(0);

  const filteredSorted = useMemo(() => {
    let data = items;

    if (from) data = data.filter((x) => x.date >= from);
    if (to) data = data.filter((x) => x.date <= to);

    data = [...data].sort((a, b) => compare(a, b, sortKey, sortDir));
    return data;
  }, [items, from, to, sortKey, sortDir]);

  function toggleSort(nextKey: SortKey) {
    if (sortKey !== nextKey) {
      setSortKey(nextKey);
      setSortDir("asc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate) return;

    await add({ date: newDate, visits: Number(newVisits) });
    setNewDate("");
    setNewVisits(0);
  }

  function startEdit(row: TrafficEntry) {
    setEditingId(row.id);
    setEditDate(row.date);
    setEditVisits(row.visits);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDate("");
    setEditVisits(0);
  }

  async function saveEdit() {
    if (!editingId) return;
    await update(editingId, { date: editDate, visits: Number(editVisits) });
    cancelEdit();
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Traffic Dashboard</h2>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={refresh} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label>
            From:{" "}
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            To:{" "}
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button onClick={() => { setFrom(""); setTo(""); }}>Clear</button>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: 12, background: "#ffe5e5", borderRadius: 8 }}>
          <b>Error:</b> {error}
        </div>
      )}

        <TrafficChart entries={filteredSorted} />

      {/* Create */}
      <form onSubmit={onCreate} style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>Add entry</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            Date:{" "}
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
            />
          </label>

          <label>
            Visits:{" "}
            <input
              type="number"
              min={0}
              value={newVisits}
              onChange={(e) => setNewVisits(Number(e.target.value))}
              required
            />
          </label>

          <button type="submit" disabled={loading}>
            Add
          </button>
        </div>
        <small style={{ display: "block", marginTop: 8, color: "#666" }}>
          Note: if your backend currently uses <code>.add()</code>, adding a date that already exists may create duplicates.
          (We can switch backend POST to upsert by date if you want.)
        </small>
      </form>

      {/* Table */}
      <div style={{ marginTop: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8, cursor: "pointer" }}
                onClick={() => toggleSort("date")}
              >
                Date {sortKey === "date" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th
                style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8, cursor: "pointer" }}
                onClick={() => toggleSort("visits")}
              >
                Visits {sortKey === "visits" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredSorted.map((row) => {
              const isEditing = editingId === row.id;

              return (
                <tr key={row.id}>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                    {isEditing ? (
                      <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                    ) : (
                      row.date
                    )}
                  </td>

                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        value={editVisits}
                        onChange={(e) => setEditVisits(Number(e.target.value))}
                      />
                    ) : (
                      row.visits
                    )}
                  </td>

                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                    {!isEditing ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => startEdit(row)} disabled={loading}>Edit</button>
                        <button onClick={() => remove(row.id)} disabled={loading}>Delete</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={saveEdit} disabled={loading}>Save</button>
                        <button onClick={cancelEdit} disabled={loading}>Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {!loading && filteredSorted.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 12, color: "#666" }}>
                  No results. Try clearing filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, color: "#666" }}>
        Showing <b>{filteredSorted.length}</b> of <b>{items.length}</b> entries
      </div>
    </div>
  );
}