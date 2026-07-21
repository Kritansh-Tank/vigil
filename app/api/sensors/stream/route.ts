import { NextRequest } from "next/server";
import { generateAndStoreTick, getLatestReadings } from "@/lib/simulation/sensorSimulator";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Guard flag — set to true as soon as the connection closes
      let closed = false;

      function safeEnqueue(data: string) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closed = true;
        }
      }

      function safeClose() {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch {}
      }

      // Cleanup: called on client disconnect OR error
      function cleanup() {
        closed = true;
        clearInterval(interval);
        safeClose();
      }

      // Initial readings
      try {
        const readings = await getLatestReadings();
        safeEnqueue(`data: ${JSON.stringify({ type: "readings", payload: readings })}\n\n`);
      } catch (e) {
        console.error("[SSE] Initial read error:", e);
      }

      // Tick every 3 s
      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return; }
        try {
          const readings = await generateAndStoreTick();
          safeEnqueue(`data: ${JSON.stringify({ type: "readings", payload: readings })}\n\n`);
        } catch (e) {
          console.error("[SSE] Tick error:", e);
          cleanup();
        }
      }, 3000);

      // Client disconnect
      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
