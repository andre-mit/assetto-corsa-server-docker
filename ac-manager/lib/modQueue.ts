import prisma from "./prisma";
import { installModFromZip } from "./modInstaller";
import fs from "fs/promises";
import fsSync from "fs";
import https from "https";
import path from "path";

const CONCURRENCY_LIMIT = 2; // User requested 2-3
const activeJobs = new Set<string>();

export async function triggerQueue() {
  const pendingJobs = await prisma.modJob.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });

  for (const job of pendingJobs) {
    if (activeJobs.size >= CONCURRENCY_LIMIT) break;
    if (activeJobs.has(job.id)) continue;

    processJob(job.id);
  }
}

async function processJob(jobId: string) {
  activeJobs.add(jobId);
  let localPath = "";

  try {
    const job = await prisma.modJob.findUnique({ where: { id: jobId } });
    if (!job) return;

    console.log(`[modQueue] Starting job ${jobId} (type: ${job.type})`);


    if (job.type === "DOWNLOAD") {
      await prisma.modJob.update({
        where: { id: jobId },
        data: { status: "DOWNLOADING", progress: 0 },
      });

      const TEMP_DIR = path.join(process.cwd(), "tmp");
      await fs.mkdir(TEMP_DIR, { recursive: true });
      localPath = path.join(TEMP_DIR, `download_${jobId}.zip`);

      await downloadFile(job.target!, localPath, (progress) => {
        prisma.modJob.update({
          where: { id: jobId },
          data: { progress },
        }).catch(() => { });
      });
    } else {
      // UPLOAD - path is already in target
      localPath = job.target!;
    }

    await prisma.modJob.update({
      where: { id: jobId },
      data: { status: "EXTRACTING", progress: 0 },
    });

    const result = await installModFromZip(localPath);

    await prisma.modJob.update({
      where: { id: jobId },
      data: {
        status: "SUCCESS",
        progress: 100,
        result: result as any,
      },
    });

    console.log(`[modQueue] Job ${jobId} completed successfully`);
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[modQueue] Job ${jobId} failed:`, error.message || error);
    await prisma.modJob.update({
      where: { id: jobId },
      data: { status: "FAILED", error: error.message || "Unknown error" },
    });
  } finally {
    // Ensure cleanup of the local temp file, whether success or failure
    if (localPath) {
      await fs.rm(localPath, { force: true }).catch(() => { });
    }

    activeJobs.delete(jobId);
    triggerQueue(); // Check for next pending job
  }
}

async function downloadFile(url: string, dest: string, onProgress: (p: number) => void): Promise<void> {
  try {
    const response = await fetch(url, { redirect: 'follow' });
    
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status} ${response.statusText}`);
    }

    const totalSize = parseInt(response.headers.get('content-length') ?? '0', 10);
    let downloaded = 0;

    const fileStream = fsSync.createWriteStream(dest);

    if (!response.body) {
      throw new Error('Response body is empty');
    }

    // Use web streams reader
    const reader = response.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      downloaded += value.length;
      if (totalSize > 0) {
        const p = Math.round((downloaded / totalSize) * 100);
        onProgress(p);
      }
      
      fileStream.write(value);
    }
    
    fileStream.end();

    await new Promise<void>((resolve, reject) => {
      fileStream.on('finish', () => resolve());
      fileStream.on('error', (err) => reject(err));
    });

  } catch (err) {
    fsSync.rmSync(dest, { force: true });
    throw err;
  }
}
