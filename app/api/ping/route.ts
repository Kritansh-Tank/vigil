import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";

// UptimeRobot pings this endpoint every 5 minutes to keep MongoDB Atlas M0 alive.
// HEAD → lightweight check (UptimeRobot default)
// GET  → full health check with DB ping + JSON status

async function pingDb(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

export async function GET() {
  const { ok, latencyMs } = await pingDb();
  return NextResponse.json(
    {
      status:    ok ? "healthy" : "degraded",
      service:   "VIGIL Safety Intelligence Platform",
      db:        ok ? "connected" : "unreachable",
      latencyMs,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}

// HEAD: same as GET but no body — UptimeRobot uses this by default
export async function HEAD() {
  const { ok } = await pingDb();
  return new Response(null, { status: ok ? 200 : 503 });
}
