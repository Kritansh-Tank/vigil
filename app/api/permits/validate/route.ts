import { NextRequest, NextResponse } from "next/server";
import { validatePermit } from "@/lib/agents/permitIntel";
import { getDb } from "@/lib/db/mongodb";
import { PermitType, ZoneId } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { permit_id, type, zone_id, issued_to } = await req.json();

    if (!type || !zone_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await validatePermit(
      type as PermitType,
      zone_id as ZoneId,
      issued_to || "Unknown"
    );

    // Update permit record with AI verdict
    if (permit_id) {
      const db = await getDb();
      await db.collection("permits").updateOne(
        { permit_id },
        {
          $set: {
            ai_verdict: result.verdict,
            ai_reason: result.reason,
            ai_referenced_standard: result.referenced_standard,
            conditions: result.conditions_if_approved,
            status: result.verdict === "APPROVED" ? "ACTIVE"
                  : result.verdict === "BLOCKED"  ? "BLOCKED"
                  : "PENDING_AI",
            updated_at: new Date(),
          },
        }
      );
    }

    return NextResponse.json({ result });
  } catch (e) {
    console.error("[Permit Validate API]", e);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
