import fs from 'fs/promises';
import path from 'path';
import { CarUIData, TrackUIData } from '@/types/ac-server';

export interface NormalizedMod {
  type: 'car' | 'track';
  id: string;
  sourcePath: string;
  uiData: CarUIData & TrackUIData;
  previewImage: Buffer | null;   // skin preview for cars, track preview for tracks
  badgeImage: Buffer | null;     // brand badge.png (cars only)
}

async function findUIFiles(dir: string, fileList: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await findUIFiles(fullPath, fileList);
    } else {
      const fileName = entry.name.toLowerCase();
      if (fileName === 'ui_track.json' || fileName === 'ui_car.json') {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

function getModRoot(jsonPath: string): string {
  let currentPath = path.dirname(jsonPath);

  while (currentPath !== path.parse(currentPath).root) {
    const baseName = path.basename(currentPath).toLowerCase();
    if (baseName === 'ui') {
      return path.dirname(currentPath);
    }
    currentPath = path.dirname(currentPath);
  }
  throw new Error("Invalid structure: Folder 'ui' not found in the hierarchy.");
}

async function findFirstSkinPreview(modRoot: string): Promise<Buffer | null> {
  const skinsDir = path.join(modRoot, 'skins');
  try {
    const skins = await fs.readdir(skinsDir);
    for (const skin of skins) {
      const previewPath = path.join(skinsDir, skin, 'preview.jpg');
      try {
        return await fs.readFile(previewPath);
      } catch {
        console.log(`[modAnalyzer] Skin preview not found for ${skin}`);
      }
    }
  } catch {
    console.log(`[modAnalyzer] No skins directory found for ${modRoot}`);
  }
  return null;
}

export async function analyzeExtractedMod(extractedTempDir: string): Promise<NormalizedMod[]> {
  const uiFiles = await findUIFiles(extractedTempDir);
  const modsFound: NormalizedMod[] = [];

  const processedRoots = new Set<string>();

  for (const jsonPath of uiFiles) {
    try {
      const isTrack = jsonPath.toLowerCase().endsWith('ui_track.json');
      const modRoot = getModRoot(jsonPath);

      if (processedRoots.has(modRoot)) continue;
      processedRoots.add(modRoot);

      const modId = path.basename(modRoot);
      const uiContent = await fs.readFile(jsonPath, 'utf-8');
      const uiData = JSON.parse(uiContent) as CarUIData & TrackUIData;

      let previewBuffer: Buffer | null = null;
      let badgeBuffer: Buffer | null = null;

      if (isTrack) {
        try {
          const previewPath = path.join(path.dirname(jsonPath), 'preview.png');
          previewBuffer = await fs.readFile(previewPath);
        } catch { }
      } else {
        previewBuffer = await findFirstSkinPreview(modRoot);

        try {
          const badgePath = path.join(modRoot, 'ui', 'badge.png');
          badgeBuffer = await fs.readFile(badgePath);
        } catch { }
      }

      modsFound.push({
        type: isTrack ? 'track' : 'car',
        id: modId,
        sourcePath: modRoot,
        uiData,
        previewImage: previewBuffer,
        badgeImage: badgeBuffer,
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error(`[modAnalyzer] Error processing file ${jsonPath}:`, error.message || error);
    }
  }

  return modsFound;
}