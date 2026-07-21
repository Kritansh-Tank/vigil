import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const db = await getDb();
    const permits = await db
      .collection("permits")
      .find({})
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();
    return NextResponse.json({ permits });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch permits" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await getDb();

    const permit = {
      permit_id: `PTW-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      ...body,
      status: "PENDING_AI",
      created_at: new Date(),
      valid_from: new Date(body.valid_from),
      valid_until: new Date(body.valid_until),
    };

    await db.collection("permits").insertOne(permit);
    return NextResponse.json({ success: true, permit_id: permit.permit_id });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create permit" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { permit_id, status } = await req.json();
    const db = await getDb();
    await db.collection("permits").updateOne(
      { permit_id },
      { $set: { status, updated_at: new Date() } }
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update permit" }, { status: 500 });
  }
}
