"use client";

import { ZoneRiskScore } from "@/lib/types";
import { getRiskColor, getRiskBgColor } from "@/lib/utils";

interface PlantMapProps {
  zones: ZoneRiskScore[];
  onZoneClick?: (zoneId: string) => void;
}

const ZONE_POSITIONS: Record<string, { x: number; y: number; w: number; h: number; label: string; sublabel: string }> = {
  ZONE_A: { x: 30, y: 30, w: 220, h: 120, label: "Zone A", sublabel: "Oven Groups 1–8" },
  ZONE_B: { x: 270, y: 30, w: 220, h: 120, label: "Zone B", sublabel: "Oven Groups 9–16" },
  ZONE_C: { x: 30, y: 170, w: 220, h: 100, label: "Zone C", sublabel: "Gas Collector Main" },
  ZONE_D: { x: 270, y: 170, w: 220, h: 100, label: "Zone D", sublabel: "By-Product Plant" },
  ZONE_E: { x: 30, y: 290, w: 220, h: 90, label: "Zone E", sublabel: "Coal Handling" },
  ZONE_F: { x: 270, y: 290, w: 220, h: 90, label: "Zone F", sublabel: "Control Room" },
};

export default function PlantMap({ zones, onZoneClick }: PlantMapProps) {
  const zoneMap = Object.fromEntries(zones.map((z) => [z.zone_id, z]));

  return (
    <div className="card p-4">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            Coke Oven Battery — Plant Layout
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Visakhapatnam Steel Plant · Live risk overlay
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", fontSize: 11, color: "var(--text-muted)" }}>
          {[
            { label: "Safe", color: "#16a34a" },
            { label: "Low", color: "#ca8a04" },
            { label: "Medium", color: "#ea580c" },
            { label: "High", color: "#dc2626" },
            { label: "Critical", color: "#991b1b" },
          ].map((item) => (
            <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: "inline-block", flexShrink: 0 }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <svg
        viewBox="0 0 520 400"
        className="w-full rounded-lg border"
        style={{ background: "#f8fafc", borderColor: "var(--border)" }}
      >
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="520" height="400" fill="url(#grid)" />

        {/* Connecting pipes */}
        <line x1="140" y1="150" x2="140" y2="170" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,2" />
        <line x1="380" y1="150" x2="380" y2="170" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,2" />
        <line x1="140" y1="270" x2="140" y2="290" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,2" />
        <line x1="380" y1="270" x2="380" y2="290" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,2" />
        <line x1="250" y1="90" x2="270" y2="90" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,2" />
        <line x1="250" y1="220" x2="270" y2="220" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,2" />
        <line x1="250" y1="335" x2="270" y2="335" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,2" />

        {/* Zone rectangles */}
        {Object.entries(ZONE_POSITIONS).map(([zoneId, pos]) => {
          const zone = zoneMap[zoneId];
          if (!zone) return null;
          const fillColor = getRiskBgColor(zone.score);
          const borderColor = getRiskColor(zone.score);
          const isCritical = zone.score >= 85;

          return (
            <g
              key={zoneId}
              onClick={() => onZoneClick?.(zoneId)}
              style={{ cursor: onZoneClick ? "pointer" : "default" }}
            >
              {/* Pulse ring for critical zones */}
              {isCritical && (
                <rect
                  x={pos.x - 4}
                  y={pos.y - 4}
                  width={pos.w + 8}
                  height={pos.h + 8}
                  rx={12}
                  fill="none"
                  stroke={borderColor}
                  strokeWidth="2"
                  opacity="0.4"
                  style={{
                    animation: "risk-pulse 2s ease-in-out infinite",
                  }}
                />
              )}

              {/* Zone background */}
              <rect
                x={pos.x}
                y={pos.y}
                width={pos.w}
                height={pos.h}
                rx={8}
                fill={fillColor}
                stroke={borderColor}
                strokeWidth={isCritical ? 2.5 : 1.5}
              />

              {/* Zone label */}
              <text
                x={pos.x + pos.w / 2}
                y={pos.y + 24}
                textAnchor="middle"
                fontSize="13"
                fontWeight="700"
                fontFamily="Inter, sans-serif"
                fill={borderColor}
              >
                {pos.label}
              </text>
              <text
                x={pos.x + pos.w / 2}
                y={pos.y + 40}
                textAnchor="middle"
                fontSize="9"
                fontFamily="Inter, sans-serif"
                fill="#64748b"
              >
                {pos.sublabel}
              </text>

              {/* Risk score circle */}
              <circle
                cx={pos.x + pos.w - 24}
                cy={pos.y + 24}
                r="16"
                fill={borderColor}
              />
              <text
                x={pos.x + pos.w - 24}
                y={pos.y + 29}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
                fill="white"
              >
                {zone.score}
              </text>

              {/* Worker count */}
              <g transform={`translate(${pos.x + 12}, ${pos.y + pos.h - 24})`}>
                <circle cx="7" cy="7" r="7" fill="rgba(0,0,0,0.06)" />
                <text x="7" y="11" textAnchor="middle" fontSize="8" fontFamily="Inter" fill="#475569">
                  {zone.worker_count}W
                </text>
              </g>

              {/* Permit count */}
              {zone.active_permits > 0 && (
                <g transform={`translate(${pos.x + 36}, ${pos.y + pos.h - 24})`}>
                  <circle cx="7" cy="7" r="7" fill={zone.active_permits > 0 && zone.score > 50 ? "#fee2e2" : "rgba(0,0,0,0.06)"} />
                  <text x="7" y="11" textAnchor="middle" fontSize="8" fontFamily="Inter" fill={zone.active_permits > 0 && zone.score > 50 ? "#dc2626" : "#475569"}>
                    {zone.active_permits}P
                  </text>
                </g>
              )}

              {/* Primary risk factor */}
              {zone.factors[0] && (
                <text
                  x={pos.x + pos.w / 2}
                  y={pos.y + pos.h - 10}
                  textAnchor="middle"
                  fontSize="8"
                  fontFamily="Inter, sans-serif"
                  fill={borderColor}
                  opacity="0.85"
                >
                  {zone.factors[0].length > 35
                    ? zone.factors[0].substring(0, 35) + "…"
                    : zone.factors[0]}
                </text>
              )}
            </g>
          );
        })}

        {/* Legend: W = workers, P = permits */}
        <text x="260" y="392" textAnchor="middle" fontSize="8" fontFamily="Inter" fill="#94a3b8">
          W = Workers · P = Active Permits · Score 0–100
        </text>
      </svg>
    </div>
  );
}
