import { NextRequest } from "next/server";
import { ragQueryStream, getRetrievedSources } from "@/lib/agents/incidentRAG";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question) {
      return new Response(JSON.stringify({ error: "Question required" }), { status: 400 });
    }

    // Get sources first
    const sources = await getRetrievedSources(question);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send sources first as a metadata event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`)
        );

        // Stream the LLM answer
        const gen = ragQueryStream(question);
        for await (const token of gen) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`)
          );
        }

        // Done signal
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[Chat API]", e);
    return new Response(JSON.stringify({ error: "Chat failed" }), { status: 500 });
  }
}
