# @emsenn/farstone.emsenn.net

<!-- 561-group-standards:badges:start -->
[![Causeway Services](https://img.shields.io/badge/561%20Group-Causeway%20Services-115e69)](https://github.com/causeway-services)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-115e69)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/causeway-services/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

Farstone: the reference game built on `@emsenn/fizzos`'s engine/game seam. FizzOS is a
general MUD engine with zero built-in game content; this package supplies all of Farstone's —
`FARSTONE_GAME` (rules, fields, weather, systems, commands, catalogs, campaign, Thoughts) and
the world it seeds onto.

## Layout

- `src/farstone-game.mts` — the assembled `GameDefinition`.
- `src/catalogs.mts` — wares, recipes, resources, ship classes, professions, titles, souls,
  factions, laws.
- `src/campaign.mts`, `src/thoughts.mts` — the Off-Season campaign and Thought Cabinet content.
- `src/farstone-climate.mts`, `src/farstone-arcs.mts`, `src/director.mts`, `src/depths.mts` —
  Farstone-only systems and commands (climate couplings, the dredging-permit/Hydrant-23 arcs,
  the emergent quest Director, the Underfarr).
- `docs/` — design and lore: `DESIGN.md`, `ROADMAP.md` (history), and `world/*.md` (geography,
  biome, inhabitants, lore, things) plus `world/harbor.json`, the live world save.

## Run

```sh
pnpm --filter @emsenn/farstone.emsenn.net run serve
```

Boots `@emsenn/fizzos`'s live MUD server (`createFizzosMud`) with `FARSTONE_GAME`, restoring
from and persisting to `docs/world/harbor.json`.
