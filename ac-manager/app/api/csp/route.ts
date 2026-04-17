import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';

const configPath = path.join(process.cwd(), 'cfg', 'extra_cfg.yml');

const defaultCSPConfig = {
  PITS: {
    ALLOW_TO_DRIVE_BACK: false,
    TELEPORT_TO_PITS_ON_WRONG_WAY: true,
  },
  WEATHER: {
    ENABLE_DYNAMIC: true,
    SCRIPT: 'sol',
  },
  RAIN: {
    ENABLE: true,
    INTENSITY: 0.5,
    WETNESS: 0.5,
  },
  TIME: {
    MULTIPLIER: 1,
  }
};

export async function GET() {
  try {
    let fileContent = '';
    try {
      fileContent = await fs.readFile(configPath, 'utf-8');
    } catch (e) {
      return NextResponse.json({ cspCfg: defaultCSPConfig });
    }

    const parsedData = YAML.parse(fileContent) || defaultCSPConfig;
    return NextResponse.json({ cspCfg: parsedData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cspCfg } = body;

    const yamlString = YAML.stringify(cspCfg);

    await fs.writeFile(configPath, yamlString);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}