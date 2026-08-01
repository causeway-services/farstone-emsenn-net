/** Farstone's climate couplings: the world-clock's weather/season spine wired into the harbor,
 * the clam bed, fire-watch, the market, and NPC mood. */
import type { GameCommand, GameContext, GameSystem } from "@red-cup-engineering/fizzos/game";
import { type Weather, PHASES, PHASE_LEN, SEASON_LEN, isFoul, seasonAt } from "@red-cup-engineering/fizzos/world-clock";

const round1 = (n: number): number => Math.round(n * 10) / 10;

interface Climate {
  readonly time: number;
  readonly weather: Weather;
  readonly season: "spring" | "summer" | "autumn" | "winter";
  readonly phase: string;
  /** True on the tick the clock just crossed a phase boundary (weather rolls here). */
  readonly boundary: boolean;
  /** True on the tick a new season just began. */
  readonly seasonTurn: boolean;
}

const climateOf = (ctx: GameContext): Climate => {
  const time = ctx.number("the-world", "world-time", 0);
  return {
    time,
    weather: (ctx.value("the-world", "weather") ?? "clear") as Weather,
    season: seasonAt(time),
    phase: PHASES[Math.floor(time / PHASE_LEN) % PHASES.length]!,
    boundary: time > 0 && time % PHASE_LEN === 0,
    seasonTurn: time > 0 && time % SEASON_LEN === 0,
  };
};

const roomsTagged = (ctx: GameContext, tag: string): readonly string[] => ctx.rooms().filter((r) => ctx.tagsOf(r).includes(tag));
const thingsTagged = (ctx: GameContext, tag: string): readonly string[] => ctx.things().filter((t) => ctx.tagsOf(t).includes(tag));
const livingNpcs = (ctx: GameContext): readonly string[] => thingsTagged(ctx, "npc").filter((n) => ctx.value(n, "condition") !== "dead");

/** A storm closes the harbor and cancels the ferry; clearing reopens it. */
export const stormCascade: GameSystem = (ctx) => {
  const { weather } = climateOf(ctx);
  const stormed = weather === "storm";
  const closed = ctx.value("the-world", "harbor-closed") === "true";
  if (stormed && !closed) {
    ctx.tell([{ e: "the-world", a: "harbor-closed", v: "true" }]);
    for (const f of thingsTagged(ctx, "ferry")) ctx.tell([{ e: f, a: "sailing", v: "cancelled" }]);
    for (const r of roomsTagged(ctx, "harbor")) ctx.broadcast(r, "Storm cones run up the signal mast — the harbormaster closes the harbor. No vessel sails until it lifts.");
    for (const r of roomsTagged(ctx, "ferry")) ctx.broadcast(r, "A chalked notice goes up: SAILING CANCELLED — FOUL WEATHER. Stranded passengers crowd the benches.");
  } else if (!stormed && closed) {
    ctx.tell([{ e: "the-world", a: "harbor-closed", v: "false" }]);
    for (const f of thingsTagged(ctx, "ferry")) ctx.tell([{ e: f, a: "sailing", v: "scheduled" }]);
    for (const r of roomsTagged(ctx, "harbor")) ctx.broadcast(r, "The storm cones come down. The harbor is open again, and the ferry makes ready for its run.");
  }
};

/** Spring spawns fish; storms churn runoff into the sea. */
export const seasonalEcology: GameSystem = (ctx) => {
  const { weather, season, boundary } = climateOf(ctx);
  if (!boundary) return;
  for (const cell of roomsTagged(ctx, "ocean")) {
    if (weather === "storm") {
      ctx.tell([{ e: cell, a: "pollution", v: String(round1(ctx.number(cell, "pollution", 0) + 1.5)) }]);
    }
    if (season === "spring") {
      const cap = ctx.number(cell, "capacity-fish", 20);
      const stock = ctx.number(cell, "fish-stock", cap);
      if (stock < cap) ctx.tell([{ e: cell, a: "fish-stock", v: String(round1(Math.min(cap, stock + cap * 0.05))) }]);
    }
  }
};

/** Warm water plus recent rain shuts the clam bed. */
export const shellfishClosure: GameSystem = (ctx) => {
  const { weather, season, boundary } = climateOf(ctx);
  if (!boundary) return;
  const wet = weather === "rain" || weather === "storm";
  const rr = Math.min(10, Math.max(0, ctx.number("the-world", "recent-rainfall", 0) + (wet ? 2 : -1)));
  ctx.tell([{ e: "the-world", a: "recent-rainfall", v: String(rr) }]);
  const closed = season === "summer" && rr >= 4;
  const was = ctx.value("the-world", "shellfish-closed") === "true";
  if (closed === was) return;
  ctx.tell([{ e: "the-world", a: "shellfish-closed", v: String(closed) }]);
  for (const r of [...roomsTagged(ctx, "marsh"), ...roomsTagged(ctx, "shellfish")]) ctx.tell([{ e: r, a: "shellfish-closed", v: String(closed) }]);
  const where = [...roomsTagged(ctx, "marsh"), ...roomsTagged(ctx, "shellfish"), ...roomsTagged(ctx, "harbor")];
  for (const r of where) ctx.broadcast(r, closed ? "The records clerk posts a shellfish closure — the warm, freshened water has shut the clam bed." : "The shellfish closure lifts; the clam bed is open to harvest again.");
};

/** A dry warm spell raises the fire-danger base-rate. */
export const fireWatch: GameSystem = (ctx) => {
  const { season, boundary } = climateOf(ctx);
  if (!boundary) return;
  const dry = ctx.number("the-world", "dry-streak", 0);
  const warm = season === "summer" || season === "spring";
  const danger = !warm ? "low" : dry >= 8 ? "high" : dry >= 4 ? "moderate" : "low";
  if (ctx.value("the-world", "fire-danger") === danger) return;
  ctx.tell([{ e: "the-world", a: "fire-danger", v: danger }]);
  if (danger === "high") for (const r of [...roomsTagged(ctx, "forest"), ...roomsTagged(ctx, "outdoor")]) ctx.broadcast(r, "A fire-watch notice is posted: the woods are tinder-dry. No open flame above the watershed line.");
};

/** The off-season runs the fish price up; the growing season eases it. */
export const seasonalMarket: GameSystem = (ctx) => {
  const { season, seasonTurn } = climateOf(ctx);
  if (!seasonTurn) return;
  const off = season === "autumn" || season === "winter";
  const factor = off ? 1.3 : 0.8;
  for (const shop of thingsTagged(ctx, "shopkeeper")) {
    const price = ctx.value(shop, "price:fish");
    if (price === null) continue;
    ctx.tell([{ e: shop, a: "price:fish", v: String(round1(Number(price) * factor)) }]);
    const stock = ctx.number(shop, "stock:fish", 0);
    ctx.tell([{ e: shop, a: "stock:fish", v: String(Math.max(0, Math.round(stock * (off ? 0.6 : 1.2)))) }]);
  }
};

const WEATHER_LINE: Readonly<Record<Weather, string>> = Object.freeze({
  clear: "The sky is clear over the granite; light lies clean on the water.",
  cloudy: "A low grey ceiling sits over the harbor, flat and close.",
  rain: "Rain comes down steady and cold, running black off the slate roofs.",
  storm: "The storm drives in off the Atlantic — spray over the breakwater, lines singing.",
  fog: "Fog stands thick on the water; the South Point light is only a smear.",
});

/** Foul or cold weather presses on rest and mood; the sky speaks to everyone standing outdoors. */
export const weatherMood: GameSystem = (ctx) => {
  const { weather, season, boundary, phase } = climateOf(ctx);
  if (!boundary) return;
  const harsh = isFoul(weather) || season === "winter";
  if (harsh) for (const npc of livingNpcs(ctx)) {
    ctx.tell([{ e: npc, a: "need:rest", v: String(Math.min(20, ctx.number(npc, "need:rest", 0) + 1)) }]);
  }
  if (phase === "dawn" || phase === "dusk" || harsh) for (const r of roomsTagged(ctx, "outdoor")) ctx.broadcast(r, WEATHER_LINE[weather]);
};

/** Every climate coupling, in the order Farstone runs them after the engine's own agents. */
export const FARSTONE_CLIMATE_SYSTEMS: readonly GameSystem[] = Object.freeze([
  stormCascade,
  seasonalEcology,
  shellfishClosure,
  fireWatch,
  seasonalMarket,
  weatherMood,
]);

/** The single-valued cells the couplings settle — registered functional so their traces compact. */
export const FARSTONE_CLIMATE_FUNCTIONAL: readonly string[] = Object.freeze([
  "harbor-closed", "shellfish-closed", "recent-rainfall", "fire-danger", "sailing", "growing-season-active",
]);

/** `almanac` / `forecast` — the harbor almanac: season, sky, tide, and every standing advisory. */
export const almanac: GameCommand = (ctx, _actor, _arg) => {
  const { time, weather, season, phase } = climateOf(ctx);
  const tide = Math.floor(time / (PHASE_LEN * 2)) % 2 === 0 ? "high" : "low";
  const growing = season === "spring" || season === "summer";
  const lines = [
    `Almanac of Farstone — ${season}, ${phase}.`,
    `The sky is ${weather}; the tide runs ${tide}. ${growing ? "The growing season is in." : "The growing season is past."}`,
  ];
  const fire = ctx.value("the-world", "fire-danger");
  if (fire !== null && fire !== "low") lines.push(`Fire-watch: danger ${fire} (dry-streak ${ctx.number("the-world", "dry-streak", 0)}).`);
  if (ctx.value("the-world", "harbor-closed") === "true") lines.push("The harbor is CLOSED — no sailings until the storm lifts.");
  if (ctx.value("the-world", "shellfish-closed") === "true") lines.push("The clam bed is under a shellfish closure.");
  return lines.join("\n");
};
