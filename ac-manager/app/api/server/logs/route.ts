import { getContainerLogStream } from '@/lib/docker';

export const dynamic = 'force-dynamic';

export async function GET() {
  let logStream: any;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log("[api/server/logs] Starting log stream for AC container");
        logStream = await getContainerLogStream();

        logStream.on('data', (chunk: Buffer) => {
          const rawText = chunk.slice(8).toString('utf-8');

          const cleanText = rawText.replace(/[^\x20-\x7E\n\r]/g, '');
          const lines = cleanText.split('\n');

          for (const line of lines) {
            if (line.trim()) {
              try {
                controller.enqueue(new TextEncoder().encode(`data: ${line}\n\n`));
              } catch (e: unknown) {
                console.error("[api/server/logs] Error enqueuing log line:", e);
              }
            }
          }
        });

        logStream.on('end', () => {
          console.log("[api/server/logs] Docker stream ended");
          try { controller.close(); } catch (e: unknown) { }
        });

        logStream.on('error', (err: unknown) => {
          const error = err as Error;
          console.error("[api/server/logs] Log stream error:", error.message || error);
          try { controller.error(error); } catch (e: unknown) {
            console.error("[api/server/logs] Error closing log stream:", e);
          }
        });
      } catch (err: unknown) {
        const error = err as Error;
        console.error("[api/server/logs] Error initializing log stream:", error.message || error);
        controller.enqueue(new TextEncoder().encode(`data: Error fetching logs: ${error.message || "Internal error"}\n\n`));
        controller.close();
      }
    },
    cancel() {
      console.log("[api/server/logs] Client disconnected, destroying Docker stream");
      if (logStream && typeof logStream.destroy === 'function') {
        logStream.destroy();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}