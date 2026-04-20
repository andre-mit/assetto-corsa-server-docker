import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const CONTENT_DIR = path.join(process.cwd(), "game-content");

const s3 = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
});

async function uploadToS3(buffer: Buffer, key: string): Promise<string | null> {
  if (!process.env.S3_BUCKET_NAME) return null;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: "image/png",
        ACL: 'public-read'
      }),
    );

    return process.env.S3_PUBLIC_URL
      ? `${process.env.S3_PUBLIC_URL}/${key}`
      : `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[api/content/sync] Error uploading key ${key} to S3:`, error.message || error);
    return null;
  }
}

export async function POST() {
  try {
    const tracksDir = path.join(CONTENT_DIR, 'tracks');
    const carsDir = path.join(CONTENT_DIR, 'cars');

    let tracksCount = 0;
    let carsCount = 0;

    try {
      const trackFolders = await fs.readdir(tracksDir);
      for (const trackId of trackFolders) {
        const uiDir = path.join(tracksDir, trackId, 'ui');

        try {
          const uiStat = await fs.stat(uiDir);
          if (uiStat.isDirectory()) {
            const layouts = await fs.readdir(uiDir);
            for (const layoutId of layouts) {
              const isDefault = layoutId === 'ui_track.json';
              const layoutPath = isDefault ? uiDir : path.join(uiDir, layoutId);
              const jsonPath = path.join(layoutPath, 'ui_track.json');
              const previewPath = path.join(layoutPath, 'preview.png');

              try {
                const fileContent = await fs.readFile(jsonPath, 'utf-8');
                const data = JSON.parse(fileContent);
                const uniqueFolderId = isDefault ? trackId : `${trackId}_${layoutId}`;
                const trackCountry = data.country || null;

                let s3ImageUrl: string | null = null;
                try {
                  const imageBuffer = await fs.readFile(previewPath);
                  s3ImageUrl = await uploadToS3(imageBuffer, `official/tracks/${uniqueFolderId}/preview.png`);
                } catch (imgError) {
                  console.error(`[api/content/sync] Error reading preview for track ${trackId}:`, imgError);
                }

                await prisma.track.upsert({
                  where: { folderName: uniqueFolderId },
                  update: { name: data.name || uniqueFolderId, pitboxes: parseInt(data.pitboxes, 10) || 10, country: trackCountry, ...(s3ImageUrl && { s3ImageUrl }) },
                  create: { folderName: uniqueFolderId, name: data.name || uniqueFolderId, pitboxes: parseInt(data.pitboxes, 10) || 10, country: trackCountry, isMod: false, s3ImageUrl }
                });
                tracksCount++;
              } catch (e) {
                console.error(`[api/content/sync] Error reading ui_track.json for track ${trackId}:`, e);
              }
            }
          }
        } catch {
          await prisma.track.upsert({
            where: { folderName: trackId },
            update: { name: trackId },
            create: { folderName: trackId, name: trackId, pitboxes: 20, isMod: false }
          });
          tracksCount++;
        }
      }
    } catch {
      console.warn('Tracks directory not found, skipping.');
    }

    try {
      const carFolders = await fs.readdir(carsDir);
      for (const carId of carFolders) {
        const jsonPath = path.join(carsDir, carId, 'ui', 'ui_car.json');
        const badgePath = path.join(carsDir, carId, 'ui', 'badge.png');

        let carName = carId;
        let carBrand = 'Kunos';
        let carCountry: string | null = null;
        let s3ImageUrl: string | null = null;

        try {
          const fileContent = await fs.readFile(jsonPath, 'utf-8');
          const data = JSON.parse(fileContent);
          carName = data.name || carId;
          carBrand = data.brand || 'Kunos';
          carCountry = data.country || null;

          const skinsDir = path.join(carsDir, carId, 'skins');
          try {
            const skins = await fs.readdir(skinsDir);
            for (const skin of skins) {
              const skinPreview = path.join(skinsDir, skin, 'preview.jpg');
              try {
                const imgBuf = await fs.readFile(skinPreview);
                s3ImageUrl = await uploadToS3(imgBuf, `official/cars/${carId}/preview.jpg`);
                break;
              } catch (e: unknown) {
                console.error(`[api/content/sync] Error reading skin ${skin}:`, e);
              }
            }
          } catch (e: unknown) {
            console.error(`[api/content/sync] Error reading skins for car ${carId}:`, e);
          }
        } catch (e: unknown) {
          console.error(`[api/content/sync] Error reading car ${carId}:`, e);
        }

        let brandId: string | null = null;
        const existingBrand = await prisma.brand.findUnique({ where: { name: carBrand } });

        if (existingBrand) {
          brandId = existingBrand.id;
          if (!existingBrand.s3BadgeUrl) {
            try {
              const badgeBuf = await fs.readFile(badgePath);
              const badgeUrl = await uploadToS3(badgeBuf, `brands/${carBrand.replace(/[^a-zA-Z0-9]/g, '_')}/badge.png`);
              if (badgeUrl) {
                await prisma.brand.update({ where: { id: existingBrand.id }, data: { s3BadgeUrl: badgeUrl, country: carCountry } });
              }
            } catch { }
          }
        } else {
          let s3BadgeUrl: string | null = null;
          try {
            const badgeBuf = await fs.readFile(badgePath);
            s3BadgeUrl = await uploadToS3(badgeBuf, `brands/${carBrand.replace(/[^a-zA-Z0-9]/g, '_')}/badge.png`);
          } catch { }

          const newBrand = await prisma.brand.create({
            data: { name: carBrand, country: carCountry, s3BadgeUrl }
          });
          brandId = newBrand.id;
        }

        await prisma.car.upsert({
          where: { folderName: carId },
          update: { name: carName, brand: carBrand, brandId, ...(s3ImageUrl && { s3ImageUrl }) },
          create: { folderName: carId, name: carName, brand: carBrand, brandId, isMod: false, s3ImageUrl }
        });
        carsCount++;
      }
    } catch {
      console.warn('Cars directory not found, skipping.');
    }

    const successMessage = `Sync complete. ${tracksCount} track(s) and ${carsCount} car(s) registered.`;
    console.log(`[api/content/sync] ${successMessage}`);
    return NextResponse.json({
      success: true,
      message: successMessage
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error('[api/content/sync] Error during content sync:', error.message || error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}