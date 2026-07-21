// ─── Sensor Types ────────────────────────────────────────────────────────────
export type SensorType = "CH4" | "CO" | "H2S" | "SO2" | "TEMP" | "PRESSURE";
export type SensorStatus = "NORMAL" | "WARNING" | "DANGER";

export interface SensorReading {
  _id?: string;
  timestamp: Date;
  zone_id: ZoneId;
  sensor_type: SensorType;
  value: number;
  unit: string;
  status: SensorStatus;
  device_id: string;
}

// ─── Zone Types ───────────────────────────────────────────────────────────────
export type ZoneId = "ZONE_A" | "ZONE_B" | "ZONE_C" | "ZONE_D" | "ZONE_E" | "ZONE_F";
export type RiskSeverity = "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ZoneRiskScore {
  zone_id: ZoneId;
  zone_name: string;
  score: number; // 0–100
  severity: RiskSeverity;
  factors: string[];
  recommendation: string;
  llm_reasoning: string;
  timestamp: Date;
  worker_count: number;
  active_permits: number;
}

// ─── Permit Types ─────────────────────────────────────────────────────────────
export type PermitType = "HOT_WORK" | "CONFINED_SPACE" | "ELECTRICAL" | "COLD_WORK";
export type PermitStatus = "PENDING_AI" | "ACTIVE" | "BLOCKED" | "SUSPENDED" | "CLOSED";
export type AIVerdict = "APPROVED" | "BLOCKED" | "CONDITIONAL";

export interface Permit {
  _id?: string;
  permit_id: string;
  type: PermitType;
  zone_id: ZoneId;
  issued_by: string;
  issued_to: string;
  valid_from: Date;
  valid_until: Date;
  status: PermitStatus;
  ai_verdict?: AIVerdict;
  ai_reason?: string;
  ai_referenced_standard?: string;
  conditions: string[];
  created_at: Date;
}

export interface PermitValidationResult {
  verdict: AIVerdict;
  reason: string;
  conditions_if_approved: string[];
  referenced_standard: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

// ─── Alert Types ──────────────────────────────────────────────────────────────
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";

export interface Alert {
  _id?: string;
  alert_id: string;
  timestamp: Date;
  severity: AlertSeverity;
  zone_id: ZoneId;
  risk_score: number;
  compound_factors: string[];
  llm_reasoning: string;
  status: AlertStatus;
  emergency_report?: EmergencyReport;
}

// ─── Emergency Types ──────────────────────────────────────────────────────────
export interface EmergencyReport {
  emergency_level: "HIGH" | "CRITICAL";
  trigger_zone_id?: string;           // zone that triggered the event
  trigger_factors: string[];
  evacuation_zones: ZoneId[];
  safe_assembly_point: string;
  immediate_actions: string[];
  regulatory_report: {
    format: string;
    preliminary_narrative: string;
    dgfasli_notification_required: boolean;
  };
  generated_at: Date;
  s3_report_url?: string | null;      // pre-signed S3 download URL (24h expiry)
}


// ─── Worker Types ─────────────────────────────────────────────────────────────
export interface Worker {
  _id?: string;
  worker_id: string;
  name: string;
  zone_id: ZoneId;
  last_seen: Date;
  permit_ref?: string;
  shift: "DAY" | "EVENING" | "NIGHT";
  role: string;
}

// ─── Scenario Types ───────────────────────────────────────────────────────────
export type ScenarioType = "NORMAL" | "SCENARIO_1" | "SCENARIO_2" | "SCENARIO_3";

export interface ScenarioState {
  active: ScenarioType;
  started_at?: Date;
  progress?: number; // 0–100
}

// ─── Chat Types ───────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: DocumentSource[];
  timestamp: Date;
}

export interface DocumentSource {
  doc_id: string;
  standard: string;
  section: string;
  title: string;
  excerpt: string;
}

// ─── Sensor Thresholds ────────────────────────────────────────────────────────
export const SENSOR_THRESHOLDS: Record<SensorType, { warning: number; danger: number; unit: string; label: string }> = {
  CH4:      { warning: 10,   danger: 25,  unit: "% LEL", label: "Methane (CH₄)" },
  CO:       { warning: 25,   danger: 50,  unit: "ppm",   label: "Carbon Monoxide (CO)" },
  H2S:      { warning: 5,    danger: 10,  unit: "ppm",   label: "Hydrogen Sulphide (H₂S)" },
  SO2:      { warning: 2,    danger: 5,   unit: "ppm",   label: "Sulphur Dioxide (SO₂)" },
  TEMP:     { warning: 65,   danger: 85,  unit: "°C",    label: "Temperature" },
  PRESSURE: { warning: 120,  danger: 150, unit: "kPa",   label: "Gas Pressure" },
};

export const ZONE_NAMES: Record<ZoneId, string> = {
  ZONE_A: "Battery Zone A — Oven Groups 1–8",
  ZONE_B: "Battery Zone B — Oven Groups 9–16",
  ZONE_C: "Battery Zone C — Gas Collector Main",
  ZONE_D: "Battery Zone D — By-Product Plant",
  ZONE_E: "Battery Zone E — Coal Handling",
  ZONE_F: "Battery Zone F — Control Room Area",
};
