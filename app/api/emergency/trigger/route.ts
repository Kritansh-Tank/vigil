import { NextRequest, NextResponse } from "next/server";
import { generateEmergencyResponse } from "@/lib/agents/emergencyResponse";
import { sendEmergencyAlert } from "@/lib/aws/ses";
import { uploadEmergencyReport } from "@/lib/aws/s3";
import { ZoneRiskScore } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { trigger_zone, all_zones } = await req.json();

    if (!trigger_zone) {
      return NextResponse.json({ error: "trigger_zone required" }, { status: 400 });
    }

    const report = await generateEmergencyResponse(
      trigger_zone as ZoneRiskScore,
      (all_zones || []) as ZoneRiskScore[]
    );

    // Tag the report with the trigger zone
    report.trigger_zone_id = trigger_zone.zone_id;

    // ── Archive to S3 (fire-and-forget, returns pre-signed URL) ──────────────
    const s3Url = await uploadEmergencyReport(report).catch((e) => {
      console.error("[Emergency] S3 archive failed silently:", e);
      return null;
    });
    report.s3_report_url = s3Url;

    // ── Send SES email alert (fire-and-forget) ────────────────────────────────
    sendEmergencyAlert({
      emergencyLevel:  report.emergency_level,
      zone:            trigger_zone.zone_id,
      riskScore:       trigger_zone.score,
      triggerFactors:  report.trigger_factors,
      immediateActions:report.immediate_actions,
      evacuationZones: report.evacuation_zones,
      safeAssemblyPoint: report.safe_assembly_point,
      dgfasliRequired: report.regulatory_report.dgfasli_notification_required,
      generatedAt:     report.generated_at,
    }).catch((e) => console.error("[Emergency] SES send failed silently:", e));

    return NextResponse.json({ report });
  } catch (e) {
    console.error("[Emergency API]", e);
    return NextResponse.json({ error: "Emergency response generation failed" }, { status: 500 });
  }
}
