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
  } catch (error) {
    console.error(`Error uploading key ${key} to S3:`, error);
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

                let s3ImageUrl: string | null = null;
                try {
                  const imageBuffer = await fs.readFile(previewPath);
                  s3ImageUrl = await uploadToS3(imageBuffer, `official/tracks/${uniqueFolderId}/preview.png`);
                } catch (imgError) { }

                await prisma.track.upsert({
                  where: { folderName: uniqueFolderId },
                  update: { name: data.name || uniqueFolderId, pitboxes: parseInt(data.pitboxes, 10) || 10, ...(s3ImageUrl && { s3ImageUrl }) },
                  create: { folderName: uniqueFolderId, name: data.name || uniqueFolderId, pitboxes: parseInt(data.pitboxes, 10) || 10, isMod: false, s3ImageUrl }
                });
                tracksCount++;
              } catch (e) { }
            }
          }
        } catch (e) {
          await prisma.track.upsert({
            where: { folderName: trackId },
            update: { name: trackId },
            create: { folderName: trackId, name: trackId, pitboxes: 20, isMod: false }
          });
          tracksCount++;
        }
      }
    } catch (error) {
      console.warn('Tracks directory not found, skipping.');
    }

    try {
      const carFolders = await fs.readdir(carsDir);
      for (const carId of carFolders) {
        const jsonPath = path.join(carsDir, carId, 'ui', 'ui_car.json');
        const badgePath = path.join(carsDir, carId, 'ui', 'badge.png');

        let carName = carId;
        let carBrand = 'Kunos';
        let s3ImageUrl: string | null = null;

        try {
          const fileContent = await fs.readFile(jsonPath, 'utf-8');
          const data = JSON.parse(fileContent);
          carName = data.name || carId;
          carBrand = data.brand || 'Kunos';

          try {
            const imageBuffer = await fs.readFile(badgePath);
            s3ImageUrl = await uploadToS3(imageBuffer, `official/cars/${carId}/badge.png`);
          } catch (imgError) { }
        } catch (e) {
        }

        await prisma.car.upsert({
          where: { folderName: carId },
          update: { name: carName, brand: carBrand, ...(s3ImageUrl && { s3ImageUrl }) },
          create: { folderName: carId, name: carName, brand: carBrand, isMod: false, s3ImageUrl: s3ImageUrl }
        });
        carsCount++;
      }
    } catch (error) {
      console.warn('Cars directory not found, skipping.');
    }

    return NextResponse.json({
      success: true,
      message: `Sync complete. ${tracksCount} track(s) and ${carsCount} car(s) registered.`
    });

  } catch (error: any) {
    console.error('Error during content sync:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}