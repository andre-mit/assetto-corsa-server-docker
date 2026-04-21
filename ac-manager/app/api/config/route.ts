import { NextResponse } from 'next/server';
import { generateEntryList, readConfig, writeConfig } from '@/lib/configParser';

export async function GET() {
  try {
    const serverCfg = await readConfig('server_cfg.ini');
    console.log("[api/config] Configuration read successful");
    return NextResponse.json({ serverCfg });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[api/config] GET error:", error.message || error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { serverCfg, carSkins } = body;

    if (!serverCfg.WEATHER_0) {
      serverCfg.WEATHER_0 = {
        GRAPHICS: "3_clear",
        BASE_TEMPERATURE_AMBIENT: 22,
        BASE_TEMPERATURE_ROAD: 6,
        VARIATION_AMBIENT: 2,
        VARIATION_ROAD: 2
      };
      console.log("Aviso: Clima não detetado. Injetado WEATHER_0 padrão (Céu Limpo) para evitar crash.");
    }

    const hasPractice = serverCfg.PRACTICE?.IS_OPEN == 1 || serverCfg.PRACTICE?.IS_OPEN === true;
    const hasQualify = serverCfg.QUALIFY?.IS_OPEN == 1 || serverCfg.QUALIFY?.IS_OPEN === true;
    const hasRace = serverCfg.RACE?.IS_OPEN == 1 || serverCfg.RACE?.IS_OPEN === true;

    if (!hasPractice && !hasQualify && !hasRace) {
      serverCfg.PRACTICE = {
        NAME: "Practice",
        TIME: 10,
        IS_OPEN: 1,
        WAIT_TIME: 60
      };
      console.log("Aviso: Nenhuma sessão ativada. Injetado Treino de 10 min para evitar crash.");
    }

    await writeConfig('server_cfg.ini', serverCfg);

    const carsArray = serverCfg.SERVER.CARS.split(';').filter(Boolean);
    const maxClients = parseInt(serverCfg.SERVER.MAX_CLIENTS, 10);
    
    await generateEntryList(carsArray, maxClients, carSkins);

    console.log("[api/config] Configuration saved and entry_list generated");
    return NextResponse.json({ success: true, message: 'Files generated successfully.' });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[api/config] POST error:", error.message || error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}