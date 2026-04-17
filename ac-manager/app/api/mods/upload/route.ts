import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { analyzeExtractedMod } from '@/lib/modAnalyzer';

import prisma from '@/lib/prisma';

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

export async function POST(request: Request) {
  const extractPath = path.join(TEMP_DIR, `extracted_${Date.now()}`);
  const tempZipPath = path.join(TEMP_DIR, `upload_${Date.now()}.zip`);

  try {
    const formData = await request.formData();
    const file = formData.get('modFile') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    await fs.mkdir(TEMP_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempZipPath, buffer);
    const zip = new AdmZip(tempZipPath);
    zip.extractAllTo(extractPath, true);

    const mods = await analyzeExtractedMod(extractPath);

    if (mods.length === 0) {
      await fs.rm(TEMP_DIR, { recursive: true, force: true });
      return NextResponse.json({ error: 'No valid Assetto Corsa mod found in this ZIP.' }, { status: 400 });
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
        }));

        s3Url = process.env.S3_PUBLIC_URL
          ? `${process.env.S3_PUBLIC_URL}/${s3Key}`
          : `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
      }

      if (mod.type === 'track') {
        const pitboxes = parseInt(mod.uiData.pitboxes, 10) || 0;
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

    await fs.rm(TEMP_DIR, { recursive: true, force: true });

    return NextResponse.json({
      success: true,
      message: `${mods.length} mod(s) installed and synced successfully.`,
      installedMods: mods.map(m => ({ id: m.id, type: m.type, name: m.uiData.name }))
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error during mod upload/install:', error);

    try {
      await fs.rm(TEMP_DIR, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
    }

    return NextResponse.json({
      error: 'Internal error while processing the file.',
      details: errorMessage
    }, { status: 500 });
  }
}