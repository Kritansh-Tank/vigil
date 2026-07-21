"use client";

import { useState } from "react";
import { Alert } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";
import { Bell, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

function sevColor(s: string) {
  if (s === "CRITICAL") return "#991b1b";
  if (s === "HIGH")     return "#dc2626";
  if (s === "MEDIUM")   return "#d97706";
  return "#16a34a";
}

export default function AlertTimeline({ alerts, onAcknowledge }: {
  alerts: Alert[];
  onAcknowledge?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const active = alerts.filter((a) => a.status === "ACTIVE").slice(0, 20);
  const acked  = alerts.filter((a) => a.status !== "ACTIVE").slice(0, 5);
  const all    = [...active, ...acked];

  return (
    <div className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 160px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Bell size={13} color={active.length > 0 ? "#dc2626" : "#94a3b8"} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Alert Timeline</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: active.length > 0 ? "#fef2f2" : "#f0fdf4", color: active.length > 0 ? "#dc2626" : "#15803d", border: `1px solid ${active.length > 0 ? "#fecaca" : "#bbf7d0"}` }}>
          {active.length > 0 ? `${active.length} Active` : "All clear"}
        </span>
      </div>

      {/* Empty state */}
      {all.length === 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <CheckCircle size={22} color="#16a34a" />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>No active alerts</p>
          <p style={{ fontSize: 12, color: "#94a3b8" }}>All zones within safe parameters</p>
        </div>
      )}

      {/* Alert list */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {all.map((alert, i) => {
          const color     = sevColor(alert.severity);
          const isActive  = alert.status === "ACTIVE";
          const isOpen    = expanded === alert.alert_id;
          const factors   = alert.compound_factors || [];

          return (
            <div key={alert.alert_id} className="anim-fadeup"
              style={{ borderBottom: "1px solid #f1f5f9", animationDelay: `${i * 30}ms` }}>

              {/* ── Row (always visible) ───────────────────────────────── */}
              <div
                onClick={() => setExpanded(isOpen ? null : alert.alert_id)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "12px 14px", cursor: "pointer",
                  background: isActive && i === 0 ? `${color}06` : "transparent",
                  transition: "background 0.15s",
                }}
              >
                {/* Dot */}
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 3, boxShadow: isActive ? `0 0 8px ${color}80` : "none" }} />

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                      {alert.zone_id?.replace("_", " ")}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: `${color}18`, color }}>
                      {alert.severity}
                    </span>
                    <span className="mono" style={{ fontSize: 10, fontWeight: 700, color }}>
                      {alert.risk_score}
                    </span>
                  </div>
                  {/* Top 2 factors as preview */}
                  <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4, marginBottom: 5 }}>
                    {factors.slice(0, 2).join(" · ")}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#94a3b8" }}>
                      <Clock size={9} />
                      {formatTimestamp(alert.timestamp)}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {isActive && onAcknowledge ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); onAcknowledge(alert.alert_id); }}
                          style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#eff6ff", color: "#2563eb", border: "none", cursor: "pointer" }}>
                          Acknowledge
                        </button>
                      ) : (
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>{alert.status}</span>
                      )}
                      {isOpen
                        ? <ChevronUp size={12} color="#94a3b8" />
                        : <ChevronDown size={12} color="#94a3b8" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Expanded detail drawer ─────────────────────────────── */}
              {isOpen && (
                <div style={{ padding: "0 14px 14px 34px", borderTop: "1px solid #f8fafc" }}>

                  {/* All compound factors */}
                  {factors.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 5 }}>
                        Trigger Factors
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {factors.map((f, j) => (
                          <span key={j} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: `${color}12`, color, fontWeight: 600, border: `1px solid ${color}30` }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI reasoning */}
                  {alert.llm_reasoning && (
                    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px", borderLeft: `3px solid #2563eb` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", marginBottom: 3 }}>
                        AI Analysis
                      </p>
                      <p style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>
                        {alert.llm_reasoning}
                      </p>
                    </div>
                  )}

                  {/* Acknowledged notice */}
                  {!isActive && (
                    <p style={{ fontSize: 10, color: "#16a34a", marginTop: 8, fontWeight: 600 }}>
                      ✓ Acknowledged — Safety officer has reviewed and responded to this alert
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
