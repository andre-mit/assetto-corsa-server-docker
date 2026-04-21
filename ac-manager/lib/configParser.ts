import fs from 'fs/promises';
import path from 'path';
import ini from 'ini';
import { AcEntryList, AcServerConfig } from '@/types/ac-server';

const CONFIG_DIR = process.env.CONFIG_DIR || path.join(process.cwd(), '/shared-config');

export async function readConfig(fileName: 'server_cfg.ini' | 'entry_list.ini') {
  try {
    const filePath = path.join(CONFIG_DIR, fileName);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return ini.parse(fileContent);
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Error reading ${fileName}:`, error.message || error);
    return null;
  }
}

export async function writeConfig(fileName: 'server_cfg.ini' | 'entry_list.ini', data: AcServerConfig | AcEntryList) {
  const filePath = path.join(CONFIG_DIR, fileName);
  const iniContent = ini.stringify(data);
  await fs.writeFile(filePath, iniContent, 'utf-8');
}

export async function generateEntryList(
  selectedCars: string[],
  maxClients: number,
  carSkins?: Record<string, string[]>
) {
  if (!selectedCars || selectedCars.length === 0) {
    throw new Error('At least one car is required to generate the entry list.');
  }

  const entryList: AcEntryList = {};
  const skinCounters: Record<string, number> = {};
  const lines: string[] = [];

  for (let i = 0; i < maxClients; i++) {
    const carModel = selectedCars[i % selectedCars.length];

    let skin = '';
    if (carSkins && carSkins[carModel] && carSkins[carModel].length > 0) {
      const skins = carSkins[carModel];
      const idx = skinCounters[carModel] || 0;
      skin = skins[idx % skins.length];
      skinCounters[carModel] = idx + 1;
    }

    entryList[`CAR_${i}`] = {
      MODEL: carModel,
      SKIN: skin,
      SPECTATOR_MODE: 0,
      DRIVERNAME: '',
      TEAM: '',
      GUID: '',
      BALLAST: 0,
      RESTRICTOR: 0
    };

    lines.push(`[CAR_${i}]`);
    lines.push(`MODEL=${carModel}`);
    lines.push(`SKIN=${skin}`);
    lines.push(`SPECTATOR_MODE=0`);
    lines.push(`DRIVERNAME=`);
    lines.push(`TEAM=`);
    lines.push(`GUID=`);
    lines.push(`BALLAST=0`);
    lines.push(`RESTRICTOR=0`);
    lines.push('');
  }

  const filePath = path.join(CONFIG_DIR, 'entry_list.ini');
  await fs.writeFile(filePath, lines.join('\n'), 'utf-8');

  return entryList;
}