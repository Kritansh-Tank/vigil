import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";

type ShiftName = "DAY" | "EVENING" | "NIGHT";

interface ShiftConfig {
  name: ShiftName;
  label: string;
  start: number; // IST hour (0-23)
  end: number;
  nextStart: number;
}

const SHIFTS: ShiftConfig[] = [
  { name: "DAY", label: "Day Shift", start: 6, end: 14, nextStart: 14 },
  { name: "EVENING", label: "Evening Shift", start: 14, end: 22, nextStart: 22 },
  { name: "NIGHT", label: "Night Shift", start: 22, end: 6, nextStart: 6 },
];

function getCurrentISTHour(): number {
  const now = new Date();
  // IST = UTC + 5:30
  return (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;
}

function getCurrentShift(hour: number): ShiftConfig {
  if (hour >= 6 && hour < 14) return SHIFTS[0]; // DAY
  if (hour >= 14 && hour < 22) return SHIFTS[1]; // EVENING
  return SHIFTS[2];                                // NIGHT
}

function minutesToChangeover(hour: number, currentShift: ShiftConfig): number {
  const now = new Date();
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + 330; // IST minutes since midnight
  const istMinutes = currentMinutes % (24 * 60);
  const nextChangeoverMinutes = currentShift.nextStart * 60;

  let diff = nextChangeoverMinutes - istMinutes;
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

export async function GET() {
  try {
    const db = await getDb();
    const hour = getCurrentISTHour();
    const current = getCurrentShift(hour);
    const minsLeft = minutesToChangeover(hour, current);

    // Count workers by shift
    const shiftCounts = await db.collection("workers").aggregate([
      { $group: { _id: "$shift", count: { $sum: 1 } } },
    ]).toArray();

    const counts: Record<string, number> = {};
    for (const row of shiftCounts) counts[row._id] = row.count;

    // Workers in the current shift by zone
    const currentWorkers = await db
      .collection("workers")
      .find({ shift: current.name })
      .project({ name: 1, zone_id: 1, role: 1 })
      .toArray();

    const byZone: Record<string, number> = {};
    for (const w of currentWorkers) {
      byZone[w.zone_id] = (byZone[w.zone_id] || 0) + 1;
    }

    // Determine if we're in changeover window (±15 min of shift boundary)
    const isChangeover = minsLeft <= 15 || minsLeft >= 24 * 60 - 15;

    return NextResponse.json({
      current: {
        name: current.name,
        label: current.label,
        start: `${String(current.start).padStart(2, "0")}:00`,
        end: `${String(current.end).padStart(2, "0")}:00`,
        worker_count: counts[current.name] || 0,
        workers_by_zone: byZone,
        minutes_to_changeover: minsLeft,
        hours_to_changeover: Math.floor(minsLeft / 60),
        mins_remainder: minsLeft % 60,
        is_changeover_window: isChangeover,
      },
      all_shifts: SHIFTS.map((s) => ({
        name: s.name,
        label: s.label,
        worker_count: counts[s.name] || 0,
        active: s.name === current.name,
      })),
      ist_hour: hour,
    });
  } catch (e) {
    console.error("[Shifts API]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
