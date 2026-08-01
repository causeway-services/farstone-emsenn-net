/** Climate coupled to the world: each test names a coupling and asserts the world settles it. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { type Bible, loadBible } from "@red-cup-engineering/fizzos/world-load";
import { FizzosScene, type CommandIntent } from "@red-cup-engineering/fizzos/scene";
import { numberOf, tell, valueOf } from "@red-cup-engineering/fizzos/world";
import { PHASE_LEN, SEASON_LEN } from "@red-cup-engineering/fizzos/world-clock";
import { FARSTONE_GAME } from "./farstone-game.mjs";

const HARBOR: Bible = {
  rooms: [
    { id: "quay", name: "The Quay", description: "Granite and tar.", exits: { sea: "grounds", to: "marsh" }, tags: ["place", "harbor", "outdoor", "dock"] },
    { id: "grounds", name: "The Fishing Grounds", description: "Open water.", exits: { in: "quay" }, tags: ["place", "ocean", "fishing"] },
    { id: "marsh", name: "The Salt Marsh", description: "Spartina and tidal mud.", exits: { from: "quay" }, tags: ["place", "marsh", "outdoor", "shellfish"] },
  ],
  npcs: [
    { id: "greer", name: "Greer Tenn", description: "A fishwife.", location: "quay", tags: ["npc", "shopkeeper"] },
    { id: "the-ferry", name: "the ferry", description: "The morning boat.", location: "quay", tags: ["ferry", "fixed"] },
  ],
};

const scene = (seed: number, cells: { e: string; a: string; v: string }[]) => {
  const { world, content } = loadBible(HARBOR);
  return new FizzosScene(tell(world, [{ e: "the-world", a: "world-seed", v: String(seed) }, ...cells]), content, "quay", FARSTONE_GAME);
};

test("storm closes the harbor and cancels the ferry; clearing reopens it", () => {
  const s = scene(1, [{ e: "the-world", a: "world-time", v: "5" }, { e: "the-world", a: "weather", v: "storm" }]);
  s.runTick(1, []);
  assert.equal(valueOf(s.currentWorld(), "the-world", "harbor-closed"), "true");
  assert.equal(valueOf(s.currentWorld(), "the-ferry", "sailing"), "cancelled");
  const calm = scene(1, [{ e: "the-world", a: "world-time", v: "5" }, { e: "the-world", a: "weather", v: "clear" }, { e: "the-world", a: "harbor-closed", v: "true" }]);
  calm.runTick(1, []);
  assert.equal(valueOf(calm.currentWorld(), "the-world", "harbor-closed"), "false");
  assert.equal(valueOf(calm.currentWorld(), "the-ferry", "sailing"), "scheduled");
});

test("the off-season turn runs the fish price up", () => {
  const s = scene(1, [
    { e: "the-world", a: "world-time", v: String(SEASON_LEN * 2 - 1) },
    { e: "greer", a: "price:fish", v: "2" },
    { e: "greer", a: "stock:fish", v: "6" },
  ]);
  s.runTick(1, []);
  assert.ok(Number(valueOf(s.currentWorld(), "greer", "price:fish")) > 2.4);
  assert.ok(numberOf(s.currentWorld(), "greer", "stock:fish", 6) < 6);
});

test("a wet summer closes the shellfish bed", () => {
  const s = scene(1, [
    { e: "the-world", a: "world-time", v: String(SEASON_LEN + PHASE_LEN - 1) },
    { e: "the-world", a: "recent-rainfall", v: "10" },
  ]);
  s.runTick(1, []);
  assert.equal(valueOf(s.currentWorld(), "the-world", "shellfish-closed"), "true");
  assert.equal(valueOf(s.currentWorld(), "marsh", "shellfish-closed"), "true");
});

test("almanac reads the whole spine back to the player", () => {
  const s = scene(1, [{ e: "the-world", a: "world-time", v: "5" }, { e: "the-world", a: "weather", v: "fog" }]);
  const { events } = s.runTick(1, [{ k: "command", actor: "skipper", line: "almanac" } satisfies CommandIntent]);
  const text = events.filter((e) => e.k === "message" && e.to === "skipper").map((e) => (e as { text: string }).text).join("\n");
  assert.match(text, /Almanac of Farstone/);
  assert.match(text, /spring/);
});
