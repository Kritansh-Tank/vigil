"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/shared/Sidebar";
import { ZoneRiskScore, EmergencyReport } from "@/lib/types";
import { getRiskColor } from "@/lib/utils";
import {
  AlertTriangle, Loader2, CheckCircle, Radio,
  Users, MapPin, FileText, ShieldAlert, Siren
} from "lucide-react";

export default function EmergencyPage() {
  const [zones, setZones] = useState<ZoneRiskScore[]>([]);
  const [selectedZone, setSelectedZone] = useState<ZoneRiskScore | null>(null);
  const [report, setReport] = useState<EmergencyReport | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function downloadPdf() {
    if (!report) return;
    setDownloadingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 170; // usable width
      const RED = report.emergency_level === "CRITICAL" ? [220, 38, 38] : [217, 119, 6];
      const DARK = [15, 23, 42];
      const GREY = [71, 85, 105];
      const zone = (report.trigger_zone_id || "UNKNOWN").replace("_", " ");
      const dateStr = new Date(report.generated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

      // ── Header band ─────────────────────────────────────────────────────────
      doc.setFillColor(report.emergency_level === "CRITICAL" ? 153 : 146, report.emergency_level === "CRITICAL" ? 27 : 64, report.emergency_level === "CRITICAL" ? 27 : 14);
      doc.rect(0, 0, 210, 32, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text(`⚠  ${report.emergency_level} EMERGENCY REPORT`, 20, 13);
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text(`VIGIL Safety Intelligence  ·  ${dateStr} IST`, 20, 20);
      doc.text(`Trigger Zone: ${zone}`, 20, 26);

      let y = 42;

      // ── Trigger Factors ──────────────────────────────────────────────────────
      doc.setTextColor(...RED as [number, number, number]);
      doc.setFontSize(9); doc.setFont("helvetica", "bold");
      doc.text("COMPOUND RISK FACTORS", 20, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GREY as [number, number, number]);
      for (const f of report.trigger_factors) {
        doc.setFillColor(...RED as [number, number, number]);
        doc.rect(20, y - 3, 2, 4, "F");
        doc.text(f, 25, y, { maxWidth: W - 5 }); y += 7;
      }
      y += 4;

      // ── Evacuation Zones ─────────────────────────────────────────────────────
      doc.setTextColor(30, 64, 175); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text("EVACUATION ZONES", 20, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setTextColor(...RED as [number, number, number]);
      doc.text(report.evacuation_zones.join("  |  "), 20, y); y += 7;
      doc.setFillColor(220, 252, 231); doc.rect(20, y - 2, W, 8, "F");
      doc.setTextColor(22, 101, 52); doc.setFontSize(8);
      doc.text(`✔  Safe Assembly: ${report.safe_assembly_point}`, 23, y + 4); y += 14;

      // ── Immediate Actions ────────────────────────────────────────────────────
      doc.setTextColor(30, 64, 175); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text("IMMEDIATE ACTIONS", 20, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...DARK as [number, number, number]);
      for (const action of report.immediate_actions) {
        doc.setFillColor(...RED as [number, number, number]);
        doc.circle(22, y - 1, 1, "F");
        const lines = doc.splitTextToSize(action, W - 8);
        doc.text(lines, 26, y); y += lines.length * 5 + 3;
      }
      y += 4;

      // ── Regulatory ───────────────────────────────────────────────────────────
      doc.setTextColor(30, 64, 175); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text("REGULATORY REPORTING", 20, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setTextColor(...GREY as [number, number, number]);
      doc.setFontSize(8);
      doc.text(`Format: ${report.regulatory_report.format}`, 20, y); y += 6;
      if (report.regulatory_report.dgfasli_notification_required) {
        doc.setFillColor(239, 246, 255); doc.rect(20, y - 2, W, 12, "F");
        doc.setTextColor(30, 64, 175); doc.setFont("helvetica", "bold");
        doc.text("⚠  DGFASLI notification required within 4 hours", 23, y + 3);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7);
        doc.text("File Form 18 or Form 19 under Factories Act 1948", 23, y + 9); y += 18;
      }
      const narrative = doc.splitTextToSize(report.regulatory_report.preliminary_narrative, W);
      doc.setTextColor(...GREY as [number, number, number]); doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text(narrative, 20, y); y += narrative.length * 4 + 8;

      // ── Footer ───────────────────────────────────────────────────────────────
      doc.setDrawColor(226, 232, 240); doc.line(20, y, 190, y); y += 5;
      doc.setTextColor(148, 163, 184); doc.setFontSize(7);
      doc.text("Generated by VIGIL Safety Intelligence  ·  OISD-116 Section 7.1 Compliant  ·  Confidential", 20, y);

      doc.save(`VIGIL-Emergency-${zone}-${new Date(report.generated_at).toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error("[PDF] Download failed:", e);
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function fetchZones() {
    try {
      const res = await fetch("/api/risk/zones");
      const data = await res.json();
      if (data.zones) {
        setZones(data.zones);
        // Auto-select highest risk zone
        const sorted = [...data.zones].sort((a, b) => b.score - a.score);
        if (sorted[0]) setSelectedZone(sorted[0]);
      }
    } finally {
      setLoadingZones(false);
    }
  }

  useEffect(() => {
    fetchZones();
  }, []);

  async function triggerEmergency() {
    if (!selectedZone) return;
    setTriggering(true);
    setReport(null);
    try {
      const res = await fetch("/api/emergency/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger_zone: selectedZone, all_zones: zones }),
      });
      const data = await res.json();
      if (data.report) setReport(data.report);
    } catch (e) {
      console.error("Emergency trigger failed:", e);
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <div className="app-topbar">
          <div className="flex-1" style={{ minWidth: 0 }}>
            <h1 className="font-bold text-base leading-none" style={{ color: "var(--text-primary)" }}>Emergency Response</h1>
            <p className="text-xs hide-mobile" style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              AI-generated response plans · OISD-116 Section 7.1 compliant · DGFASLI reporting
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#fff7ed", border: "1px solid #fed7aa", flexShrink: 0 }}>
            <Radio size={13} style={{ color: "#ea580c" }} className="animate-blink" />
            <span className="text-xs font-medium hide-mobile" style={{ color: "#ea580c" }}>Emergency Systems Standby</span>
            <span className="text-xs font-medium" style={{ color: "#ea580c", display: "none" }} aria-hidden>Standby</span>
          </div>
        </div>

        <div className="app-content">
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Zone Selection + Trigger */}
            <div className="space-y-4">
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--text-primary)" }}>
                  Select Trigger Zone
                </h3>
                {loadingZones ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                    <Loader2 size={14} className="animate-spin" />
                    Loading zone status...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {zones
                      .sort((a, b) => b.score - a.score)
                      .map((zone) => {
                        const color = getRiskColor(zone.score);
                        const isSelected = selectedZone?.zone_id === zone.zone_id;
                        return (
                          <button
                            key={zone.zone_id}
                            onClick={() => setSelectedZone(zone)}
                            className="w-full text-left p-3 rounded-xl border-2 transition-all"
                            style={{
                              borderColor: isSelected ? color : "var(--border)",
                              background: isSelected ? color + "10" : "var(--bg-surface)",
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                {zone.zone_id.replace("_", " ")}
                              </span>
                              <span className="text-sm font-bold text-mono" style={{ color }}>
                                {zone.score}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1 rounded-full" style={{ background: "var(--border)" }}>
                                <div
                                  className="h-1 rounded-full"
                                  style={{ width: `${zone.score}%`, background: color, transition: "width 0.5s ease" }}
                                />
                              </div>
                              <span className="text-xs font-bold" style={{ color, fontSize: 10 }}>
                                {zone.severity}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Big Emergency Button */}
              <button
                onClick={triggerEmergency}
                disabled={triggering || !selectedZone}
                className="w-full py-4 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-3 transition-all"
                style={{
                  background: triggering ? "#94a3b8" : "linear-gradient(135deg, #dc2626, #991b1b)",
                  boxShadow: triggering ? "none" : "0 4px 20px rgba(220,38,38,0.4)",
                }}
              >
                {triggering ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating Response Plan...
                  </>
                ) : (
                  <>
                    <Siren size={18} />
                    Generate Emergency Response
                  </>
                )}
              </button>

              {selectedZone && (
                <div className="card p-4">
                  <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                    SELECTED ZONE FACTORS
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedZone.factors.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: getRiskColor(selectedZone.score) }}>→</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right: Emergency Report */}
            <div className="col-span-2">
              {!report && !triggering && (
                <div className="card h-full flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "#fff7ed", border: "2px solid #fed7aa" }}>
                    <ShieldAlert size={28} style={{ color: "#ea580c" }} />
                  </div>
                  <h3 className="font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>
                    Emergency Response Standby
                  </h3>
                  <p className="text-sm max-w-md" style={{ color: "var(--text-secondary)" }}>
                    Select a zone and trigger the emergency response. VIGIL will generate a compound risk-aware evacuation plan and regulatory report draft instantly.
                  </p>
                </div>
              )}

              {triggering && (
                <div className="card h-full flex flex-col items-center justify-center p-12 text-center">
                  <Loader2 size={32} className="animate-spin mb-4" style={{ color: "var(--brand-blue)" }} />
                  <p className="font-medium text-sm" style={{ color: "var(--text-secondary)" }}>
                    Analysing compound risk factors and generating response plan...
                  </p>
                </div>
              )}

              {report && (
                <div className="space-y-4 animate-fade-in">
                  {/* Emergency Level Banner */}
                  <div
                    className="card p-5"
                    style={{
                      background: report.emergency_level === "CRITICAL" ? "#fef2f2" : "#fff7ed",
                      borderColor: report.emergency_level === "CRITICAL" ? "#fca5a5" : "#fdba74",
                      borderWidth: 2,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-blink"
                        style={{ background: report.emergency_level === "CRITICAL" ? "#dc2626" : "#d97706" }}>
                        <AlertTriangle size={20} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-base" style={{ color: report.emergency_level === "CRITICAL" ? "#dc2626" : "#d97706" }}>
                          {report.emergency_level} EMERGENCY DECLARED
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          VIGIL Emergency Response Protocol · {report.generated_at ? new Date(report.generated_at).toLocaleTimeString("en-IN") : ""}
                        </div>
                      </div>
                      {/* PDF Download Button */}
                      <button
                        onClick={downloadPdf}
                        disabled={downloadingPdf}
                        className="btn-primary"
                        style={{ fontSize: 12, padding: "7px 14px", gap: 6 }}
                      >
                        {downloadingPdf
                          ? <Loader2 size={13} className="animate-spin" />
                          : <FileText size={13} />}
                        {downloadingPdf ? "Generating PDF..." : "Download Report"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {report.trigger_factors.map((f, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Evacuation */}
                    <div className="card p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin size={14} style={{ color: "#dc2626" }} />
                        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                          Evacuation Zones
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {report.evacuation_zones.map((z) => (
                          <span key={z} className="text-xs font-bold px-3 py-1.5 rounded-lg"
                            style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }}>
                            {z.replace("_", " ")}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-start gap-2 p-2 rounded-lg" style={{ background: "#f0fdf4" }}>
                        <CheckCircle size={13} style={{ color: "#16a34a", marginTop: 1 }} />
                        <div>
                          <div className="text-xs font-semibold" style={{ color: "#15803d" }}>
                            Safe Assembly Point
                          </div>
                          <div className="text-xs" style={{ color: "#166534" }}>
                            {report.safe_assembly_point}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Regulatory */}
                    <div className="card p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText size={14} style={{ color: "var(--brand-blue)" }} />
                        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                          Regulatory Reporting
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs px-3 py-2 rounded-lg"
                          style={{ background: "#eff6ff", color: "var(--brand-blue)" }}>
                          <span className="font-semibold">Format:</span> {report.regulatory_report.format}
                        </div>
                        {report.regulatory_report.dgfasli_notification_required && (
                          <div className="text-xs px-3 py-2 rounded-lg font-medium"
                            style={{ background: "#fee2e2", color: "#dc2626" }}>
                            ⚠ DGFASLI notification required within 4 hours
                          </div>
                        )}
                        <p className="text-xs leading-relaxed mt-2" style={{ color: "var(--text-secondary)" }}>
                          {report.regulatory_report.preliminary_narrative}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Immediate Actions */}
                  <div className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users size={14} style={{ color: "var(--brand-blue)" }} />
                      <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                        Immediate Actions — In Order
                      </span>
                    </div>
                    <ol className="space-y-2">
                      {report.immediate_actions.map((action, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span
                            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: i === 0 ? "#dc2626" : i < 3 ? "#d97706" : "#1e40af" }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-sm pt-0.5" style={{ color: "var(--text-primary)" }}>
                            {action}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
