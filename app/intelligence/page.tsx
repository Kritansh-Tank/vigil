"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/shared/Sidebar";
import { ChatMessage, DocumentSource } from "@/lib/types";
import { Brain, Send, Loader2, BookOpen, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { formatTimestamp } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

const SUGGESTED_QUESTIONS = [
  "What caused the Visakhapatnam Steel Plant explosion in 2025?",
  "What does OISD-116 Section 5.3 say about hot work permits near gas leaks?",
  "How should I handle a confined space entry when H2S exceeds 5 ppm?",
  "What are the SIMOPS requirements under OISD-116 Section 6.4?",
  "What are the DGFASLI reporting requirements after a fatality?",
  "What made the Jharkhand Tata Steel CO poisoning incident preventable?",
];

// ─── Lightweight markdown renderer ────────────────────────────────────────────
function parseInline(text: string): React.ReactNode[] {
  // Handle **bold** inline
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ fontWeight: 700 }}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuf: React.ReactNode[] = [];

  const flushList = () => {
    if (listBuf.length === 0) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} style={{ paddingLeft: 18, margin: "6px 0" }}>
        {listBuf}
      </ul>
    );
    listBuf = [];
  };

  lines.forEach((line, idx) => {
    const t = line.trim();
    if (/^[*+\-]\s/.test(t)) {
      // Bullet point
      listBuf.push(
        <li key={idx} style={{ marginBottom: 3, lineHeight: 1.55 }}>
          {parseInline(t.slice(2))}
        </li>
      );
    } else if (t === "") {
      flushList();
      // Blank line = small gap (don't double-stack <br>)
      if (nodes.length > 0) nodes.push(<div key={`gap-${idx}`} style={{ height: 6 }} />);
    } else {
      flushList();
      nodes.push(
        <p key={idx} style={{ margin: "4px 0", lineHeight: 1.6 }}>
          {parseInline(t)}
        </p>
      );
    }
  });
  flushList();
  return <>{nodes}</>;
}

export default function IntelligencePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(question: string) {
    if (!question.trim() || streaming) return;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };

    const aiMsgId = uuidv4();
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      sources: [],
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.type === "sources") {
              setMessages((prev) =>
                prev.map((m) => (m.id === aiMsgId ? { ...m, sources: payload.sources } : m))
              );
            } else if (payload.type === "token") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId ? { ...m, content: m.content + payload.content } : m
                )
              );
            }
          } catch { }
        }
      }
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, content: "An error occurred. Please try again." }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }

  function toggleSources(msgId: string) {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      next.has(msgId) ? next.delete(msgId) : next.add(msgId);
      return next;
    });
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main flex flex-col" style={{ height: "100vh" }}>
        <div className="app-topbar">
          <div className="flex items-center gap-3 flex-1" style={{ minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <h1 className="font-bold text-base leading-none" style={{ color: "var(--text-primary)" }}>Incident Intelligence</h1>
              <p className="text-xs mt-0.5 hide-mobile" style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                RAG · 10 incident records · 12 OISD/Factory Act documents
              </p>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "24px 24px 0" }}>
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8 mt-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "#eff6ff", border: "2px solid #bfdbfe" }}>
                  <Brain size={24} style={{ color: "var(--brand-blue)" }} />
                </div>
                <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                  Incident Intelligence Agent
                </h2>
                <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                  Ask about past industrial incidents, OISD regulatory requirements, or compound risk patterns.
                  All answers are grounded in the VIGIL knowledge base.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="card p-3 text-left hover:shadow-md transition-all hover:border-blue-200"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <MessageSquare size={12} className="mb-1.5" style={{ color: "var(--brand-blue-light)" }} />
                    <p className="text-xs leading-snug" style={{ color: "var(--text-primary)" }}>{q}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-4 pb-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div style={{ maxWidth: "85%" }}>
                  {msg.role === "user" ? (
                    <div className="chat-message-user text-sm">{msg.content}</div>
                  ) : (
                    <div>
                      <div className="chat-message-ai text-sm">
                        {msg.content
                          ? <div style={{ lineHeight: 1.6 }}>{renderMarkdown(msg.content)}</div>
                          : (streaming && <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />)
                        }
                        {msg.content && (
                          <div className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                            {formatTimestamp(msg.timestamp)}
                          </div>
                        )}
                      </div>

                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleSources(msg.id)}
                            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                            style={{ background: "#eff6ff", color: "var(--brand-blue)" }}
                          >
                            <BookOpen size={11} />
                            {msg.sources.length} Source{msg.sources.length !== 1 ? "s" : ""}
                            {expandedSources.has(msg.id)
                              ? <ChevronUp size={11} />
                              : <ChevronDown size={11} />}
                          </button>

                          {expandedSources.has(msg.id) && (
                            <div className="mt-2 space-y-2">
                              {msg.sources.map((s) => (
                                <div
                                  key={s.doc_id}
                                  className="card p-3"
                                  style={{ borderLeft: "3px solid var(--brand-blue-light)" }}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold" style={{ color: "var(--brand-blue)" }}>
                                      {s.standard}
                                    </span>
                                    {s.section && (
                                      <span className="text-xs px-1.5 py-0.5 rounded"
                                        style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                                        {s.section}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{s.title}</p>
                                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                    {s.excerpt}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="p-4" style={{ background: "transparent" }}>
          <div className="max-w-3xl mx-auto flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Ask about incidents, regulations, or compound risk patterns..."
              className="flex-1 px-4 py-3 rounded-xl border text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
              disabled={streaming}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className="btn-primary px-4"
            >
              {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
