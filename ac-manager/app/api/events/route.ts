import eventBus, { JobUpdateEvent, ServerStatusEvent } from "@/lib/eventBus";
import { getContainerStatus } from "@/lib/docker";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (isClosed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Client disconnected
        }
      };

      // --- Listeners for EventBus ---
      const onJobUpdate = (data: JobUpdateEvent) => send("job_update", data);
      const onServerStatus = (data: ServerStatusEvent) =>
        send("server_status", data);

      eventBus.on("job_update", onJobUpdate);
      eventBus.on("server_status", onServerStatus);

      // --- Send initial server status immediately ---
      getContainerStatus()
        .then((state) => {
          const status = state?.Status === "running" ? "running" : "stopped";
          send("server_status", { status });
        })
        .catch(() => {
          send("server_status", { status: "stopped" });
        });

      // --- Periodic server status check (every 10s) ---
      const statusInterval = setInterval(async () => {
        try {
          const state = await getContainerStatus();
          const status = state?.Status === "running" ? "running" : "stopped";
          send("server_status", { status });
        } catch {
          send("server_status", { status: "stopped" });
        }
      }, 10_000);

      // --- Heartbeat to keep connection alive (every 30s) ---
      const heartbeatInterval = setInterval(() => {
        send("ping", { timestamp: Date.now() });
      }, 30_000);

      // --- Cleanup on disconnect ---
      const cleanup = () => {
        isClosed = true;
        clearInterval(statusInterval);
        clearInterval(heartbeatInterval);
        eventBus.off("job_update", onJobUpdate);
        eventBus.off("server_status", onServerStatus);
      };

      // Store cleanup for cancel()
      (controller as any).__cleanup = cleanup;
    },
    cancel() {
      const cleanup = (this as any)?.__cleanup;
      if (typeof cleanup === "function") cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
