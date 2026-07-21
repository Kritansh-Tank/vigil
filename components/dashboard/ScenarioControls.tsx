"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ShieldAlert, Zap, RotateCcw, Loader2 } from "lucide-react";

const SCENARIOS = [
  {
    id: "SCENARIO_1",
    label: "Coke Oven Gas Leak",
    tag: "CH₄ Escalation",
    desc: "Zone B methane rises with active PTW — mirrors the Jan 2025 Vizag incident pattern",
    Icon: AlertTriangle,
    color: "#dc2626",
    light: "#fef2f2",
    border: "#fecaca",
  },
  {
    id: "SCENARIO_2",
    label: "Confined Space Entry",
    tag: "H₂S / Night Shift",
    desc: "Zone D H₂S elevation during night shift changeover with maintenance crew active",
    Icon: ShieldAlert,
    color: "#d97706",
    light: "#fffbeb",
    border: "#fde68a",
  },
  {
    id: "SCENARIO_3",
    label: "Hot Work Intercepted",
    tag: "Permit Blocked",
    desc: "Zone C elevated CH₄ — navigate to Permit Intelligence to see AI block the permit",
    Icon: Zap,
    color: "#2563eb",
    light: "#eff6ff",
    border: "#bfdbfe",
  },
];

export default function ScenarioControls({ onScenarioStart }: { onScenarioStart?: (id: string) => void }) {
  const [active, setActive]   = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // Restore scenario state on mount (survives tab switching)
  useEffect(() => {
    fetch("/api/scenario")
      .then((r) => r.json())
      .then((d) => {
        if (d.active && d.active !== "NORMAL") setActive(d.active);
      })
      .catch(() => {});
  }, []);

  async function trigger(id: string) {
    setLoading(id);
    try {
      const r = await fetch("/api/scenario", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: id }) });
      if (r.ok) { setActive(id); onScenarioStart?.(id); }
    } finally { setLoading(null); }
  }

  async function reset() {
    setLoading("NORMAL");
    try {
      await fetch("/api/scenario", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "NORMAL" }) });
      setActive(null);
    } finally { setLoading(null); }
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p className="section-title">Operational Scenarios</p>
          <p className="section-sub">Activate to observe real-time compound risk detection</p>
        </div>
        {active && (
          <button className="btn btn-ghost" onClick={reset} disabled={!!loading}
            style={{ fontSize: 12, padding: "6px 12px" }}>
            <RotateCcw size={11} />
            Reset
          </button>
        )}
      </div>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {SCENARIOS.map((s) => {
          const isActive  = active === s.id;
          const isLoading = loading === s.id;
          return (
            <button key={s.id} onClick={() => trigger(s.id)} disabled={!!loading}
              style={{
                textAlign: "left", padding: 16, borderRadius: 12, cursor: "pointer",
                background: isActive ? s.light : "#f8fafc",
                border: `1.5px solid ${isActive ? s.color : "#e2e8f0"}`,
                boxShadow: isActive ? `0 0 0 3px ${s.color}20, 0 4px 16px ${s.color}18` : "none",
                opacity: loading && !isLoading ? 0.5 : 1,
                transition: "all 0.2s ease",
              }}>
              {/* Top row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: isActive ? `${s.color}20` : "#f1f5f9", border: `1px solid ${isActive ? s.border : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isLoading
                    ? <Loader2 size={15} color={s.color} className="anim-spin" />
                    : <s.Icon size={15} color={isActive ? s.color : "#94a3b8"} />}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: isActive ? `${s.color}18` : "#f1f5f9", color: isActive ? s.color : "#94a3b8" }}>
                  {isActive
                    ? <span className="anim-blink">● LIVE</span>
                    : s.tag}
                </span>
              </div>
              {/* Label */}
              <p style={{ fontSize: 13, fontWeight: 700, color: isActive ? s.color : "#0f172a", marginBottom: 5, lineHeight: 1.3 }}>
                {s.label}
              </p>
              {/* Desc */}
              <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
                {s.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
