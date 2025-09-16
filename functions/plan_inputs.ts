// functions/plan_inputs.ts
import { IncomingMessage, ServerResponse } from "http";

const RAW = "https://raw.githubusercontent.com/thescriptomancer-arch/Loot-Gen/refs/heads/main";

type TagAliases = Record<string,string[]>;
type Purpose = { id: string; name: string; tags?: string[] };
type TypeWeightsByPurpose = Record<string, Record<string, number>>;
type BudgetProfiles = { rising: number[]; flat: number[]; treasure_room: number[] };
type ContainerTemplate = { type: string; tags?: string[] };

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${RAW}/${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random()*16)|0, v = c==="x"?r:(r&0x3)|0x8;
    return v.toString(16);
  });
}

function clamp(n:number,min:number,max:number){ return Math.max(min, Math.min(max, n)); }

function extractTags(scenario: string, aliases: TagAliases): string[] {
  const s = scenario.toLowerCase();
  const tags = new Set<string>();
  for (const [tag, keys] of Object.entries(aliases)) {
    if (keys.some(k => s.includes(k))) tags.add(tag);
  }
  return Array.from(tags);
}

function normalize<K extends string>(w: Record<K, number> | null | undefined): Record<K, number> | null {
  if (!w) return null;
  const sum = Object.values(w).reduce((a,b)=>a+b,0);
  if (sum <= 0) return null;
  const out: any = {};
  for (const [k,v] of Object.entries(w)) out[k] = Math.round((v/sum)*100);
  const fix = 100 - Object.values(out).reduce((a,b)=>a+b,0);
  const firstKey = Object.keys(out)[0];
  if (firstKey) out[firstKey] += fix;
  return out;
}

function similarity(aTokens: string[], bTokens: string[]) {
  const A = new Set(aTokens), B = new Set(bTokens);
  const inter = [...A].filter(x=>B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union ? inter/union : 0;
}

function tokens(name?: string, tags?: string[]) {
  const base = (name ?? "").toLowerCase().split(/[^a-z]+/).filter(Boolean);
  return [...new Set([...(tags ?? []), ...base])];
}

function topK<T>(arr: T[], k: number, key: (t:T)=>number) {
  return [...arr].sort((a,b)=> key(b)-key(a)).slice(0, k);
}

function addScaled(dst: Record<string,number>, src: Record<string,number>, scale:number){
  for (const [k,v] of Object.entries(src)) dst[k] = (dst[k] ?? 0) + v*scale;
  return dst;
}

function scaleToSum(vec: number[], target: number){
  const sum = vec.reduce((a,b)=>a+b,0) || 1;
  return vec.map(v => (v/sum)*target);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const body = await new Promise<any>((resolve, reject) => {
      let data=""; req.on("data", c => data+=c);
      req.on("end", () => resolve(data ? JSON.parse(data) : {}));
      req.on("error", reject);
    });

    const seed = body.seed ?? uuid();
    const tau = clamp(body.tau ?? 1.0, 0.6, 1.4);

    // Load catalogs
    const [purposes, weightsByPurpose, containers, profiles, aliases] = await Promise.all([
      fetchJSON<Purpose[]>("planner/room_purposes.json"),
      fetchJSON<TypeWeightsByPurpose>("planner/type_weights_by_purpose.json"),
      fetchJSON<ContainerTemplate[]>("planner/container_templates.json"),
      fetchJSON<BudgetProfiles>("planner/budget_profiles.json"),
      fetchJSON<TagAliases>("planner/tag_aliases.json"),
    ]);

    // 1) tags
    const tags = extractTags(String(body.scenario ?? ""), aliases);

    // 2) propose rooms (simple deterministic starter)
    const proposed = [
      { id: "room_1", name: "Entrance", purpose: { kind:"catalog", id:"entry" } as const },
      { id: "room_2", name: "Scribe’s Vault", purpose: { kind:"catalog", id:"archives" } as const },
      { id: "room_3", name: "Bone Gallery", purpose: { kind:"custom", name:"Bone Gallery", tags:["crypt","undead","reliquary"] } as const },
    ];

    // 3) derive weights + containers
    const rooms = proposed.map((r, idx) => {
      let type_weights: Record<string,number> | null = null;

      if (r.purpose.kind === "catalog") {
        type_weights = normalize(weightsByPurpose[r.purpose.id] ?? null);
      } else {
        // blend top-3 similar catalog purposes
        const scored = purposes.map(p => ({
          id: p.id,
          score: similarity(tokens(p.name, p.tags), tokens((r.purpose as any).name, (r.purpose as any).tags))
        }));
        const top = topK(scored, 3, s => s.score);
        let blended: Record<string,number> = {};
        for (const t of top) addScaled(blended, weightsByPurpose[t.id] ?? {}, t.score || 0);
        type_weights = normalize(blended);
      }

      const defaultContainers = idx === 0
        ? [{ kind:"catalog", type:"crate" }]
        : [{ kind:"catalog", type:"chest" }];

      return {
        id: r.id,
        name: r.name,
        purpose: r.purpose,
        budget_pct: idx===0?12:idx===1?35:null, // example: some fixed, rest will be filled
        type_weights,
        containers: defaultContainers,
        modifiers: {}
      };
    });

    // 4) budget fill (rising)
    const set = rooms.reduce((a,r)=> a + (r.budget_pct ?? 0), 0);
    const remaining = Math.max(0, 100 - set);
    const unsetIdx = rooms.map((r,i)=> r.budget_pct==null ? i : -1).filter(i=>i>=0);
    if (unsetIdx.length) {
      const base = profiles.rising.slice(0, unsetIdx.length);
      const scaled = scaleToSum(base, remaining);
      unsetIdx.forEach((i, k) => rooms[i].budget_pct = Math.round(scaled[k]));
      // rounding fix
      const delta = 100 - rooms.reduce((a,r)=> a + (r.budget_pct ?? 0), 0);
      rooms[rooms.length-1].budget_pct! += delta;
    }

    // 5) basic budget estimate from APL (placeholder; your existing table may refine)
    const apl = Number(body.apl ?? 1);
    const base = Math.max(1, apl);
    const min_gp = base * 600;   // simple starter curve
    const max_gp = base * 1500;  // …
    const budget = { min_gp, max_gp, profile: "rising" };

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ seed, tags, budget, rooms }));
  } catch (e:any) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: e.message ?? String(e) }));
  }
}
