"use client";

import { ZoneRiskScore } from "@/lib/types";
import { Users, FileText } from "lucide-react";

function riskColor(score: number) {
  if (score >= 85) return "#991b1b";
  if (score >= 75) return "#dc2626";
  if (score >= 50) return "#d97706";
  if (score >= 30) return "#ea580c";
  return "#16a34a";
}

function riskLabel(score: number) {
  if (score >= 85) return "CRITICAL";
  if (score >= 75) return "HIGH";
  if (score >= 50) return "MEDIUM";
  if (score >= 30) return "LOW";
  return "SAFE";
}

// Inline SVG sparkline
function Sparkline({ data, color }: { data: number[]; color: string }) {
  // Need at least 2 points to draw a line; pad with current value if sparse
  const padded = data.length < 2
    ? Array(8).fill(data[0] ?? 0)
    : data;

  const W = 80, H = 22;
  const max = Math.max(...padded, 1);
  const min = 0;
  const range = max - min || 1;

  const pts = padded.map((v, i) => {
    const x = (i / (padded.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastX = W;
  const lastY = H - ((padded[padded.length - 1] - min) / range) * H;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {/* Fill area */}
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${H} ${pts.join(" ")} ${W},${H}`}
        fill={`url(#sg-${color.replace("#", "")})`}
      />
      {/* Line */}
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
      {/* Last point dot */}
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

export default function RiskScoreCard({
  zone,
  trend,
  onClick,
}: {
  zone: ZoneRiskScore;
  trend?: number[];
  onClick?: () => void;
}) {
  const color = riskColor(zone.score);
  const label = riskLabel(zone.score);
  // Append current score to trend so sparkline always ends at the current value
  const trendData = trend && trend.length > 0
    ? [...trend.slice(-7), zone.score]
    : [zone.score];

  return (
    <div onClick={onClick} className="card" style={{ padding: 16, borderLeft: `3px solid ${color}`, cursor: onClick ? "pointer" : "default" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
            {zone.zone_id.replace("_", " ")}
          </p>
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {zone.zone_name.includes("—") ? zone.zone_name.split("—")[1].trim() : zone.zone_name}
          </p>
        </div>
        {/* Score bubble */}
        <div className="mono" style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,${color},${color}cc)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 14, flexShrink: 0, boxShadow: `0 2px 8px ${color}40` }}>
          {zone.score}
        </div>
      </div>

      {/* Sparkline trend */}
      <div style={{ marginBottom: 8, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <Sparkline data={trendData} color={color} />
        <span style={{ fontSize: 9, color: "#94a3b8", marginLeft: 4, whiteSpace: "nowrap" }}>
          {trendData.length > 1 ? "10 min" : "now"}
        </span>
      </div>

      {/* Risk bar */}
      <div style={{ height: 4, borderRadius: 99, background: "#f1f5f9", marginBottom: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${zone.score}%`, borderRadius: 99, background: `linear-gradient(90deg,${color}aa,${color})`, transition: "width 0.8s ease" }} />
      </div>

      {/* Top factor */}
      {zone.factors[0] && (
        <p style={{ fontSize: 11, color: "#64748b", marginBottom: 8, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
          ↳ {zone.factors[0]}
        </p>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94a3b8" }}>
          <Users size={10} /> {zone.worker_count}W
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: zone.active_permits > 0 ? color : "#94a3b8" }}>
          <FileText size={10} /> {zone.active_permits}P
        </span>
        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: `${color}18`, color }}>
          {label}
        </span>
      </div>
    </div>
  );
}
