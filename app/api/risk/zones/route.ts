import { NextResponse } from "next/server";
import { calculateAllZoneRisks } from "@/lib/agents/compoundRisk";

// 60-second cache — risk zones don't need sub-second freshness
// At 6000 TPM free tier this means LLM enrichment is called at most once/minute
const CACHE_TTL_MS = 60_000;

let lastCalculated: Date | null = null;
let cachedRisks: ReturnType<typeof calculateAllZoneRisks> extends Promise<infer T> ? T : never = [];

export async function GET() {
  try {
    const now = new Date();
    if (
      cachedRisks.length > 0 &&
      lastCalculated &&
      now.getTime() - lastCalculated.getTime() < CACHE_TTL_MS
    ) {
      return NextResponse.json({ zones: cachedRisks, cached: true });
    }

    const zones = await calculateAllZoneRisks();
    cachedRisks = zones;
    lastCalculated = now;

    return NextResponse.json({ zones, cached: false });
  } catch (e) {
    console.error("[RiskZones API]", e);
    // If we have stale cache, return it rather than 500
    if (cachedRisks.length > 0) {
      return NextResponse.json({ zones: cachedRisks, cached: true, stale: true });
    }
    return NextResponse.json({ error: "Risk calculation failed" }, { status: 500 });
  }
}
