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
    console.log("[api/csp] CSP configuration read successful");
    return NextResponse.json({ cspCfg: parsedData });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[api/csp] GET error:", error.message || error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cspCfg } = body;

    const yamlString = YAML.stringify(cspCfg);

    await fs.writeFile(configPath, yamlString);

    console.log("[api/csp] CSP configuration updated successful");
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[api/csp] POST error:", error.message || error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}