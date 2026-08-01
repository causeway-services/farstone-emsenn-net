/** `@rsc-quiescent/farstone-emsenn-net` — Farstone as a parameterization of `@red-cup-engineering/fizzos`'s
 * engine/game seam: its closure rules, fields, weather, systems, commands, and catalogs. */
import type { ClosureRule } from "@red-cup-engineering/fizzos/predication";
import type { FieldSpec, GameContext, GameDefinition } from "@red-cup-engineering/fizzos/game";
import type { SeasonWeather, WeatherModel } from "@red-cup-engineering/fizzos/world-clock";
import { FARSTONE_CLIMATE_FUNCTIONAL, FARSTONE_CLIMATE_SYSTEMS, almanac } from "./farstone-climate.mjs";
import { FARSTONE_DIRECTOR_FUNCTIONAL, farstoneDirector, stormRecovery } from "./director.mjs";
import { DEPTHS_FUNCTIONAL, DEPTHS_SYSTEMS } from "./depths.mjs";
import { inspect, petition } from "./farstone-arcs.mjs";
import { OFF_SEASON, farstoneCampaignView } from "./campaign.mjs";
import { THOUGHTS } from "./thoughts.mjs";
import { FACTIONS, GATHER_VERBS, LAWS, PROFESSIONS, RECIPES, RESOURCES, SHIP_CLASSES, SOULS, STRUCTURES, TITLES, WARES } from "./catalogs.mjs";

/** Pollution at or above this fouls a cell. */
const BLIGHT_POLLUTION = 6;

const FARSTONE_RULES: readonly ClosureRule[] = Object.freeze([
  { id: "blight", when: (f) => f.number("pollution", 0) >= BLIGHT_POLLUTION && f.value("blighted") !== "true",
    then: (f) => [{ e: f.id, a: "blighted", v: "true" }] },
  { id: "heal", when: (f) => f.number("pollution", 0) < BLIGHT_POLLUTION && f.value("blighted") === "true",
    then: (f) => [{ e: f.id, a: "blighted", v: "false" }] },
  { id: "torn", when: (f) => f.value("blighted") === "true" && f.number("fish-stock", 0) > 0 && f.value("torn") !== "true",
    then: (f) => [{ e: f.id, a: "torn", v: "true" }] },
]);

/** Farstone's climate: the cool-Atlantic maritime band of `docs/world/biome.md`. */
const seasonWeather = (rows: SeasonWeather): SeasonWeather => Object.freeze(rows);

export const FARSTONE_WEATHER: WeatherModel = Object.freeze({
  spring: seasonWeather({
    clear: { clear: 4, cloudy: 3, fog: 2 },
    cloudy: { clear: 3, cloudy: 3, rain: 3, fog: 2 },
    rain: { cloudy: 3, rain: 3, clear: 1 },
    storm: { rain: 3, cloudy: 2, storm: 1 },
    fog: { fog: 3, cloudy: 2, clear: 3 },
  }),
  summer: seasonWeather({
    clear: { clear: 7, cloudy: 2, fog: 2 },
    cloudy: { clear: 4, cloudy: 3, rain: 1, fog: 1 },
    rain: { cloudy: 3, clear: 2, rain: 1, storm: 1 },
    storm: { rain: 2, cloudy: 3, clear: 1 },
    fog: { clear: 5, fog: 2, cloudy: 1 },
  }),
  autumn: seasonWeather({
    clear: { clear: 3, cloudy: 4, fog: 1 },
    cloudy: { cloudy: 3, rain: 3, storm: 2, clear: 1 },
    rain: { rain: 3, storm: 3, cloudy: 2 },
    storm: { storm: 3, rain: 3, cloudy: 2 },
    fog: { fog: 2, cloudy: 3, rain: 1 },
  }),
  winter: seasonWeather({
    clear: { clear: 2, cloudy: 5, fog: 1 },
    cloudy: { cloudy: 4, rain: 3, storm: 2, clear: 1 },
    rain: { rain: 3, cloudy: 3, storm: 2 },
    storm: { storm: 2, rain: 3, cloudy: 3 },
    fog: { fog: 1, cloudy: 4, rain: 1 },
  }),
});

/** Farstone's fields: pollution diffuses across the connected open water. */
const FARSTONE_FIELDS: readonly FieldSpec[] = Object.freeze([
  { name: "pollution", overTag: "ocean", predicate: "pollution", rate: 0.15 },
]);

/** Farstone, as a game `@red-cup-engineering/fizzos`'s engine can run. */
export const FARSTONE_GAME: GameDefinition = Object.freeze({
  name: "farstone",
  worldRules: FARSTONE_RULES,
  fields: FARSTONE_FIELDS,
  weather: FARSTONE_WEATHER,
  systems: [...FARSTONE_CLIMATE_SYSTEMS, farstoneDirector, stormRecovery, ...DEPTHS_SYSTEMS],
  functional: [...FARSTONE_CLIMATE_FUNCTIONAL, ...FARSTONE_DIRECTOR_FUNCTIONAL, ...DEPTHS_FUNCTIONAL, "decision-status"],
  commands: { almanac, forecast: almanac, petition, audit: inspect, recheck: inspect, reinspect: inspect },
  ecology: { tag: "ocean" },
  crime: { lawFaction: "watch" },
  genre: true,
  catalogs: {
    wares: WARES, recipes: RECIPES, resources: RESOURCES, gatherVerbs: GATHER_VERBS,
    shipClasses: SHIP_CLASSES, professions: PROFESSIONS, titles: TITLES, souls: SOULS,
    factions: FACTIONS, laws: LAWS, structures: STRUCTURES,
  },
  campaign: OFF_SEASON,
  campaignView: farstoneCampaignView,
  thoughts: THOUGHTS,
  onLoad: seedFarstoneSituation,
});

/**
 * Seed the off-season's standing situation (`docs/world/lore.md` §"The Off-Season"): the
 * dredging-permit dispute as a genuine paraconsistent held contradiction — the clerk's office
 * holds Application 23 as both within its decision window and overdue, so the cell settles to
 * `stable` and the world carries the contradiction rather than resolving it. Idempotent: fires
 * only for entities the loaded bible actually contains, and only once per world.
 */
function seedFarstoneSituation(ctx: GameContext): void {
  const has = (id: string) => ctx.things().includes(id) || ctx.rooms().includes(id);
  if (ctx.value("the-dredging-permit", "decision-status") === null) ctx.tell([{ e: "the-dredging-permit", a: "decision-status", v: "contested" }]);
  for (const fisher of ["coilin-vey", "brannaugh-ross"]) {
    if (has(fisher) && ctx.value(fisher, "belief:dredging-permit") === null) ctx.tell([{ e: fisher, a: "belief:dredging-permit", v: "stable" }]);
  }
  if (ctx.value("hydrant-23", "water-quality") === null) {
    ctx.tell([
      { e: "hydrant-23", a: "water-quality", v: "contested" },
      { e: "hydrant-23", a: "advisory", v: "boil-water" },
    ]);
  }
}
