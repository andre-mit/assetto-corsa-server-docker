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
  const { spawn } = await import('child_process');

  return new Promise((resolve, reject) => {
    const child = spawn('curl', ['-L', '-#', '-o', dest, url]);

    let lastProgress = -1;

    child.stderr.on('data', (data: Buffer) => {
      const output = data.toString();
      const match = output.match(/(\d+\.?\d*)%/);
      if (match && match[1]) {
        const p = Math.round(parseFloat(match[1]));
        if (p > lastProgress) {
          lastProgress = p;
          setImmediate(() => onProgress(p));
        }
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        fsSync.rmSync(dest, { force: true });
        reject(new Error(`curl command exited with code ${code}. Failed to download.`));
      }
    });

    child.on('error', (err) => {
      fsSync.rmSync(dest, { force: true });
      reject(err);
    });
  });
}
