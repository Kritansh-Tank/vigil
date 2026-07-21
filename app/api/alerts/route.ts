import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const alerts = await db
      .collection("alerts")
      .find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    return NextResponse.json({ alerts });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { alert_id, status } = await req.json();
    const db = await getDb();
    await db.collection("alerts").updateOne(
      { alert_id },
      { $set: { status, updated_at: new Date() } }
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}
