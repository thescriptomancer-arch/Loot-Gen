// functions/generate_loot.ts
import { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const body = await new Promise<any>((resolve, reject) => {
      let data=""; req.on("data", c => data+=c);
      req.on("end", () => resolve(data ? JSON.parse(data) : {}));
      req.on("error", reject);
    });

    // Expect: seed, tau, budget, rooms[], strict_dmg, item_specificity
    // For each room: derive type_weights if null (same logic as plan_inputs),
    // then run your existing Armor & Shields Steps 1–10 using the JSON data
    // now under /armor_shields/… (per your PRD).
    //
    // This file is a stub; plug in your generator here.

    const result = {
      seed: body.seed ?? "seed-placeholder",
      rooms: (body.rooms ?? []).map((r:any) => ({
        id: r.id,
        items: [],          // fill with generated items
        subtotal_gp: 0
      })),
      total_gp: 0,
      telemetry: {}
    };

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
  } catch (e:any) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: e.message ?? String(e) }));
  }
}
