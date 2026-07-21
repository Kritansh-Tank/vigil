import Groq from "groq-sdk";
import { getDb } from "@/lib/db/mongodb";
import { getLatestReadings } from "@/lib/simulation/sensorSimulator";
import { PermitType, ZoneId, PermitValidationResult, SENSOR_THRESHOLDS, ZONE_NAMES } from "@/lib/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PERMIT_INTEL_PROMPT = `You are VIGIL's Permit Intelligence Agent for a coke oven battery at an Indian steel plant.

Evaluate the submitted work permit against current site conditions. Apply OISD-116 and Factory Act 1948 standards strictly.

Key rules:
- HOT_WORK: BLOCK if any zone in area has CH4 >= 20% LEL, or SO2 >= 3 ppm, or any gas in DANGER status. CONDITIONAL if CH4 10-20% LEL with strict controls.
- CONFINED_SPACE: BLOCK if O2 equivalent deficit (CO > 30 ppm or H2S > 5 ppm). CONDITIONAL if any WARNING sensor with continuous monitoring requirement.
- ELECTRICAL: BLOCK if CH4 >= 10% LEL (explosion risk). CONDITIONAL if any flammable gas in WARNING.
- COLD_WORK: Low risk but flag if multiple sensors WARNING simultaneously.
- Always cite the specific OISD section or regulation.
- If another permit of conflicting type is already active in this zone, flag as SIMOPS risk (OISD-116 Section 6.4).

Return ONLY valid JSON:
{
  "verdict": "APPROVED" | "BLOCKED" | "CONDITIONAL",
  "reason": "<clear explanation citing regulation>",
  "conditions_if_approved": ["<condition 1>", "<condition 2>"],
  "referenced_standard": "<OISD section or Factory Act section>",
  "risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}`;

export async function validatePermit(
  permitType: PermitType,
  zoneId: ZoneId,
  issuedTo: string
): Promise<PermitValidationResult> {
  const db = await getDb();
  const allReadings = await getLatestReadings();

  // Get readings for this zone and adjacent zones
  const zoneReadings = allReadings.filter((r) => r.zone_id === zoneId);

  // Get active permits in this zone
  const existingPermits = await db
    .collection("permits")
    .find({ zone_id: zoneId, status: "ACTIVE" })
    .toArray();

  const sensorSummary = zoneReadings
    .map((r) => `  ${r.sensor_type}: ${r.value} ${r.unit} [${r.status}]`)
    .join("\n");

  const userMessage = `Permit Request:
  Type: ${permitType}
  Zone: ${zoneId} — ${ZONE_NAMES[zoneId]}
  Issued to: ${issuedTo}

Current sensor readings in ${zoneId}:
${sensorSummary || "  No readings available"}

Existing active permits in this zone: ${existingPermits.length}
${existingPermits.map((p: any) => `  - ${p.type} (${p.permit_id})`).join("\n") || "  None"}

Evaluate this permit request.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: PERMIT_INTEL_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.05,
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      verdict: result.verdict || "CONDITIONAL",
      reason: result.reason || "Unable to complete assessment — manual review required.",
      conditions_if_approved: result.conditions_if_approved || [],
      referenced_standard: result.referenced_standard || "OISD-116",
      risk_level: result.risk_level || "MEDIUM",
    };
  } catch (e) {
    console.error("[PermitIntel] LLM error:", e);
    // Fallback: rule-based check
    const ch4 = zoneReadings.find((r) => r.sensor_type === "CH4");
    if (permitType === "HOT_WORK" && ch4 && ch4.value >= 20) {
      return {
        verdict: "BLOCKED",
        reason: `CH₄ reading of ${ch4.value}% LEL in ${zoneId} exceeds the 20% LEL threshold for hot work. OISD-116 Section 5.3 prohibits issuance.`,
        conditions_if_approved: [],
        referenced_standard: "OISD-116 Section 5.3",
        risk_level: "CRITICAL",
      };
    }
    return {
      verdict: "CONDITIONAL",
      reason: "AI assessment unavailable. Manual review required by Safety Officer before permit activation.",
      conditions_if_approved: ["Gas test required immediately before work commencement", "Continuous monitoring with portable detector"],
      referenced_standard: "OISD-116 Section 5.1",
      risk_level: "MEDIUM",
    };
  }
}
