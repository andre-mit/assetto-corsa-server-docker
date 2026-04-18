import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { analyzeExtractedMod, NormalizedMod } from './modAnalyzer';
import prisma from './prisma';

const CONTENT_DIR = path.join(process.cwd(), 'game-content');
const TEMP_DIR = path.join(process.cwd(), 'tmp');

const s3 = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
});

export interface ModInstallationResult {
  success: boolean;
  message: string;
  installedMods: Array<{ id: string; type: string; name: string }>;
}

export async function installModFromZip(zipPath: string): Promise<ModInstallationResult> {
  const extractPath = path.join(TEMP_DIR, `extracted_${Date.now()}`);

  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    const mods = await analyzeExtractedMod(extractPath);

    if (mods.length === 0) {
      await cleanup(extractPath);
      throw new Error('No valid Assetto Corsa mod found in this ZIP.');
    }

    for (const mod of mods) {
      const targetBaseDir = path.join(CONTENT_DIR, `${mod.type}s`);
      const targetDir = path.join(targetBaseDir, mod.id);
      
      await fs.mkdir(targetBaseDir, { recursive: true });
      await fs.cp(mod.sourcePath, targetDir, { recursive: true, force: true });

      let s3Url: string | null = null;
      if (mod.previewImage && process.env.S3_BUCKET_NAME) {
        const s3Key = `mods/${mod.type}s/${mod.id}/preview.png`;

        await s3.send(new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: s3Key,
          Body: mod.previewImage,
          ContentType: 'image/png',
          ACL: 'public-read'
        }));

        s3Url = process.env.S3_PUBLIC_URL
          ? `${process.env.S3_PUBLIC_URL}/${s3Key}`
          : `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
      }

      if (mod.type === 'track') {
        const pitboxes = typeof mod.uiData.pitboxes === 'string' 
          ? parseInt(mod.uiData.pitboxes, 10) 
          : (mod.uiData.pitboxes || 0);
          
        await prisma.track.upsert({
          where: { folderName: mod.id },
          update: {
            name: mod.uiData.name || mod.id,
            pitboxes: pitboxes,
            s3ImageUrl: s3Url || undefined
          },
          create: {
            folderName: mod.id,
            name: mod.uiData.name || mod.id,
            pitboxes: pitboxes,
            isMod: true,
            s3ImageUrl: s3Url
          }
        });
      } else if (mod.type === 'car') {
        await prisma.car.upsert({
          where: { folderName: mod.id },
          update: {
            name: mod.uiData.name || mod.id,
            brand: mod.uiData.brand,
            s3ImageUrl: s3Url || undefined
          },
          create: {
            folderName: mod.id,
            name: mod.uiData.name || mod.id,
            brand: mod.uiData.brand,
            isMod: true,
            s3ImageUrl: s3Url
          }
        });
      }
    }

    await cleanup(extractPath);

    return {
      success: true,
      message: `${mods.length} mod(s) installed and synced successfully.`,
      installedMods: mods.map(m => ({ id: m.id, type: m.type, name: m.uiData.name || m.id }))
    };

  } catch (err: unknown) {
    await cleanup(extractPath);
    const error = err as Error;
    console.error('[modInstaller] Installation error:', error.message || error);
    throw error;
  }
}

async function cleanup(pathToRemove: string) {
  try {
    await fs.rm(pathToRemove, { recursive: true, force: true });
  } catch (e) {
    console.error('[modInstaller] Cleanup error:', e);
  }
}
