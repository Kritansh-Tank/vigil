import Groq from "groq-sdk";
import { getDb } from "@/lib/db/mongodb";
import { getLatestReadings } from "@/lib/simulation/sensorSimulator";
import { generateEmergencyResponse } from "@/lib/agents/emergencyResponse";
import { sendEmergencyAlert } from "@/lib/aws/ses";
import { uploadEmergencyReport } from "@/lib/aws/s3";
import {
  ZoneId,
  ZoneRiskScore,
  RiskSeverity,
  ZONE_NAMES,
} from "@/lib/types";
import { getRiskSeverity } from "@/lib/utils";

// ─── Auto-emergency cooldown (5 min per zone) ─────────────────────────────────
const EMERGENCY_COOLDOWN_MS = 5 * 60 * 1000;
const lastEmergencyTriggered: Record<string, number> = {};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.1-8b-instant";

const ZONES: ZoneId[] = ["ZONE_A", "ZONE_B", "ZONE_C", "ZONE_D", "ZONE_E", "ZONE_F"];

// ─── Ultra-compact LLM prompt (~120 tokens) ───────────────────────────────────
const LLM_PROMPT = `You are a coke oven safety AI. Evaluate compound risk for the given zone.
Rules: CH4≥20%+hot_work=CRITICAL; CH4≥10%+confined_space=HIGH; multiple gases elevated=compound risk.
Return ONLY JSON: {"score":0-100,"severity":"SAFE|LOW|MEDIUM|HIGH|CRITICAL","factors":["f1","f2"],"recommendation":"one sentence","reasoning":"one sentence"}`;

// ─── Rule-based scoring (zero tokens, always runs) ────────────────────────────
function ruleBasedScore(
  sensors: Record<string, number>,
  activePermits: number,
  permitTypes: string[],
  shift: string,
  shiftChangeover: boolean
): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  const ch4  = sensors.CH4  ?? 0;
  const co   = sensors.CO   ?? 0;
  const h2s  = sensors.H2S  ?? 0;
  const so2  = sensors.SO2  ?? 0;
  const temp = sensors.TEMP ?? 0;

  // Gas thresholds
  if (ch4  >= 25) { score += 40; factors.push(`CH₄ ${ch4.toFixed(1)}% LEL — DANGER`); }
  else if (ch4 >= 10) { score += 18; factors.push(`CH₄ ${ch4.toFixed(1)}% LEL — WARNING`); }

  if (co   >= 50) { score += 25; factors.push(`CO ${co.toFixed(0)} ppm — DANGER`); }
  else if (co  >= 25) { score += 10; factors.push(`CO ${co.toFixed(0)} ppm — WARNING`); }

  if (h2s  >= 10) { score += 25; factors.push(`H₂S ${h2s.toFixed(1)} ppm — DANGER`); }
  else if (h2s >=  5) { score += 10; factors.push(`H₂S ${h2s.toFixed(1)} ppm — WARNING`); }

  if (so2  >=  5) { score += 15; factors.push(`SO₂ ${so2.toFixed(1)} ppm — DANGER`); }
  else if (so2 >=  2) { score += 6;  factors.push(`SO₂ ${so2.toFixed(1)} ppm — WARNING`); }

  if (temp >= 85) { score += 15; factors.push(`Temp ${temp.toFixed(0)}°C — DANGER`); }
  else if (temp >= 65) { score += 6; factors.push(`Temp ${temp.toFixed(0)}°C — WARNING`); }

  // Compound rules
  if (activePermits > 0) {
    if (ch4 >= 20 && permitTypes.some((p) => p === "HOT_WORK")) {
      score += 30; factors.push("HOT_WORK permit + CH₄ ≥ 20% LEL (OISD-116 §5.3)");
    } else if (ch4 >= 10 && permitTypes.some((p) => p === "CONFINED_SPACE")) {
      score += 20; factors.push("CONFINED_SPACE permit + elevated CH₄");
    } else if (score > 20) {
      score += 10; factors.push(`${activePermits} active permit(s) during elevated readings`);
    }
  }

  if (shift === "NIGHT" && score > 10) { score += 5; factors.push("Night shift — reduced response capacity"); }
  if (shiftChangeover && score > 10)   { score += 8; factors.push("Shift changeover window"); }

  return { score: Math.min(100, Math.round(score)), factors };
}

interface ZoneInput {
  zone_id: ZoneId;
  sensors: Record<string, number>;
  active_permits: number;
  permit_types: string[];
  worker_count: number;
  shift: string;
  shift_changeover: boolean;
  rule_score: number;
  rule_factors: string[];
}

async function buildInputs(allReadings: any[]): Promise<ZoneInput[]> {
  const db = await getDb();
  const hourIST = (new Date().getUTCHours() + 5.5) % 24;
  const shift = hourIST >= 6 && hourIST < 14 ? "DAY" : hourIST >= 14 && hourIST < 22 ? "EVENING" : "NIGHT";
  const shiftChangeover = [6, 14, 22].some((h) => Math.abs(hourIST - h) < 0.5);

  const inputs: ZoneInput[] = [];
  for (const zone of ZONES) {
    const zoneReadings = allReadings.filter((r) => r.zone_id === zone);
    const sensors: Record<string, number> = {};
    for (const r of zoneReadings) sensors[r.sensor_type] = r.value;

    const permits = await db.collection("permits").find({ zone_id: zone, status: "ACTIVE" }).toArray();
    const workers = await db.collection("workers").find({ zone_id: zone }).toArray();

    const { score, factors } = ruleBasedScore(
      sensors, permits.length, permits.map((p: any) => p.type), shift, shiftChangeover
    );

    inputs.push({
      zone_id: zone, sensors,
      active_permits: permits.length,
      permit_types: permits.map((p: any) => p.type),
      worker_count: workers.length,
      shift, shift_changeover: shiftChangeover,
      rule_score: score, rule_factors: factors,
    });
  }
  return inputs;
}

// LLM returns "reasoning" — separate from ZoneRiskScore's "llm_reasoning"
interface LLMEnrichedResult {
  score?: number;
  severity?: string;
  factors?: string[];
  recommendation?: string;
  reasoning?: string;
}

// LLM enrichment — only for a SINGLE elevated zone, compact prompt
async function enrichWithLLM(input: ZoneInput): Promise<LLMEnrichedResult> {
  const userMsg =
    `Zone ${input.zone_id} | Permits: ${input.permit_types.join(",") || "none"} | Shift: ${input.shift} | Changeover: ${input.shift_changeover}
Sensors: ${Object.entries(input.sensors).map(([k, v]) => `${k}=${v}`).join(" ")}
Rule score: ${input.rule_score}. Refine the compound risk assessment.`;

  const resp = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: LLM_PROMPT },
      { role: "user",   content: userMsg },
    ],
    temperature: 0.1,
    max_tokens: 220,
    response_format: { type: "json_object" },
  });

  return JSON.parse(resp.choices[0].message.content || "{}");
}

export async function calculateAllZoneRisks(): Promise<ZoneRiskScore[]> {
  const db = await getDb();
  const allReadings = await getLatestReadings();
  const inputs = await buildInputs(allReadings);

  const results: ZoneRiskScore[] = [];

  for (const input of inputs) {
    // Default: use rule-based score
    let score    = input.rule_score;
    let factors  = input.rule_factors;
    let recommendation = score > 75
      ? "Suspend all non-essential operations and investigate immediately."
      : score > 50
      ? "Increase monitoring frequency and alert supervisor."
      : "Continue standard monitoring protocols.";
    let llm_reasoning = "Rule-based assessment.";

    // LLM enrichment ONLY if score > 40 (elevated zone worth LLM's attention)
    // This keeps token use low — at most 1-2 LLM calls per refresh
    if (input.rule_score > 40) {
      try {
        const enriched = await enrichWithLLM(input);
        if (enriched.score !== undefined) {
          // Blend: take the higher of rule vs LLM to avoid LLM underestimating
          score        = Math.max(score, Number(enriched.score));
          factors      = (enriched.factors as string[]) || factors;
          recommendation = (enriched.recommendation as string) || recommendation;
          llm_reasoning  = (enriched.reasoning as string) || llm_reasoning;
        }
      } catch (e: any) {
        // Rate limited — keep rule-based result, log quietly
        console.warn(`[CompoundRisk] LLM skipped for ${input.zone_id}: ${e?.message?.slice(0, 60)}`);
      }
    }

    const severity = getRiskSeverity(score);
    results.push({
      zone_id: input.zone_id,
      zone_name: ZONE_NAMES[input.zone_id],
      score, severity, factors, recommendation,
      llm_reasoning,
      timestamp: new Date(),
      worker_count: input.worker_count,
      active_permits: input.active_permits,
    });
  }

  // ── Store alerts for zones with score > 75 ──────────────────────────────────
  const highRisk = results.filter((r) => r.score > 75);
  if (highRisk.length > 0) {
    await db.collection("alerts").insertMany(
      highRisk.map((r) => ({
        alert_id:         `ALT-${Date.now()}-${r.zone_id}`,
        timestamp:        new Date(),
        severity:         r.severity,
        zone_id:          r.zone_id,
        risk_score:       r.score,
        compound_factors: r.factors,
        llm_reasoning:    r.llm_reasoning,
        status:           "ACTIVE",
      }))
    );
  }

  // ── Auto-trigger emergency for zones with score > 85 ─────────────────────────
  const criticalZones = results.filter((r) => r.score > 85);
  for (const zone of criticalZones) {
    const lastTime = lastEmergencyTriggered[zone.zone_id] ?? 0;
    const now      = Date.now();
    if (now - lastTime < EMERGENCY_COOLDOWN_MS) continue; // still in cooldown

    lastEmergencyTriggered[zone.zone_id] = now;
    console.log(`[AutoEmergency] Zone ${zone.zone_id} score=${zone.score} — triggering emergency response`);

    // Fire-and-forget — don't block the risk zone response
    (async () => {
      try {
        const report = await generateEmergencyResponse(zone, results);
        report.trigger_zone_id = zone.zone_id;

        // Archive to S3 + email alert in parallel
        await Promise.allSettled([
          uploadEmergencyReport(report).catch((e) =>
            console.error("[AutoEmergency] S3 upload failed:", e)
          ),
          sendEmergencyAlert({
            emergencyLevel:   report.emergency_level,
            zone:             zone.zone_id,
            riskScore:        zone.score,
            triggerFactors:   report.trigger_factors,
            immediateActions: report.immediate_actions,
            evacuationZones:  report.evacuation_zones,
            safeAssemblyPoint: report.safe_assembly_point,
            dgfasliRequired:  report.regulatory_report.dgfasli_notification_required,
            generatedAt:      report.generated_at,
          }).catch((e) => console.error("[AutoEmergency] SES failed:", e)),
        ]);

        console.log(`[AutoEmergency] Zone ${zone.zone_id} — report generated, email sent, S3 archived`);
      } catch (e) {
        console.error(`[AutoEmergency] Failed for ${zone.zone_id}:`, e);
      }
    })();
  }

  // Snapshot risk scores
  await db.collection("risk_scores").insertMany(results as any[]);
  return results;
}
