import Groq from "groq-sdk";

// llama-3.1-8b-instant: 131,072 TPM — highest free-tier limit on Groq
const FAST_MODEL = "llama-3.1-8b-instant";
import { getDb } from "@/lib/db/mongodb";
import { DocumentSource } from "@/lib/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const RAG_SYSTEM_PROMPT = `You are VIGIL's Incident Intelligence Agent — an expert industrial safety analyst with deep knowledge of Indian heavy industry incidents, OISD standards, and the Factories Act 1948.

Answer questions using ONLY the provided context documents (incident records and regulatory text). 
- Always cite your sources by mentioning the document ID or standard name
- If the context doesn't contain relevant information, say so clearly rather than fabricating
- Be specific, actionable, and technically precise
- Focus on prevention patterns and regulatory requirements
- Format your response clearly with key points highlighted

Context from VIGIL knowledge base:`;

// Simple cosine similarity for local embedding comparison
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

// Keyword-based retrieval (fallback when embeddings not yet seeded)
async function keywordSearch(query: string, limit = 5): Promise<any[]> {
  const db = await getDb();
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  // Search incidents
  const incidents = await db.collection("incidents").find({}).toArray();
  const regulations = await db.collection("regulations").find({}).toArray();

  const all = [...incidents, ...regulations];

  // Score by keyword overlap
  const scored = all.map((doc) => {
    const text = (doc.content + " " + (doc.title || "") + " " + (doc.standard || "")).toLowerCase();
    const score = queryWords.reduce((s, w) => s + (text.includes(w) ? 1 : 0), 0);
    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.doc);
}

export async function ragQuery(
  question: string
): Promise<{ answer: string; sources: DocumentSource[] }> {
  // Retrieve relevant documents
  const docs = await keywordSearch(question, 5);

  if (docs.length === 0) {
    return {
      answer:
        "I could not find relevant incident records or regulatory information for your query in the VIGIL knowledge base. Please try rephrasing your question or check if the data has been seeded.",
      sources: [],
    };
  }

  // Build context
  const context = docs
    .map(
      (doc, i) =>
        `[Source ${i + 1}: ${doc.doc_id || doc.incident_id || "Unknown"}]\n${doc.content}`
    )
    .join("\n\n---\n\n");

  const sources: DocumentSource[] = docs.map((doc) => ({
    doc_id: doc.doc_id || doc.incident_id || "",
    standard: doc.standard || "Incident Record",
    section: doc.section || doc.type || "",
    title: doc.title || `${doc.facility} — ${doc.type}` || "",
    excerpt: (doc.content || "").substring(0, 200) + "...",
  }));

  const userMessage = `${RAG_SYSTEM_PROMPT}

${context}

---

Question: ${question}`;

  try {
    const response = await groq.chat.completions.create({
      model: FAST_MODEL,
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.2,
      max_tokens: 800,
      stream: false,
    });

    return {
      answer: response.choices[0].message.content || "Unable to generate response.",
      sources,
    };
  } catch (e) {
    console.error("[RAG Agent] LLM error:", e);
    return {
      answer: "The intelligence engine is temporarily unavailable. The following source documents were retrieved and may contain relevant information:",
      sources,
    };
  }
}

export async function* ragQueryStream(question: string): AsyncGenerator<string> {
  const docs = await keywordSearch(question, 5);

  if (docs.length === 0) {
    yield "I could not find relevant incident records or regulatory information for your query in the VIGIL knowledge base.";
    return;
  }

  const context = docs
    .map((doc, i) => `[Source ${i + 1}: ${doc.doc_id || doc.incident_id}]\n${doc.content}`)
    .join("\n\n---\n\n");

  const userMessage = `${RAG_SYSTEM_PROMPT}

${context}

---

Question: ${question}`;

  try {
    const stream = await groq.chat.completions.create({
      model: FAST_MODEL,
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.2,
      max_tokens: 800,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  } catch (e) {
    yield "The intelligence engine encountered an error. Please try again.";
  }
}

export async function getRetrievedSources(question: string): Promise<DocumentSource[]> {
  const docs = await keywordSearch(question, 5);
  return docs.map((doc) => ({
    doc_id: doc.doc_id || doc.incident_id || "",
    standard: doc.standard || "Incident Record",
    section: doc.section || doc.type || "",
    title: doc.title || `${doc.facility} — ${doc.type}` || "",
    excerpt: (doc.content || "").substring(0, 250) + "...",
  }));
}
