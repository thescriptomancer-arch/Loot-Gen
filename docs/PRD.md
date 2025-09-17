# D&D 3.5e Loot Generator — PRD (v2, Armor & Shields)
This repository contains JSON catalogs and rules for a deterministic, rules-accurate generator.
Key invariants: +1 required to host special abilities; enhancement + effective-bonus ≤ +10; adamantine hardness 20 and DR by category; magic price = (bonus_total^2)*1000 + sum(flat gp).

## Structure
- planner/: room purposes, weights, containers, budget profiles, tag aliases
- armor_shields/: base items, materials, effects, sizes, construction quality, magic planners, intelligent/cursed, aging
- config/: feature flags
- docs/: this PRD

## Flow
1) /plan_inputs produces rooms, containers, budget % (user must confirm before generation).
2) /generate_loot runs Steps 1–10 (Armor & Shields) with feature flags from config.

## Naming
- Canonical: [+N] [prefix adjectives] [material?] <base> [of suffix abilities]
- Display: flavor name scaled by item power (used as big title; canonical appears under it).

## Modules
- Aging (non-magical wear/decay): armor_shields/aging_*.json
- FR materials (Magic of Faerûn): armor_shields/materials.faerun.json (feature-flagged)
- MIC augment crystals (attachments) and DMG II bonded/signature: optional, off by default

## Notes
- All files are append-only catalogs you can extend safely.
- Keep each shard small; create new *.json files when adding many entries.
