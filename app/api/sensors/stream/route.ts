import { NextResponse } from "next/server";
import { generateAndStoreTick } from "@/lib/simulation/sensorSimulator";

// Vercel hobby plan hard-caps SSE at 60 s.
// We use a simple poll-and-close pattern instead:
// the client calls this every 3 s, gets fresh readings, connection closes immediately.
export async function GET() {
  try {
    const readings = await generateAndStoreTick();
    return NextResponse.json({ type: "readings", payload: readings });
  } catch (e) {
    console.error("[SensorTick] error:", e);
    return NextResponse.json({ error: "tick failed" }, { status: 500 });
  }
}
