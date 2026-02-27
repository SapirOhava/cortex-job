import { useMemo, useState } from "react";
import type { TrafficEntry } from "../api/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type Mode = "daily" | "weekly" | "monthly";

type ChartPoint = {
  key: string;   // X axis label (date / week / month)
  visits: number;
};

function toIsoWeekKey(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const d = new Date(`${dateStr}T00:00:00Z`);

  // ISO week algorithm
  const dayNum = (d.getUTCDay() + 6) % 7; // Monday=0..Sunday=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // Thursday

  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);

  const week =
    1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));

  const year = d.getUTCFullYear();
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function toMonthKey(dateStr: string): string {
  // YYYY-MM-DD => YYYY-MM
  return dateStr.slice(0, 7);
}

function aggregate(entries: TrafficEntry[], mode: Mode): ChartPoint[] {
  if (mode === "daily") {
    // Ensure sorted by date and map directly
    return [...entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({ key: e.date, visits: e.visits }));
  }

  const map = new Map<string, number>();

  for (const e of entries) {
    const key = mode === "weekly" ? toIsoWeekKey(e.date) : toMonthKey(e.date);
    map.set(key, (map.get(key) ?? 0) + e.visits);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, visits]) => ({ key, visits }));
}

export default function TrafficChart({ entries }: { entries: TrafficEntry[] }) {
  const [mode, setMode] = useState<Mode>("daily");

  const data = useMemo(() => aggregate(entries, mode), [entries, mode]);

  return (
    <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Visits chart</h3>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => setMode("daily")}
            style={{ fontWeight: mode === "daily" ? "bold" : "normal" }}
            type="button"
          >
            Daily
          </button>
          <button
            onClick={() => setMode("weekly")}
            style={{ fontWeight: mode === "weekly" ? "bold" : "normal" }}
            type="button"
          >
            Weekly
          </button>
          <button
            onClick={() => setMode("monthly")}
            style={{ fontWeight: mode === "monthly" ? "bold" : "normal" }}
            type="button"
          >
            Monthly
          </button>
        </div>
      </div>

      <div style={{ height: 320, marginTop: 12 }}>
        {data.length === 0 ? (
          <div style={{ color: "#666" }}>No data to show.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="key" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="visits" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <small style={{ color: "#666" }}>
        Chart uses the same filtered dataset as the table.
      </small>
    </div>
  );
}