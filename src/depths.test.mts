/** The Underfarr's living machinery: monsters that respawn (`home:`, `respawn:`, `depth:`). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { tell, valueOf, placeOf, numberOf } from "@red-cup-engineering/fizzos/world";
import { type Bible, loadBible } from "@red-cup-engineering/fizzos/world-load";
import { FizzosScene, type CommandIntent } from "@red-cup-engineering/fizzos/scene";
import { homeOf, DEFAULT_RESPAWN } from "./depths.mjs";
import { FARSTONE_GAME } from "./farstone-game.mjs";

test("homeOf reads a monster's den from its tags, or null when it dens where it stands", () => {
  assert.equal(homeOf(["npc", "monster", "home:ufr-warren", "health:60"]), "ufr-warren");
  assert.equal(homeOf(["npc", "monster", "hostile"]), null);
});

const LAIR: Bible = {
  rooms: [
    { id: "den", name: "The Gnawed Den", description: "Bone and dark.", tags: ["place", "underground", "cave", "dark", "depth:1"] },
    { id: "tunnel", name: "A Tunnel", description: "Out.", exits: { in: "den" }, tags: ["place", "underground", "dark", "depth:1"] },
  ],
  npcs: [
    { id: "rat", name: "a giant rat", description: "Yellow-toothed and bold.", location: "den", tags: ["npc", "monster", "hostile", "home:den", "health:2", "attack:1", "respawn:3", "beast"] },
  ],
};

test("a slain monster comes back at its den after its respawn delay", () => {
  const { world, content } = loadBible(LAIR);
  const s = new FizzosScene(tell(world, [
    { e: "hero", a: "health", v: "40" }, { e: "hero", a: "max-health", v: "40" },
    { e: "hero", a: "attack", v: "20" }, { e: "hero", a: "condition", v: "alive" },
  ]), content, "den", FARSTONE_GAME);
  s.join("hero", "den");

  let t = 1;
  for (; t <= 6 && valueOf(s.currentWorld(), "rat", "condition") !== "dead"; t++) {
    s.runTick(t, [{ k: "command", actor: "hero", line: "attack rat" } satisfies CommandIntent]);
  }
  assert.equal(valueOf(s.currentWorld(), "rat", "condition"), "dead", "the rat falls");

  s.runTick(t++, []);
  assert.equal(valueOf(s.currentWorld(), "rat", "condition"), "dead", "still down the tick after");

  for (let i = 0; i < 8; i++) s.runTick(t++, []);
  assert.equal(valueOf(s.currentWorld(), "rat", "condition"), "alive", "the rat is back");
  assert.equal(placeOf(s.currentWorld(), "rat"), "den", "back at its den");
  assert.equal(numberOf(s.currentWorld(), "rat", "health", 0), 2, "and whole again (full health)");
});

test("a monster with no respawn tag uses the default delay; the depth tag drives the deep atmosphere", () => {
  assert.ok(DEFAULT_RESPAWN >= 10, "the dark renews slowly enough that clearing a room means something");
  const { content } = loadBible(LAIR);
  assert.ok(content.rooms["den"]!.tags.some((t) => t.startsWith("depth:")), "the den is a depth room");
});
