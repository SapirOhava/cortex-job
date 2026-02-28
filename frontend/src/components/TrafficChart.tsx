import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { TrafficItem } from "../api/client";

type Props = {
  items: TrafficItem[];
};

function toNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function TrafficChart({ items }: Props) {
  const data = useMemo(() => {
    // chart should never crash on nulls
    return items
      .map((x) => ({
        date: x.date,
        visits: toNumber(x.visits) ?? 0,
      }))
      // Keep it sorted for nice chart visuals even if table order changes
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [items]);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Visits over time</h3>
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          Points: <b>{data.length}</b>
        </div>
      </div>

      <div style={{ height: 320, marginTop: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid />
            <XAxis dataKey="date" tickMargin={8} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="visits" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
        Note: chart is always shown in chronological order (asc), even if table is sorted differently.
      </div>
    </div>
  );
}