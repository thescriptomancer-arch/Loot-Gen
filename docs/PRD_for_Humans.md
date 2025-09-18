# D&D 3.5e Loot Generator — PRD for Humans (Armor & Shields)

## What this app does
- Proposes **rooms, containers, and budgets** from your scenario and APL.
- Generates **RAW‑legal Armor & Shields** (mundane → magical → intelligent/cursed), with **deterministic seeds**.
- Names gear two ways: **Canonical** (rules‑style) and **Display Title** (flavor for magical items).

## How you use it (3 steps)
1. **Enter** a Scenario and **APL** → click **Build Plan** (/plan_inputs).  
2. **Review/adjust** Rooms, Containers, Budgets (must accept a plan).  
3. **Generate** (/generate_loot) → browse items; export JSON/Markdown/Print.

## Inputs the app understands
- Scenario (free text), APL (number), optional Seed & τ (variety), Planner Mode (Catalog Only / Blend / Open World), Budget mode.
- Rooms from the plan: purpose (catalog/custom), containers, per‑room budget %, and optional type_weights.

## What you see after generation
- **Rooms** with budget bars (target vs spent).  
- **Item cards** with tabs: 
  - **Rules** (stats, pricing breakdown, intelligent/cursed collapsibles, IDs & seed), 
  - **Narrative** (short hook + flavor), 
  - **Audit** (what was sampled/selected).  
- **Exports**: JSON, Markdown, Print/PDF.

## Feature toggles (config/feature_flags.json)
- `enable_aging`: non‑magical items can pick up aging tiers based on environment.  
- `enable_faerun_materials`: adds setting‑specific materials (e.g., Arandur, Darksteel).  
- `enable_bespoke_items`: allows prebuilt uniques (e.g., Rhino Hide).  
- `strict_dmg`: drops homebrew/setting‑specific rows (core‑only).
- `enable_signature_traits`: cosmetic traits from DMG2; no rules impact (5% chance by default).


## Rules we enforce (high‑level)
- **Masterwork ACP**: +1 toward 0 **once**, globally (never twice).
- **Per‑pound pricing**: finalize **after** size selection (e.g., Darkwood shields).  
- **Tiny armor AC**: halve base AC and **round down** (shields unaffected).  
- **Adamantine**: hardness 20; hp_mult ≈1.333; DR 1/– (light), 2/– (medium), 3/– (heavy).  
- **Mithral**: counts one category lighter; ACP +2; Max Dex +2; ASF −10; weight ×0.5.  
- **Magic cap**: enhancement + total effective bonus ≤ **+10**.  
- **Magic pricing**: (bonus_total²)×1000 + Σ(flat gp); add mundane afterward.
- Magic validation: each chosen ability must have aura, cl, prereqs (and activation if applicable) or generation fails with an error showing id/file/missing field.
- Augment crystals: 1 per armor/shield max; flat GP add-on; no effect on +bonus cap

## Naming
- **Canonical**: `[+N] [prefix…] [material?] <base> [of suffix…]` (e.g., `+1 glamered adamantine full plate of light fortification`).  
- **Display Title**: only for magical items; power‑scaled (e.g., *Gravesong Panoply*).

## Data layout (where the app reads from)
- Planner JSONs: `planner/*.json`  
- Armor & Shields JSONs: `armor_shields/*.json` (core + shards)  
- Ability naming: `armor_shields/ability_naming.json`  
- Feature flags: `config/feature_flags.json`
- Two registries:
  - armor_shields/abilities_by_bonus.json  (+equiv entries)
  - armor_shields/abilities_by_gp.json     (flat_gp entries)
- Required metadata for generation:
  - aura (string), cl (integer), prereqs (string[])
  - activation { type, method?, frequency?, duration? } when applicable
  - notes (concise one-liner), source (existing field)
- Authoring:
  - Keep each JSON object to a single line for quick review.
  - IDs are canonical and MUST NOT change; engine indexes by `id`.
- Synergy/supersedence:
  - If an entry upgrades/replaces another (e.g., “, Improved” / “, Greater”), set
    "synergy": { "requires_id": "<base_id>", "supersedes": true } or
    "requires_one_of": [ids...] as needed.
- Augment crystals:
  -   armor_shields/augment_crystals.json (armor/shield only) — each row must include:
id (canonical), name, slot ("armor"|"shield"|"either"), tier ("least"|"lesser"|"greater"), gp (flat), aura, cl, prereqs (string[]), activation (if any), effect (short one-liner), source. The engine equips at most one crystal per item and applies its flat GP after magic pricing. Crystals never count toward the +10 cap.
Examples: clasp_of_energy_protection_[acid|cold|elec|fire|sonic]_[least|lesser|greater], crystal_of_adamant_armor_[least|lesser|greater], iron_ward_diamond_[least|lesser|greater], etc.
- Cosmetic traits (optional): `armor_shields/signature_traits.json`



## Updating content (no code)
- To add materials from another book, drop a new file like `armor_shields/materials.<book>.json`.  
- To add a bespoke item, append to `armor_shields/bespoke_items.json` with an id + gp_total (no long rules text needed).  
- To tweak aging, edit `armor_shields/aging_profiles.json` / `aging_environments.json`.

## Quick “Does it work?” checks
- **Adamantine heavy armor** shows **DR 3/–** and **hardness 20**.  
- **Mithral chain shirt (mundane)** has **ACP −1 total** (−2 base with +1 masterwork toward 0), **Max Dex +2**, **ASF −10%**.  
- **Darkwood shield** pricing uses sized weight and adds masterwork.  
- **A Tiny suit of armor** halves base AC (round down).  
- **A magical item** shows **Magic price = (bonus_total²)×1000 + Σ(flat gp)**.

## Out of scope right now
- Weapons, Wands, Staves, etc. (placeholders in UI only).

 ## Data files (Armor & Shields)
- Base abilities: {RAW}/armor_shields/abilities_by_bonus.json
- Flat-gp abilities: {RAW}/armor_shields/abilities_by_gp.json
- Ability naming map: {RAW}/armor_shields/ability_naming.json
- **IDs registry (validation only): {RAW}/ids_registry.json**  
  Used to (1) resolve names → canonical IDs, (2) enforce `strict_dmg` filtering, and (3) ensure every referenced ability is known.
- Full SRD text reprints (we reference by id; we don’t ship rule text).

- ## Optional Module: Item Templates (DMG II)

Nonmagical overlays for armor & shields that adjust weight, hardness/HP, ASF/ACP/Max Dex, and add situational notes. They add a flat gp surcharge to the mundane item cost and NEVER change enhancement pricing.

Files:
- templates_engine.config.json — toggle, roll chance, scope.
- templates_armor_shield.jsonl — data rows for each DMG II template (armor/shield).
(Weapons can be added later in templates_weapons.jsonl.)

Rules:
- Applied after materials and magic.
- Template effects stack with special materials and magic (as described in DMG II).
- Affinity metadata is informational (10% raw-materials discount for future crafting); generator does not auto-discount prices.
- If desired, you can enable the DMG II availability modifier (treating availability price as base + 10×template cost).


## Roadmap (next)
- Weapons (incl. augment crystals), more setting shards, broader bespoke catalog.
