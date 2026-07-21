import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";

// Returns last 10 risk score snapshots per zone for sparkline charts
export async function GET() {
  try {
    const db = await getDb();

    const zones = ["ZONE_A", "ZONE_B", "ZONE_C", "ZONE_D", "ZONE_E", "ZONE_F"];
    const trends: Record<string, number[]> = {};

    await Promise.all(
      zones.map(async (zone) => {
        const rows = await db
          .collection("risk_scores")
          .find({ zone_id: zone })
          .sort({ timestamp: -1 })
          .limit(10)
          .toArray();

        // Reverse so oldest→newest (left→right on chart)
        trends[zone] = rows.map((r) => Number(r.score) || 0).reverse();
      })
    );

    return NextResponse.json({ trends });
  } catch (e) {
    console.error("[Risk History]", e);
    return NextResponse.json({ trends: {} }, { status: 500 });
  }
}
