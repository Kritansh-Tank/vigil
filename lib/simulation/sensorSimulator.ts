import { getDb } from "@/lib/db/mongodb";
import { SensorReading, SensorType, ZoneId, SENSOR_THRESHOLDS } from "@/lib/types";
import { getSensorStatus } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

// ─── Baseline values (normal operating conditions) ───────────────────────────
const BASELINES: Record<ZoneId, Record<SensorType, number>> = {
  ZONE_A: { CH4: 3.5,  CO: 8,   H2S: 0.8,  SO2: 0.5,  TEMP: 48,  PRESSURE: 98  },
  ZONE_B: { CH4: 4.2,  CO: 10,  H2S: 1.1,  SO2: 0.7,  TEMP: 52,  PRESSURE: 102 },
  ZONE_C: { CH4: 5.0,  CO: 12,  H2S: 1.5,  SO2: 0.9,  TEMP: 55,  PRESSURE: 108 },
  ZONE_D: { CH4: 3.0,  CO: 7,   H2S: 0.6,  SO2: 0.4,  TEMP: 45,  PRESSURE: 95  },
  ZONE_E: { CH4: 2.5,  CO: 6,   H2S: 0.4,  SO2: 0.3,  TEMP: 42,  PRESSURE: 92  },
  ZONE_F: { CH4: 1.2,  CO: 4,   H2S: 0.2,  SO2: 0.2,  TEMP: 38,  PRESSURE: 88  },
};

type ScenarioType = "NORMAL" | "SCENARIO_1" | "SCENARIO_2" | "SCENARIO_3";

let currentScenario: ScenarioType = "NORMAL";
let scenarioStep = 0;
let scenarioStartTime: Date | null = null;

// ─── Scenario progressions ────────────────────────────────────────────────────
// Scenario 1: Vizag Coke Oven Gas Leak + Active PTW (Zone B CH4 rises)
// Scenario 2: Confined Space + Shift Changeover + H2S Rise (Zone D)
// Scenario 3: Hot Work Permit blocked (Zone C elevated CH4)

function getScenarioMultiplier(
  zone: ZoneId,
  sensor: SensorType,
  step: number
): number {
  const progress = Math.min(step / 40, 1); // 40 steps = ~2 minutes

  if (currentScenario === "SCENARIO_1") {
    if (zone === "ZONE_B") {
      if (sensor === "CH4")      return 1 + progress * 11;   // 4.2 → ~50% LEL
      if (sensor === "CO")       return 1 + progress * 4;    // 10 → ~50 ppm
      if (sensor === "PRESSURE") return 1 + progress * 0.5;  // slight rise
    }
    if (zone === "ZONE_C" && sensor === "CH4") return 1 + progress * 3;
  }

  if (currentScenario === "SCENARIO_2") {
    if (zone === "ZONE_D") {
      if (sensor === "H2S")  return 1 + progress * 20;  // 0.6 → ~13 ppm
      if (sensor === "CO")   return 1 + progress * 3;
      if (sensor === "TEMP") return 1 + progress * 0.5;
    }
  }

  if (currentScenario === "SCENARIO_3") {
    if (zone === "ZONE_C") {
      if (sensor === "CH4")  return 1 + progress * 7;   // 5.0 → ~38% LEL
      if (sensor === "SO2")  return 1 + progress * 4;
    }
  }

  return 1;
}

function generateReading(
  zone: ZoneId,
  sensorType: SensorType,
  step: number
): SensorReading {
  const baseline = BASELINES[zone][sensorType];
  const multiplier = getScenarioMultiplier(zone, sensorType, step);

  // Add gaussian noise (±3% of baseline)
  const noise = baseline * 0.03 * (Math.random() * 2 - 1);
  const value = Math.max(0, parseFloat((baseline * multiplier + noise).toFixed(2)));
  const threshold = SENSOR_THRESHOLDS[sensorType];

  return {
    timestamp: new Date(),
    zone_id: zone,
    sensor_type: sensorType,
    value,
    unit: threshold.unit,
    status: getSensorStatus(sensorType, value),
    device_id: `SEN-${zone.replace("ZONE_", "")}-${sensorType}-01`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function setScenario(scenario: ScenarioType) {
  currentScenario = scenario;
  scenarioStep = 0;
  scenarioStartTime = new Date();
  console.log(`[Simulator] Scenario set to: ${scenario}`);
}

export function getScenarioState() {
  return {
    active: currentScenario,
    started_at: scenarioStartTime,
    progress: Math.min((scenarioStep / 40) * 100, 100),
  };
}

export async function generateAndStoreTick(): Promise<SensorReading[]> {
  const db = await getDb();
  const collection = db.collection("sensors");

  const zones: ZoneId[] = ["ZONE_A", "ZONE_B", "ZONE_C", "ZONE_D", "ZONE_E", "ZONE_F"];
  const sensors: SensorType[] = ["CH4", "CO", "H2S", "SO2", "TEMP", "PRESSURE"];

  const readings: SensorReading[] = [];

  for (const zone of zones) {
    for (const sensor of sensors) {
      const reading = generateReading(zone, sensor, scenarioStep);
      readings.push(reading);
    }
  }

  // Insert all readings (cast to avoid ObjectId vs string _id conflict — Mongo generates _id on insert)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await collection.insertMany(readings as any[]);

  // Advance scenario
  if (currentScenario !== "NORMAL") {
    scenarioStep++;
    // Auto-reset after completion
    if (scenarioStep > 60) {
      currentScenario = "NORMAL";
      scenarioStep = 0;
      scenarioStartTime = null;
    }
  }

  return readings;
}

export async function getLatestReadings(): Promise<SensorReading[]> {
  const db = await getDb();
  const collection = db.collection("sensors");

  const zones: ZoneId[] = ["ZONE_A", "ZONE_B", "ZONE_C", "ZONE_D", "ZONE_E", "ZONE_F"];
  const sensors: SensorType[] = ["CH4", "CO", "H2S", "SO2", "TEMP", "PRESSURE"];

  const results: SensorReading[] = [];

  for (const zone of zones) {
    for (const sensor of sensors) {
      const latest = await collection
        .find({ zone_id: zone, sensor_type: sensor })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();
      if (latest.length > 0) {
        results.push(latest[0] as unknown as SensorReading);
      }
    }
  }

  return results;
}

export async function getZoneHistory(
  zoneId: ZoneId,
  sensorType: SensorType,
  limit = 20
): Promise<SensorReading[]> {
  const db = await getDb();
  const collection = db.collection("sensors");

  const results = await collection
    .find({ zone_id: zoneId, sensor_type: sensorType })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();

  return results.reverse() as unknown as SensorReading[];
}
