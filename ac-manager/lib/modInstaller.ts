import fs from 'fs/promises';
import path from 'path';
import extract from 'extract-zip';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { analyzeExtractedMod } from './modAnalyzer';
import prisma from './prisma';

const CONTENT_DIR = path.join(process.cwd(), 'game-content');
const TEMP_DIR = path.join(process.cwd(), 'tmp');

// Format the endpoint correctly (AWS SDK crashes if a host:port doesn't have http://)
let s3Endpoint = process.env.S3_ENDPOINT;
if (s3Endpoint && !s3Endpoint.startsWith('http://') && !s3Endpoint.startsWith('https://')) {
  s3Endpoint = `http://${s3Endpoint}`;
}

const s3 = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: s3Endpoint,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
  forcePathStyle: true, // Often required for local/MinIO setups
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

    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);

      console.log(`[modInstaller] Attempting native extraction (7z) for ${zipPath}`);
      await execFileAsync('7z', ['x', zipPath, '-y', `-o${extractPath}`]);
    } catch (unzipErr) {
      console.log(`[modInstaller] Native 7z extraction failed, falling back to extract-zip. Error:`, (unzipErr as Error).message);
      await extract(zipPath, { dir: extractPath });
    }

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

        try {
          await s3.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: mod.previewImage,
            ContentType: 'image/png',
            ACL: 'public-read'
          }));

          let baseUrl = process.env.S3_PUBLIC_URL;

          if (baseUrl) {
            // Automatically append the bucket name if it's missing (very common with MinIO)
            if (!baseUrl.endsWith(process.env.S3_BUCKET_NAME as string)) {
              baseUrl = baseUrl.endsWith('/')
                ? `${baseUrl}${process.env.S3_BUCKET_NAME}`
                : `${baseUrl}/${process.env.S3_BUCKET_NAME}`;
            }
            s3Url = `${baseUrl}/${s3Key}`;
          } else {
            s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
          }

        } catch (s3err) {
          console.warn(`[modInstaller] Failed to upload preview to S3 for ${mod.id}. Mod installation will continue. Error:`, s3err);
        }
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
            country: mod.uiData.country || null,
            s3ImageUrl: s3Url || undefined
          },
          create: {
            folderName: mod.id,
            name: mod.uiData.name || mod.id,
            pitboxes: pitboxes,
            country: mod.uiData.country || null,
            isMod: true,
            s3ImageUrl: s3Url
          }
        });
      } else if (mod.type === 'car') {
        let brandId: string | null = null;
        const brandName = mod.uiData.brand;

        if (brandName) {
          const existingBrand = await prisma.brand.findUnique({ where: { name: brandName } });

          if (existingBrand) {
            brandId = existingBrand.id;

            if (!existingBrand.s3BadgeUrl && mod.badgeImage && process.env.S3_BUCKET_NAME) {
              try {
                const badgeKey = `brands/${brandName.replace(/[^a-zA-Z0-9]/g, '_')}/badge.png`;
                await s3.send(new PutObjectCommand({
                  Bucket: process.env.S3_BUCKET_NAME,
                  Key: badgeKey,
                  Body: mod.badgeImage,
                  ContentType: 'image/png',
                  ACL: 'public-read'
                }));

                let baseUrl = process.env.S3_PUBLIC_URL;
                if (baseUrl) {
                  if (!baseUrl.endsWith(process.env.S3_BUCKET_NAME as string)) {
                    baseUrl = baseUrl.endsWith('/') ? `${baseUrl}${process.env.S3_BUCKET_NAME}` : `${baseUrl}/${process.env.S3_BUCKET_NAME}`;
                  }
                  await prisma.brand.update({ where: { id: existingBrand.id }, data: { s3BadgeUrl: `${baseUrl}/${badgeKey}` } });
                }
              } catch (e) { console.warn(`[modInstaller] Failed to upload badge for brand ${brandName}:`, e); }
            }
          } else {
            let s3BadgeUrl: string | null = null;

            if (mod.badgeImage && process.env.S3_BUCKET_NAME) {
              try {
                const badgeKey = `brands/${brandName.replace(/[^a-zA-Z0-9]/g, '_')}/badge.png`;
                await s3.send(new PutObjectCommand({
                  Bucket: process.env.S3_BUCKET_NAME,
                  Key: badgeKey,
                  Body: mod.badgeImage,
                  ContentType: 'image/png',
                  ACL: 'public-read'
                }));

                let baseUrl = process.env.S3_PUBLIC_URL;
                if (baseUrl) {
                  if (!baseUrl.endsWith(process.env.S3_BUCKET_NAME as string)) {
                    baseUrl = baseUrl.endsWith('/') ? `${baseUrl}${process.env.S3_BUCKET_NAME}` : `${baseUrl}/${process.env.S3_BUCKET_NAME}`;
                  }
                  s3BadgeUrl = `${baseUrl}/${badgeKey}`;
                }
              } catch (e) { console.warn(`[modInstaller] Failed to upload badge for brand ${brandName}:`, e); }
            }

            const newBrand = await prisma.brand.create({
              data: {
                name: brandName,
                country: mod.uiData.country || null,
                s3BadgeUrl,
              }
            });
            brandId = newBrand.id;
          }
        }

        await prisma.car.upsert({
          where: { folderName: mod.id },
          update: {
            name: mod.uiData.name || mod.id,
            brand: brandName || null,
            brandId: brandId,
            s3ImageUrl: s3Url || undefined
          },
          create: {
            folderName: mod.id,
            name: mod.uiData.name || mod.id,
            brand: brandName || null,
            brandId: brandId,
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
