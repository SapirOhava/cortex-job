import { useMemo, useState } from "react";
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

type Granularity = "daily" | "weekly" | "monthly";

function toNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function parseIsoDate(dateStr: string): Date | null {
  // expected YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  // create in UTC to avoid timezone shifting
  const dt = new Date(Date.UTC(y, mo - 1, d));
  // basic validation
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * ISO week key: YYYY-Www
 * Based on ISO-8601 week rules (week starts Monday, week 1 contains Jan 4).
 */
function isoWeekKey(dt: Date): string {
  // Clone date in UTC
  const d = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
  // ISO day of week (Mon=1..Sun=7)
  const day = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  // Move to Thursday of current week
  d.setUTCDate(d.getUTCDate() + (4 - day));
  const isoYear = d.getUTCFullYear();

  // Find first Thursday of ISO year
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay();
  const firstThu = new Date(jan4);
  firstThu.setUTCDate(jan4.getUTCDate() + (4 - jan4Day));

  const diffMs = d.getTime() - firstThu.getTime();
  const week = 1 + Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

  return `${isoYear}-W${pad2(week)}`;
}

function monthKey(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  return `${y}-${pad2(m)}`; // YYYY-MM
}

type ChartPoint = { label: string; visits: number };

function aggregate(items: TrafficItem[], granularity: Granularity): ChartPoint[] {
  const map = new Map<string, number>();

  for (const it of items) {
    const visits = toNumber(it.visits) ?? 0;
    const dt = parseIsoDate(it.date);
    if (!dt) continue;

    let key: string;
    if (granularity === "daily") key = it.date;
    else if (granularity === "monthly") key = monthKey(dt);
    else key = isoWeekKey(dt);

    map.set(key, (map.get(key) ?? 0) + visits);
  }

  // Sort keys chronologically
  const keys = Array.from(map.keys()).sort((a, b) => {
    // daily YYYY-MM-DD and monthly YYYY-MM sort lexicographically correctly
    if (granularity === "daily" || granularity === "monthly") return a.localeCompare(b);

    // weekly: YYYY-Www
    const [ay, aw] = a.split("-W");
    const [by, bw] = b.split("-W");
    const dy = Number(ay) - Number(by);
    if (dy !== 0) return dy;
    return Number(aw) - Number(bw);
  });

  return keys.map((k) => ({ label: k, visits: map.get(k) ?? 0 }));
}

function formatTooltipLabel(label: string, granularity: Granularity): string {
  if (granularity === "daily") return label;
  if (granularity === "monthly") return `Month: ${label}`;
  return `Week: ${label}`; // YYYY-Www
}

export function TrafficChart({ items }: Props) {
  const [granularity, setGranularity] = useState<Granularity>("daily");

  const data = useMemo(() => {
    return aggregate(items, granularity);
  }, [items, granularity]);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0 }}>Visits over time</h3>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            View: <b>{granularity}</b> • Points: <b>{data.length}</b>
          </div>
        </div>

        {/* Toggle */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 14 }}>
            Granularity{" "}
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as Granularity)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
        </div>
      </div>

      {data.length === 0 ? (
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.75 }}>No data to display.</div>
      ) : (
        <div style={{ height: 320, minHeight: 320, width: "100%", marginTop: 8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid />
              <XAxis dataKey="label" tickMargin={8} />
              <YAxis />
              <Tooltip
                labelFormatter={(label) => formatTooltipLabel(String(label), granularity)}
              />
              <Line type="monotone" dataKey="visits" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
        Daily = each date • Weekly = ISO week (YYYY-Www) • Monthly = YYYY-MM. Values are aggregated sums.
      </div>
    </div>
  );
}