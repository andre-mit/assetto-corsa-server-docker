import { getContainerLogStream } from '@/lib/docker';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const logStream = await getContainerLogStream('ac-server-instance');

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
        logStream.on('error', (err: any) => controller.error(err));

      } catch (error: any) {
        controller.enqueue(new TextEncoder().encode(`data: Error fetching logs: ${error.message}\n\n`));
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