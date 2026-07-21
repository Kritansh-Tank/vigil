import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const workers = await db
      .collection("workers")
      .find({}, { projection: { worker_id: 1, name: 1, zone_id: 1, role: 1 } })
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({ workers });
  } catch (e) {
    console.error("[Workers API]", e);
    return NextResponse.json({ workers: [] }, { status: 500 });
  }
}
