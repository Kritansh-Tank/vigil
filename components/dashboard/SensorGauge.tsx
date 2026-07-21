"use client";

import { SensorReading, SensorType, SENSOR_THRESHOLDS } from "@/lib/types";
import { getRiskColor } from "@/lib/utils";

interface SensorGaugeProps {
  readings: SensorReading[];
  sensorType: SensorType;
}

const GAUGE_SIZE = 100;
const STROKE_WIDTH = 9;
const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Only show 270° arc (three-quarter circle)
const ARC = CIRCUMFERENCE * 0.75;

export default function SensorGauge({ readings, sensorType }: SensorGaugeProps) {
  const threshold = SENSOR_THRESHOLDS[sensorType];

  // Get latest reading for this sensor type (any zone — show worst)
  const sensorReadings = readings.filter((r) => r.sensor_type === sensorType);
  const worstReading = sensorReadings.reduce(
    (worst, r) => (r.value > (worst?.value || 0) ? r : worst),
    sensorReadings[0]
  );

  const value = worstReading?.value ?? 0;
  const status = worstReading?.status ?? "NORMAL";

  const pct = Math.min(value / (threshold.danger * 1.5), 1);
  const dashOffset = ARC - pct * ARC;

  const color =
    status === "DANGER" ? "#dc2626" : status === "WARNING" ? "#d97706" : "#16a34a";

  const bgColor =
    status === "DANGER" ? "#fee2e2" : status === "WARNING" ? "#fef9c3" : "#f0fdf4";

  return (
    <div
      className="card p-3 flex flex-col items-center gap-1 transition-all"
      style={{ background: bgColor, borderColor: color + "40" }}
    >
      {/* SVG Gauge */}
      <div className="relative" style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}>
        <svg
          width={GAUGE_SIZE}
          height={GAUGE_SIZE}
          viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
          style={{ transform: "rotate(135deg)" }}
        >
          {/* Track */}
          <circle
            cx={GAUGE_SIZE / 2}
            cy={GAUGE_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
          />
          {/* Fill */}
          <circle
            cx={GAUGE_SIZE / 2}
            cy={GAUGE_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${ARC - dashOffset} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>

        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-mono font-bold leading-none"
            style={{ fontSize: 18, color }}
          >
            {value.toFixed(1)}
          </span>
          <span className="text-xs leading-none mt-0.5" style={{ color: "#64748b", fontSize: 9 }}>
            {threshold.unit}
          </span>
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <div className="font-semibold text-xs leading-tight" style={{ color: "#0f172a", fontSize: 11 }}>
          {threshold.label.split("(")[0].trim()}
        </div>
        <div
          className="text-xs font-semibold mt-0.5 rounded-full px-2 py-0.5 inline-block"
          style={{
            background: color + "20",
            color,
            fontSize: 9,
          }}
        >
          {status}
        </div>
      </div>

      {/* Threshold line */}
      <div className="w-full text-center" style={{ fontSize: 9, color: "#94a3b8" }}>
        Warn {threshold.warning} · Danger {threshold.danger}
      </div>
    </div>
  );
}
