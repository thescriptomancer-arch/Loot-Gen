Dungeons & Dragons 3.5e Loot Generator — Product Requirements Document (PRD)
0) Purpose & Scope
Build an accurate, organic, context-sensitive loot generator for D&D 3.5e. System must be faithful to RAW mechanics (Equipment + Magic Item Creation), support deterministic runs, and scale via JSON catalogs. Initial content scope: Armor & Shields end-to-end, with UI, APIs, and engine invariants ready for future item types.
________________________________________
1) Repository & Data Layout
Repo constants
USER = thescriptomancer-arch
REPO = Loot-Gen
BRANCH = main
RAW = https://raw.githubusercontent.com/thescriptomancer-arch/Loot-Gen/refs/heads/main
Planner JSONs
•	${RAW}/planner/room_purposes.json
•	${RAW}/planner/type_weights_by_purpose.json
•	${RAW}/planner/container_templates.json
•	${RAW}/planner/budget_profiles.json
•	${RAW}/planner/tag_aliases.json
•	${RAW}/planner/custom_purposes.json (append-only)
•	${RAW}/planner/custom_containers.json (append-only)
Armor & Shields JSONs
•	Base items: ${RAW}/armor_shields/base_items.json
•	Auto add-ons: ${RAW}/armor_shields/auto_addons.json, ${RAW}/armor_shields/addon_items.json
•	Materials: ${RAW}/armor_shields/materials.json, ${RAW}/armor_shields/material_effects.json
•	Sizes: ${RAW}/armor_shields/size_distribution.json, ${RAW}/armor_shields/sizes_unusual.json
•	Construction quality: ${RAW}/armor_shields/construction_quality.json
•	Magic planner: ${RAW}/armor_shields/abilities_by_bonus.json, ${RAW}/armor_shields/abilities_by_gp.json, ${RAW}/armor_shields/magic_baseline.json, ${RAW}/armor_shields/magic_context_weights.json
•	Intelligent items:
${RAW}/armor_shields/intelligent_chance.json, ${RAW}/armor_shields/intelligent_statistics.json, ${RAW}/armor_shields/intelligent_alignment.json, ${RAW}/armor_shields/intelligent_lesser_powers.json, ${RAW}/armor_shields/intelligent_greater_powers.json, ${RAW}/armor_shields/intelligent_special_purpose_chance.json, ${RAW}/armor_shields/intelligent_purpose.json, ${RAW}/armor_shields/intelligent_dedicated_powers.json, ${RAW}/armor_shields/intelligent_ego_points.json
•	Cursed items:
${RAW}/armor_shields/cursed_chance.json, ${RAW}/armor_shields/cursed_common_curses.json, ${RAW}/armor_shields/cursed_types_summary.json, ${RAW}/armor_shields/cursed_dependent_situations.json, ${RAW}/armor_shields/cursed_requirements.json, ${RAW}/armor_shields/cursed_drawbacks.json
•	Flavor fallback (optional): ${RAW}/armor_shields/flavor_atoms.json, ${RAW}/armor_shields/component_terms.json
•	Naming metadata (new): ${RAW}/armor_shields/ability_naming.json
All files use unique id keys. Any schema violation fails with a clear error.
________________________________________
2) Engine Invariants (Normative)
•	Determinism: Every run has run_seed; all random choices use derived sub-seeds.
•	Rounding: Tiny-or-smaller armor AC halving rounds down; HP mult round to nearest (half-up); costs to whole gp unless a rule says otherwise.
•	Masterwork ACP: Apply once globally (+1 toward 0, min 0). Never double-apply via qualities/materials.
•	Per-pound pricing: Defer until after Size; then finalize.
•	Materials: Mithral treats as one category lighter; Adamantine hardness 20, hp_mult ≈ 1.333, DR by category; mithral/adamantine set auto_masterwork=true.
•	Magic cap: enhancement + effective-bonus abilities ≤ +10.
•	Pricing: magic_price = (bonus_total²) × 1000 + Σ(flat_gp); grand total = prior steps + magic_price (+ intelligent/cursed adjustments).
•	Fail fast: Duplicate IDs or illegal combinations abort with an actionable message.
________________________________________
3) Randomness & Diversity Policy
•	Run seed: Client may provide seed; else uuid_v4().
•	Sub-seeds: hash(run_seed || step || item_index || decision_index).
•	Tie-proof sampling: Add light Gumbel/Dirichlet jitter before softmax.
•	Context temperature (τ): Re-scale weights with w' = w^(1/τ); default 1.0 (expose in UI advanced).
•	ε-exploration: If legal pool <2, allow ε=0.05 exploration among still-legal pre-filter rows.
•	Ability diversity penalty: Sliding window N=50 per session; multiply weights by max(0.5, 1 − 0.10 × appearances).
•	Restarts: If signature duplicates within run/session, up to K=3 randomized restarts.
•	Telemetry: Log candidate_count, filters[], weights_after_context[], τ, selected_id, sub_seed per stochastic step.
________________________________________
4) UI & Flow (Authoritative)
4.1 Planner → Review → Generate (gated)
1.	Kickoff: user enters Scenario (free text) + APL. Optional: Budget mode (auto/manual), Seed, τ, and Planner Mode.
2.	Call /plan_inputs.
3.	Review screen (mandatory): show Rooms with suggested purposes, containers, and budget %. Editable.
4.	Confirm: only then enable Generate; call /generate_loot with plan_id and any overrides.
5.	Results: show Rooms with budget bars; item cards with tabs (Rules / Narrative / Audit).
Disable “Generate” if no plan_id is present in state.
4.2 Planner Modes (UI preset, not a separate engine)
If the UI must expose a “mode” selector, it maps to engine knobs:
UI Mode	Description	τ	ε	K (restarts)	Custom catalog guardrails
Catalog Only	JSON catalogs only	0.3	0.00	1	Strict similarity; reject custom
Blend (default)	Catalog + normalized customs	0.8	0.05	3	Normalize customs via similarity + tag nudges
Open World	Max exploration (still 3.5e-legal)	1.0	0.15	5	Minimal guardrails; schema-validated
Label this Planner Mode (not “Generation Mode”) to avoid confusion.
4.3 Item Card Anatomy
•	Header: Display Title (flavor name) + small line under it with Canonical Name (rules-style).
•	Quick stats band: AC, DR, Hardness/HP, ACP/ASF, Weight/Cost, Enhancement, add-on badges.
•	Tabs:
o	Rules (default): canonical field order, price breakdown, intelligent/cursed collapsibles, IDs & seed.
o	Narrative: short hook + flavor + optional 80–180w description.
o	Audit: per-step sampling logs, backtracks, final signature hash.
4.4 Rooms & Budgets
•	Progress bar per room = subtotal_gp / (target room budget gp) with green/amber/red thresholds (±5%, ±10–20%, >20%).
•	Container chips are clickable filters; offer “Move to container…” + drag-drop within room.
4.5 Exports
•	JSON (full), Markdown (stat block), Print/PDF. Canonical name in filenames; display title inside documents.
________________________________________
5) Naming System (Canonical + Display)
5.1 Canonical Naming (rules-style; deterministic)
Grammar (Armor/Shield)
[+N] [prefix adjectives…] [material?] <base item> [of suffix abilities…]
•	Use 3.5e forms: glamered (not “glamor”).
•	Suffix “of …” for: light/medium/heavy fortification, arrow deflection, etc.
•	Prefix adjectives for: shadow/slick (tiers), animated, bashing, glamered, etc.
•	Do not include “masterwork” in magic names. Include size only if not Medium.
Ability naming metadata (new file)
${RAW}/armor_shields/ability_naming.json
[
  {"id":"glamered","display":"glamered","name_form":"prefix-adj"},
  {"id":"shadow","display":"shadow","name_form":"prefix-adj","tier":["shadow","improved shadow","greater shadow"]},
  {"id":"slick","display":"slick","name_form":"prefix-adj","tier":["slick","improved slick","greater slick"]},
  {"id":"animated","display":"animated","name_form":"prefix-adj","slot":"shield"},
  {"id":"bashing","display":"bashing","name_form":"prefix-adj","slot":"shield"},
  {"id":"arrow_deflection","display":"arrow deflection","name_form":"suffix-of","slot":"shield"},
  {"id":"fort_light","display":"light fortification","name_form":"suffix-of","slot":"armor"},
  {"id":"fort_med","display":"medium fortification","name_form":"suffix-of","slot":"armor"},
  {"id":"fort_heavy","display":"heavy fortification","name_form":"suffix-of","slot":"armor"}
]
id values match those used in abilities_by_bonus.json / abilities_by_gp.json.
Examples
•	+1 glamered adamantine full plate of light fortification
•	+1 animated heavy steel shield
•	mithral chain shirt
5.2 Display Title (flavor name; power-scaled)
•	Generated for magical items; optional for mundane.
•	Scale impressiveness by enhancement, total magic gp, and notable materials.
•	Deterministic with a hash of canonical name + run_seed.
•	Examples: Gravesong Panoply, Nightwatch Aegis, Starfall Ward.
5.3 Output Fields
•	canonical_name (string)
•	display_title (string; may be empty for mundane)
•	naming_seed (string)
•	Unit tests: include golden cases for canonical naming.
________________________________________
6) Public API Contracts (Edge Functions)
6.1 POST /plan_inputs
Purpose: From Scenario + APL → structured plan (tags, rooms, suggested containers, per-room budget%).
Request
{
  "scenario": "hidden cave complex holding ancient knowledge guarded by undead",
  "apl": 4,
  "budget": {"mode":"auto"},
  "planner_mode": "blend",
  "seed": null,
  "tau": 1.0
}
Response
{
  "plan_id": "pln_07c4e2f1",
  "seed": "07c4e2f1-...",
  "planner_mode": "blend",
  "tau": 1.0,
  "tags": ["undead","ancient-knowledge","cave","APL-4"],
  "budget": {"min_gp":0,"max_gp":0,"profile":"rising"},
  "rooms": [{
    "id":"room_1",
    "name":"Archive",
    "purpose":{"kind":"catalog","id":"library"},
    "budget_pct":32,
    "type_weights":null,
    "containers":[
      {"kind":"catalog","type":"locked-chest"},
      {"kind":"custom","label":"bone reliquary","capacity":"S","material":"bone","base_condition":"sealed","lock":true,"trap":false}
    ],
    "modifiers":{}
  }]
}
Algorithms
•	Tagging: resolve via tag_aliases.json.
•	Room proposal: from room_purposes.json + up to 3 helpful customs.
•	Type weights: catalog → direct; custom → blend top-K from type_weights_by_purpose.json + tag nudges; normalize to 100.
•	Containers: catalog pass-through; custom defaults inferred from label/tags.
•	Budget: use budget_profiles.json (default “rising”); respect explicit budget_pct; remainder normalized to 100.
•	Determinism: seed + τ per §3.
6.2 POST /generate_loot
Purpose: Generate items from a confirmed plan or direct inputs.
Request (minimal)
{
  "plan_id": "pln_07c4e2f1",
  "overrides": null,
  "strict_dmg": false
}
Alternate (direct)
{
  "seed":"07c4e2f1-...",
  "tau":1.0,
  "budget":{"min_gp":0,"max_gp":0},
  "rooms":[{ "id":"room_1","name":"Entrance","purpose":{"kind":"catalog","id":"entry"},"budget_pct":12,"type_weights":{"armor_shields":18,"gems":8,"art":10},"containers":[{"kind":"catalog","type":"crate"}],"modifiers":{} }],
  "strict_dmg": false
}
Response (abbrev)
{
  "seed":"07c4e2f1-...",
  "rooms":[
    {
      "id":"room_1",
      "name":"Archive",
      "items":[
        {
          "id":"itm_ab12",
          "kind":"armor",
          "canonical_name":"+1 glamered adamantine full plate of light fortification",
          "display_title":"Gravesong Panoply",
          "facts":{ /* Step 1–7 outputs */ },
          "narrative":{"short_hook":"...","flavor_text":"...","description_text":"..."}
        }
      ],
      "subtotal_gp":15150
    }
  ],
  "total_gp":15150,
  "telemetry":{ /* per §3 */ }
}
Type weight keys (canonical)
armor_shields, weapons, potions_oils, rings, rods, scrolls, staves, wands, wondrous, foodstuff, art, jewelry, gems, stones
Container.capacity enum
"XS" | "S" | "M" | "L" | "XL"
________________________________________
7) JSON Schemas (Abridged)
Room
{
  "type":"object",
  "required":["id","name","purpose","budget_pct","containers"],
  "properties":{
    "id":{"type":"string"},
    "name":{"type":"string"},
    "purpose":{
      "oneOf":[
        {"type":"object","required":["kind","id"],"properties":{"kind":{"const":"catalog"},"id":{"type":"string"}}},
        {"type":"object","required":["kind","name"],"properties":{"kind":{"const":"custom"},"name":{"type":"string"},"notes":{"type":"string"},"tags":{"type":"array","items":{"type":"string"}}}}
      ]
    },
    "budget_pct":{"type":"number"},
    "type_weights":{"type":"object","additionalProperties":{"type":"number"}},
    "containers":{
      "type":"array",
      "items":{
        "oneOf":[
          {"type":"object","required":["kind","type"],"properties":{"kind":{"const":"catalog"},"type":{"type":"string"}}},
          {"type":"object","required":["kind","label"],"properties":{
            "kind":{"const":"custom"},
            "label":{"type":"string"},
            "capacity":{"enum":["XS","S","M","L","XL"]},
            "material":{"type":"string"},
            "base_condition":{"type":"string"},
            "lock":{"type":"boolean"},
            "trap":{"type":"boolean"}
          }}
        ]
      }
    },
    "modifiers":{"type":"object"}
  }
}
________________________________________
8) Armor & Shields Generation (Steps 1–10)
Outline
1.	Select Base Item → 1a) Auto Add-ons
2.	Select Material
3.	Select Size
4.	Select Construction Quality
5.	Magic Planner (holistic)
6.	Intelligent Item Determination
7.	Cursed Item Determination
8.	Include Flavor
9.	Write Item Description
10.	Post Output (cards/exports/telemetry)
Step 1: Base Item
•	Data: base_items.json (schema: id,name,kind,category,base_material,armor_bonus,shield_bonus,max_dex,acp,asf_percent,speed_30,speed_20,weight_lb,cost_gp,hardness,hp,allows_armor_spikes,allows_shield_spikes,notes)
•	Process: context-weighted sampling (biome/race/loot range/user filters) with τ. Respect kind ∈ {armor,shield} and base material gating. Persist base stats and run_seed.
1a: Auto Add-ons
•	Data: auto_addons.json, addon_items.json (schemas per file)
•	Rules (in data): e.g., heavy armor → 50% gauntlets; 10% locked xor 10% spiked; 5% armor spikes (if allowed). Shields → 20% shield spikes.
•	Implementation: evaluate after base; if two gauntlet variants pass, keep exactly one; add cost/weight only.
Step 2: Material
•	Data: materials.json, material_effects.json
•	Process: sample special material by rarity/context; then legality (applies_to, substrate, white/blacklists).
•	Effects order: masterwork flag → weight mult → hardness override → ACP/Max Dex/ASF deltas → HP mult (round) → mithral category lighter → adamantine DR by final category → attach material_effects.
•	Pricing rules: ADDERS_BY_CATEGORY, DOUBLE_MASTERWORK (dragonhide), PER_POUND_PLUS_MASTERWORK (e.g., darkwood shields; finalize after Size), NO_CHANGE.
•	Validation: if empty legal pool, fall back to standard material and log.
Step 3: Size
•	Data: size_distribution.json, sizes_unusual.json
•	Process: sample size; apply humanoid cost/weight multipliers; compute nonhumanoid tooltip.
•	Tiny-or-smaller armor: halve AC (round down). Shields unaffected.
•	Apply per-pound surcharges now; lock. Order of ops: material weight (Step 2) → size multipliers (Step 3). Flat adders are not scaled (unless a rule says so).
Step 4: Construction Quality
•	Data: construction_quality.json
•	Process: filter by applies_to/substrate; sample one (exclusive group).
•	Effects: masterwork flag → ACP/ASF/Max Dex → durability → weight mult → cost add/mult (min 1 gp).
•	Magic gating: enchanting requires masterwork; if cannot_be_magical=true, remove on enchant and apply auto_upgrade_on_enchant.
•	Normalize “Masterwork” row: is_masterwork=true, cost_add_gp=150, acp_delta=0 (global ACP rule handles the +1).
Step 5: Magic Planner
•	Strict DMG: if strict_dmg=true, exclude any is_homebrew=true rows from abilities.
•	5.A Magical? Compute min_magic_price = base_after_1_4 + (is_masterwork?0:150) + 1000. If max_gp < min_magic_price → Mundane. Baseline p from magic_baseline x affordability; deltas from magic_context_weights; apply τ; clamp & roll. User overrides: magical/mundane. If Magical and not masterwork, set masterwork (global ACP +1 applies).
•	5.B Build Choose enhancement +N (≥1 if any ability). Apply durability scaling: Armor: +1 AC, +1 hardness, +5 hp per +1; Shield: +1 AC, +2 hardness, +10 hp per +1. Pick effective-bonus abilities while enh + Σ(effective) ≤ 10. Spend remaining gp on flat-gp abilities. Enforce legality, prerequisites, stack groups, mutual exclusions, and diversity penalty; apply τ; backtrack if needed; de-dupe via K restarts.
•	5.C Pricing magic_price = (bonus_total²)×1000 + Σ(flat_gp); grand total = prior steps + magic_price. Emit breakdown.
Step 6: Intelligent Items
•	Strict DMG applies.
•	Data: intelligent* files.
•	Process: roll vs chance; if success: stats → alignment → lesser/greater powers (no dupes unless allowed) → optional special purpose + dedicated power; compute Ego from table (enhancement, effective bonuses, powers, telepathy/read lang/read magic, mental scores >10). Add surcharges; emit.
Step 7: Cursed Items
•	Strict DMG applies.
•	Data: cursed* files.
•	Process: roll vs chance; if success: pick common curse and branch (Delusion; Opposite effect/target; Intermittent incl. dependent situation; Requirement; Drawback; Substitute specific cursed item). Encode cadence/triggers (e.g., 50% per activation). Curses don’t reduce price unless template states. Emit.
Step 8–9: Flavor & Description
•	Flavor (primary): FlavorGen LLM with ItemFacts + ContextTags; include run_seed; guardrails: no stat changes, no unlisted powers/curses; novelty check via vector similarity + retries.
•	Fallback: compose from flavor_atoms.json + component_terms.json.
•	Description: DescriptionGen LLM, 80–180 words, no mechanics, novelty check. Emit short_hook, flavor_text, description_text, seeds.
Step 10: Post Output
•	Run Summary: Scenario (truncated), APL, run_seed, τ, item count, Total GP, strict DMG flag; export actions (JSON/Markdown/Print).
•	Rooms view: header with purpose, budget bar; container chips; items grid; filters (kind/material/size/category/int/cursed/enh/range/price); sort (gp, AC, enh, hardness, HP, weight, newest); view (grid/list).
•	Cards: header (Display Title + Canonical Name), quick stats band, actions (lock, re-roll similar, copy stat, move, delete; kebab: duplicate, edit name, mark identified), tabs (Rules/Narrative/Audit).
•	Accessibility: dark mode, ≥4.5:1 contrast, font scale 90–120%, aria labels, proper tab order.
•	Performance: virtualize long lists; lazy-load Narrative/Audit; thumbnails <200KB on demand.
•	Empty/Error states: friendly messages; show filename + HTTP status for data fetch errors; schema error shows field path/value and opens Audit tab.
________________________________________
9) Item Types (Roadmap Visibility)
Show all types in UI but disable those not yet implemented.
•	Armor & Shields (implemented)
•	Weapons
•	Potions & Oils
•	Rings
•	Rods
•	Scrolls
•	Staves
•	Wands
•	Wondrous Items
•	Currency
•	Jewelry
•	Art
•	Gems & Stones
________________________________________
10) QA & Compliance Checklist
•	All RAW endpoints resolve; all ids unique; schemas match.
•	Adamantine data row: hardness 20, hp_mult ≈1.333, DR by category, category adders present.
•	Masterwork ACP improvement applied once globally; “Masterwork” row has acp_delta=0.
•	HP rounding = nearest (half-up).
•	Per-pound surcharges finalized after Size.
•	Tiny-or-smaller armor halves AC, rounds down.
•	Magic enh + effective ≤ 10; backtracking active.
•	Randomness policy: τ default 1.0; ε=0.05; K=3; diversity penalty floor 0.5; telemetry logged.
•	Cache keys include run_seed or final signature.
•	Planner review required before generation; Generate disabled without plan_id.
•	Naming: canonical + display present; canonical follows grammar; display is deterministic & power-scaled; unit tests green.
•	Strict DMG flag excludes is_homebrew=true across abilities/intelligent/cursed.
________________________________________
11) Developer Notes
•	Expose τ (0.6–1.4) in advanced settings.
•	Maintain a lightweight per-session ability history to power diversity penalty.
•	Include plan_id echo in /generate_loot telemetry for auditability.
•	Prefer small, composable pure functions per step for testability.
________________________________________
Appendix A — Canonical & Display Naming (Reference)
Inputs: slot (armor|shield), base, material?, enhancement, abilities[] (with optional tier), size?, gp_total?
Process:
1.	Partition abilities by name_form using ability_naming.json.
2.	Canonical: [+N] [prefix...] [material?] <base> [of suffix...].
3.	Display: hash(canonical, run_seed) → choose motif by power index (enh + floor(gp_total/10000)); map armor→{Panoply,Cuirass,Mail,Plate}, shield→{Aegis,Bulwark,Targe,Ward}.
Outputs: canonical_name, display_title, naming_seed.
Example tests
•	+1 adamantine full plate, glamered, light fort → +1 glamered adamantine full plate of light fortification
•	+1 animated heavy steel shield → +1 animated heavy steel shield
•	mithral chain shirt (mundane) → mithral chain shirt
________________________________________
Appendix B — Minimal Room/Container Schema (Repeat)
See §7; unchanged.

