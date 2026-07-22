import { NextRequest, NextResponse } from "next/server";
import { setScenario, getScenarioState } from "@/lib/simulation/sensorSimulator";

export async function POST(req: NextRequest) {
  try {
    const { scenario } = await req.json();
    const valid = ["NORMAL", "SCENARIO_1", "SCENARIO_2", "SCENARIO_3"];
    if (!valid.includes(scenario)) {
      return NextResponse.json({ error: "Invalid scenario" }, { status: 400 });
    }
    await setScenario(scenario);
    return NextResponse.json({ success: true, state: await getScenarioState() });
  } catch (e) {
    return NextResponse.json({ error: "Failed to set scenario" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(await getScenarioState());
}

