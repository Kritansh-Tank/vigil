"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/shared/Sidebar";
import { PermitType, ZoneId, ZONE_NAMES, Worker } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  ClipboardList, Plus, CheckCircle, XCircle, AlertCircle,
  Loader2, Clock, FileText
} from "lucide-react";

const PERMIT_TYPE_LABELS: Record<PermitType, string> = {
  HOT_WORK: "Hot Work",
  CONFINED_SPACE: "Confined Space",
  ELECTRICAL: "Electrical Isolation",
  COLD_WORK: "Cold Work",
};

const ZONES: ZoneId[] = ["ZONE_A", "ZONE_B", "ZONE_C", "ZONE_D", "ZONE_E", "ZONE_F"];

interface ValidationResult {
  verdict: "APPROVED" | "BLOCKED" | "CONDITIONAL";
  reason: string;
  conditions_if_approved: string[];
  referenced_standard: string;
  risk_level: string;
}

export default function PermitsPage() {
  const [permits, setPermits] = useState<any[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{ id: string; result: ValidationResult } | null>(null);

  const [form, setForm] = useState({
    type: "HOT_WORK" as PermitType,
    zone_id: "ZONE_A" as ZoneId,
    issued_by: "Safety Officer",
    issued_to: "",
    valid_from: new Date().toISOString().slice(0, 16),
    valid_until: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16),
  });

  async function fetchPermits() {
    const res = await fetch("/api/permits");
    const data = await res.json();
    setPermits(data.permits || []);
  }

  async function fetchWorkers() {
    const res = await fetch("/api/workers");
    const data = await res.json();
    setWorkers(data.workers || []);
  }

  useEffect(() => {
    fetchPermits();
    fetchWorkers();
    const iv = setInterval(fetchPermits, 30000);
    return () => clearInterval(iv);
  }, []);

  async function submitPermit() {
    setLoading(true);
    try {
      const res = await fetch("/api/permits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.permit_id) {
        setShowForm(false);
        await fetchPermits();
        // Auto-validate
        await validatePermit(data.permit_id, form.type, form.zone_id, form.issued_to);
      }
    } finally {
      setLoading(false);
    }
  }

  async function validatePermit(permitId: string, type: string, zoneId: string, issuedTo: string) {
    setValidating(permitId);
    setValidationResult(null);
    try {
      const res = await fetch("/api/permits/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permit_id: permitId, type, zone_id: zoneId, issued_to: issuedTo }),
      });
      const data = await res.json();
      if (data.result) {
        setValidationResult({ id: permitId, result: data.result });
        await fetchPermits();
      }
    } finally {
      setValidating(null);
    }
  }

  async function suspendPermit(permitId: string) {
    try {
      await fetch("/api/permits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permit_id: permitId, status: "SUSPENDED" }),
      });
      await fetchPermits();
    } catch { }
  }

  const VERDICT_CONFIG = {
    APPROVED: { icon: CheckCircle, color: "#16a34a", bg: "#dcfce7", label: "APPROVED" },
    BLOCKED: { icon: XCircle, color: "#dc2626", bg: "#fee2e2", label: "BLOCKED" },
    CONDITIONAL: { icon: AlertCircle, color: "#d97706", bg: "#fef9c3", label: "CONDITIONAL" },
    PENDING_AI: { icon: Loader2, color: "#6366f1", bg: "#eef2ff", label: "PENDING" },
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <div className="app-topbar">
          <div className="flex-1" style={{ minWidth: 0 }}>
            <h1 className="font-bold text-base leading-none" style={{ color: "var(--text-primary)" }}>Permit Intelligence</h1>
            <p className="text-xs hide-mobile" style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              AI-powered permit validation against live site conditions · OISD-116 compliant
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ flexShrink: 0 }}>
            <Plus size={15} />
            <span className="hide-mobile">New Permit Request</span>
            <span style={{ display: "none" }} className="show-mobile">New</span>
          </button>
        </div>

        <div className="app-content">
          {/* New Permit Form */}
          {showForm && (
            <div className="card p-6 mb-6 animate-fade-in border-2" style={{ borderColor: "var(--brand-blue-light)" }}>
              <h3 className="font-bold text-sm mb-4" style={{ color: "var(--text-primary)" }}>
                New Permit Request — AI Validation will run automatically
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                    Work Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as PermitType })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
                  >
                    {Object.entries(PERMIT_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                    Zone
                  </label>
                  <select
                    value={form.zone_id}
                    onChange={(e) => setForm({ ...form, zone_id: e.target.value as ZoneId })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
                  >
                    {ZONES.map((z) => (
                      <option key={z} value={z}>{z.replace("_", " ")} — {ZONE_NAMES[z].split("—")[1]?.trim()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                    Issued To (Worker)
                  </label>
                  <select
                    value={form.issued_to}
                    onChange={(e) => setForm({ ...form, issued_to: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
                  >
                    <option value="">— Select a worker —</option>
                    {workers.map((w) => (
                      <option key={w.worker_id} value={w.name}>
                        {w.name} · {w.role} ({w.zone_id.replace("_", " ")})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                    Valid From
                  </label>
                  <input
                    type="datetime-local"
                    value={form.valid_from}
                    onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                    Valid Until
                  </label>
                  <input
                    type="datetime-local"
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={submitPermit}
                    disabled={loading || !form.issued_to}
                    className="btn-primary w-full"
                    style={{ justifyContent: "center" }}
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                    Submit for AI Review
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    disabled={loading}
                    className="btn-ghost"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Validation Result Banner */}
          {validationResult && (
            <div
              className="card p-4 mb-6 animate-fade-in flex items-start gap-4"
              style={{
                borderLeft: `4px solid ${VERDICT_CONFIG[validationResult.result.verdict]?.color}`,
                background: VERDICT_CONFIG[validationResult.result.verdict]?.bg,
              }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm" style={{ color: VERDICT_CONFIG[validationResult.result.verdict]?.color }}>
                    AI Verdict: {validationResult.result.verdict}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{ background: "rgba(0,0,0,0.1)", color: VERDICT_CONFIG[validationResult.result.verdict]?.color }}>
                    {validationResult.result.referenced_standard}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>{validationResult.result.reason}</p>
                {validationResult.result.conditions_if_approved.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {validationResult.result.conditions_if_approved.map((c, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        <span className="text-yellow-600 mt-0.5">⚠</span> {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Permits Table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <ClipboardList size={14} style={{ color: "var(--text-muted)" }} />
                <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  All Permits
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                  {permits.length} records
                </span>
              </div>
            </div>

            {permits.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardList size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                <p className="font-medium text-sm" style={{ color: "var(--text-secondary)" }}>
                  No permits found
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Submit a new permit request to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--bg-elevated)" }}>
                      {["Permit ID", "Type", "Zone", "Issued To", "Valid Until", "AI Verdict", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold"
                          style={{ color: "var(--text-muted)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {permits.map((permit) => {
                      const verdict = permit.ai_verdict || permit.status;
                      const config = VERDICT_CONFIG[verdict as keyof typeof VERDICT_CONFIG];
                      const Icon = config?.icon || Clock;

                      return (
                        <tr key={permit.permit_id}
                          className="border-t hover:bg-slate-50 transition-colors"
                          style={{ borderColor: "var(--border)" }}>
                          <td className="px-4 py-3 text-mono text-xs font-medium" style={{ color: "var(--brand-blue)" }}>
                            {permit.permit_id}
                          </td>
                          <td className="px-4 py-3 text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                            {PERMIT_TYPE_LABELS[permit.type as PermitType] || permit.type}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                            {permit.zone_id?.replace("_", " ")}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                            {permit.issued_to || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-mono" style={{ color: "var(--text-muted)" }}>
                            {permit.valid_until ? formatDate(permit.valid_until) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {config ? (
                              <span
                                className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                                style={{ background: config.bg, color: config.color }}
                              >
                                <Icon size={11} className={permit.status === "PENDING_AI" ? "animate-spin" : ""} />
                                {config.label}
                              </span>
                            ) : (
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {permit.status === "PENDING_AI" && !permit.ai_verdict && (
                              <button
                                onClick={() => validatePermit(permit.permit_id, permit.type, permit.zone_id, permit.issued_to)}
                                disabled={!!validating}
                                className="text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                                style={{ background: "#eff6ff", color: "var(--brand-blue)" }}
                              >
                                {validating === permit.permit_id
                                  ? <Loader2 size={11} className="animate-spin" />
                                  : null}
                                {validating === permit.permit_id ? "Validating..." : "Run AI Check"}
                              </button>
                            )}
                            {permit.status === "ACTIVE" && (
                              <button
                                onClick={() => suspendPermit(permit.permit_id)}
                                className="text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                                style={{ background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}
                              >
                                ⏸ Suspend
                              </button>
                            )}
                            {permit.ai_reason && (
                              <div className="text-xs max-w-xs truncate mt-1" style={{ color: "var(--text-muted)" }}
                                title={permit.ai_reason}>
                                {permit.ai_reason.substring(0, 60)}…
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
