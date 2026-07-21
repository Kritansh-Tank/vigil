import Groq from "groq-sdk";
import { getDb } from "@/lib/db/mongodb";
import { ZoneRiskScore, EmergencyReport, ZoneId } from "@/lib/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Use highest free-tier TPM model
const MODEL = "llama-3.1-8b-instant";

const EMERGENCY_PROMPT = `You are VIGIL's Emergency Response Orchestrator for an Indian coke oven battery.

Generate a structured emergency response plan based on the confirmed compound risk trigger. 
Follow OISD-116 Section 7.1 emergency classification and Factory Act 1948 reporting requirements.

Return ONLY valid JSON:
{
  "emergency_level": "HIGH" | "CRITICAL",
  "trigger_factors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "evacuation_zones": ["ZONE_A", ...],
  "safe_assembly_point": "<location>",
  "immediate_actions": [
    "<action 1>",
    "<action 2>",
    "<action 3>",
    "<action 4>",
    "<action 5>"
  ],
  "regulatory_report": {
    "format": "OISD-116 Appendix A / Form 18 (Factories Act 1948)",
    "preliminary_narrative": "<2-3 sentence incident description>",
    "dgfasli_notification_required": true
  }
}`;

export async function generateEmergencyResponse(
  triggerZone: ZoneRiskScore,
  allZones: ZoneRiskScore[]
): Promise<EmergencyReport> {
  const db = await getDb();

  // Get workers in high-risk zones
  const highRiskZones = allZones.filter((z) => z.score >= 70);
  const workerData = await db
    .collection("workers")
    .find({ zone_id: { $in: highRiskZones.map((z) => z.zone_id) } })
    .toArray();

  const userMessage = `Emergency Trigger:
Zone: ${triggerZone.zone_id} — ${triggerZone.zone_name}
Risk Score: ${triggerZone.score}/100 (${triggerZone.severity})
Compound Factors: ${triggerZone.factors.join("; ")}
Workers in zone: ${triggerZone.worker_count}
Active permits: ${triggerZone.active_permits}

Adjacent high-risk zones:
${highRiskZones
  .filter((z) => z.zone_id !== triggerZone.zone_id)
  .map((z) => `  ${z.zone_id}: score ${z.score} — ${z.factors[0] || ""}`)
  .join("\n") || "  None above threshold"}

Total workers in high-risk zones: ${workerData.length}

Generate emergency response plan.`;

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: EMERGENCY_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const report: EmergencyReport = {
      emergency_level: result.emergency_level || "CRITICAL",
      trigger_factors: result.trigger_factors || triggerZone.factors,
      evacuation_zones: result.evacuation_zones || [triggerZone.zone_id as ZoneId],
      safe_assembly_point: result.safe_assembly_point || "Gate 3 — Emergency Muster Station",
      immediate_actions: result.immediate_actions || [
        "Activate plant-wide gas alarm immediately",
        "Evacuate all personnel from affected zones",
        "Notify Safety Officer and Plant Emergency Response Team",
        "Isolate gas supply valves in affected zones",
        "Alert CISF Fire Station and medical team",
      ],
      regulatory_report: {
        format: result.regulatory_report?.format || "OISD-116 Appendix A / Form 18 (Factories Act 1948)",
        preliminary_narrative:
          result.regulatory_report?.preliminary_narrative ||
          `At ${new Date().toLocaleTimeString("en-IN")}, compound risk sensor analysis detected a ${triggerZone.severity} condition in ${triggerZone.zone_id} with a risk score of ${triggerZone.score}/100. Primary factors: ${triggerZone.factors.slice(0, 3).join("; ")}.`,
        dgfasli_notification_required: true,
      },
      generated_at: new Date(),
    };

    // Store emergency alert
    await db.collection("alerts").insertOne({
      alert_id: `EMRG-${Date.now()}`,
      timestamp: new Date(),
      severity: "CRITICAL",
      zone_id: triggerZone.zone_id,
      risk_score: triggerZone.score,
      compound_factors: triggerZone.factors,
      llm_reasoning: triggerZone.llm_reasoning,
      status: "ACTIVE",
      emergency_report: report,
    });

    return report;
  } catch (e) {
    console.error("[EmergencyAgent] LLM error:", e);
    return {
      emergency_level: "CRITICAL",
      trigger_factors: triggerZone.factors,
      evacuation_zones: [triggerZone.zone_id as ZoneId],
      safe_assembly_point: "Gate 3 — Emergency Muster Station",
      immediate_actions: [
        "Activate plant-wide gas alarm immediately",
        "Evacuate all personnel from affected zones",
        "Notify Safety Officer on duty",
        "Isolate gas supply to affected zones",
        "Alert emergency services and CISF",
      ],
      regulatory_report: {
        format: "OISD-116 Appendix A",
        preliminary_narrative: `Critical compound risk detected in ${triggerZone.zone_id}. Score: ${triggerZone.score}/100. Immediate response initiated.`,
        dgfasli_notification_required: true,
      },
      generated_at: new Date(),
    };
  }
}
