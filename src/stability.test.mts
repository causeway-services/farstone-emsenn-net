/** Multi-year stability — the proportional-scale proof for "hundreds of hours": bounded
 * per-tick cost (the trace compacts, it does not crawl) and undiminished variety late in
 * an 8-in-game-year run. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { type Bible, loadBible } from "@red-cup-engineering/fizzos/world-load";
import { FizzosScene } from "@red-cup-engineering/fizzos/scene";
import { placeOf, numberOf, valueOf, tell } from "@red-cup-engineering/fizzos/world";
import { FARSTONE_GAME } from "./farstone-game.mjs";

const ISLAND: Bible = {
  rooms: [
    { id: "quay", name: "Harbor Quay", description: "Waterfront.", exits: { north: "town", west: "inn", sea: "grounds", up: "ridge", south: "marsh" }, tags: ["place", "harbor", "outdoor", "dock"] },
    { id: "town", name: "Downtown", description: "Civic.", exits: { south: "quay", east: "market" }, tags: ["place", "town", "civic", "outdoor"] },
    { id: "market", name: "Market Row", description: "Stalls.", exits: { west: "town" }, tags: ["place", "market", "shop", "outdoor"] },
    { id: "inn", name: "The Inn", description: "Hearth and beds.", exits: { east: "quay" }, tags: ["place", "inn", "indoor", "social-hub", "shelter"] },
    { id: "ridge", name: "The Ridge", description: "Timber.", exits: { down: "quay" }, tags: ["place", "outdoor", "forest", "node:timber"] },
    { id: "marsh", name: "The Marsh", description: "Clam bed.", exits: { north: "quay" }, tags: ["place", "marsh", "outdoor", "shellfish"] },
    { id: "grounds", name: "Fishing Grounds", description: "Water.", exits: { in: "quay" }, tags: ["place", "ocean", "fishing"] },
  ],
  npcs: [
    { id: "coilin", name: "Coilin", description: "A fisher.", location: "quay", tags: ["npc", "faction:fishers", "rival:brannaugh", "coin:30", "skill:fishing:30"] },
    { id: "brannaugh", name: "Brannaugh", description: "A digger.", location: "quay", tags: ["npc", "faction:fishers", "rival:coilin", "coin:25", "skill:fishing:35"] },
    { id: "nessa", name: "Nessa", description: "Innkeeper.", location: "inn", tags: ["npc", "innkeeper", "coin:300"] },
    { id: "greer", name: "Greer", description: "Fishwife.", location: "market", tags: ["npc", "shop", "shopkeeper", "sells:fish", "coin:200"] },
    { id: "tomas", name: "Tomas", description: "Woodcutter.", location: "ridge", tags: ["npc", "coin:35", "skill:woodcutting:40"] },
    { id: "dax", name: "Dax", description: "Deckhand.", location: "quay", tags: ["npc", "faction:fishers", "coin:20", "skill:fishing:20"] },
  ],
  items: [{ id: "clam1", name: "a clam", description: "Sweet.", location: "marsh", tags: ["item", "takeable", "edible", "nutrition:4"] }],
};

const npcs = ["coilin", "brannaugh", "nessa", "greer", "tomas", "dax"];

function window(s: FizzosScene, from: number, to: number): { ms: number; weathers: number; quests: number; moves: number } {
  const weathers = new Set<string>();
  const posted = new Set<string>();
  const lastRoom: Record<string, string | null> = {};
  let moves = 0;
  const t0 = process.hrtime.bigint();
  for (let t = from; t <= to; t++) {
    s.runTick(t, []);
    const w = s.currentWorld();
    weathers.add(valueOf(w, "the-world", "weather") ?? "clear");
    for (const npc of npcs) {
      if ((valueOf(w, npc, "wants") ?? "") !== "") posted.add(npc);
      const room = placeOf(w, npc);
      if (lastRoom[npc] !== undefined && room !== lastRoom[npc]) moves++;
      lastRoom[npc] = room;
    }
  }
  return { ms: Number(process.hrtime.bigint() - t0) / 1e6, weathers: weathers.size, quests: posted.size, moves };
}

test("SCALE: many in-game years run with bounded per-tick cost and undiminished variety", () => {
  const { world, content } = loadBible(ISLAND);
  const s = new FizzosScene(tell(world, [{ e: "the-world", a: "world-seed", v: "1066" }]), content, "quay", FARSTONE_GAME);

  const YEAR = 3360; // 4 seasons × 840 ticks
  const YEARS = 8;
  const early = window(s, 1, 1000);
  for (let t = 1001; t <= YEAR * YEARS; t++) s.runTick(t, []);
  const late = window(s, YEAR * YEARS + 1, YEAR * YEARS + 1000);

  const earlyPerTick = early.ms / 1000;
  const latePerTick = late.ms / 1000;
  console.log(`\n  Stability over ${YEARS} in-game years (${(YEAR * YEARS).toLocaleString()} ticks):`);
  console.log(`    early window: ${earlyPerTick.toFixed(3)} ms/tick — ${early.weathers} skies, ${early.quests} questers, ${early.moves} moves`);
  console.log(`    late  window: ${latePerTick.toFixed(3)} ms/tick — ${late.weathers} skies, ${late.quests} questers, ${late.moves} moves`);
  console.log(`    per-tick cost ratio late/early: ${(latePerTick / earlyPerTick).toFixed(2)}×`);

  assert.ok(late.weathers >= 2, "the skies still turn in the late years");
  assert.ok(late.quests >= 3, "the Director is still minting quests in the late years");
  assert.ok(late.moves >= 5, "the cast is still pursuing its ends in the late years");
  assert.ok(latePerTick < earlyPerTick * 4 + 0.5, `per-tick cost stayed bounded (${latePerTick.toFixed(3)} vs ${earlyPerTick.toFixed(3)} ms) — sustainable for hundreds of hours`);
});
