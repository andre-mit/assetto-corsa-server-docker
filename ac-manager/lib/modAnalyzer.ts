import fs from 'fs/promises';
import path from 'path';
import { CarUIData, TrackUIData } from '@/types/ac-server';

export interface NormalizedMod {
  type: 'car' | 'track';
  id: string;
  sourcePath: string;
  uiData: CarUIData & TrackUIData; // Combined for easier access during analysis
  previewImage: Buffer | null;
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
      try {
        if (isTrack) {
          const previewPath = path.join(path.dirname(jsonPath), 'preview.png');
          previewBuffer = await fs.readFile(previewPath);
        } else {
          const badgePath = path.join(modRoot, 'ui', 'badge.png');
          previewBuffer = await fs.readFile(badgePath);
        }
      } catch (imgError) {
        console.warn(`[modAnalyzer] Image not found for mod ${modId}.`);
      }

      modsFound.push({
        type: isTrack ? 'track' : 'car',
        id: modId,
        sourcePath: modRoot,
        uiData: uiData,
        previewImage: previewBuffer
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error(`[modAnalyzer] Error processing file ${jsonPath}:`, error.message || error);
    }
  }

  return modsFound;
}