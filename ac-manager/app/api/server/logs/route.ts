import { getContainerLogStream } from '@/lib/docker';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log("[api/server/logs] Starting log stream for AC container");
        const logStream = await getContainerLogStream();

        logStream.on('data', (chunk: Buffer) => {
          const rawText = chunk.slice(8).toString('utf-8');

          const cleanText = rawText.replace(/[^\x20-\x7E\n\r]/g, '');
          const lines = cleanText.split('\n');

          for (const line of lines) {
            if (line.trim()) {
              controller.enqueue(new TextEncoder().encode(`data: ${line}\n\n`));
            }
          }
        });

        logStream.on('end', () => controller.close());
        logStream.on('error', (err: unknown) => {
          const error = err as Error;
          console.error("[api/server/logs] Log stream error:", error.message || error);
          controller.error(error);
        });

      } catch (err: unknown) {
        const error = err as Error;
        console.error("[api/server/logs] Error initializing log stream:", error.message || error);
        controller.enqueue(new TextEncoder().encode(`data: Error fetching logs: ${error.message || "Internal error"}\n\n`));
        controller.close();
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