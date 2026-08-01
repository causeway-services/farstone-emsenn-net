/** The emergent quest Director: hunger drifts up, a demand posts, food fulfils it — relief,
 * pay, standing, via the ordinary give-machinery, with no quest authored by hand. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { tell, valueOf, numberOf } from "@red-cup-engineering/fizzos/world";
import { standingOf } from "@red-cup-engineering/fizzos/reputation";
import { type Bible, loadBible } from "@red-cup-engineering/fizzos/world-load";
import { FizzosScene, type CommandIntent } from "@red-cup-engineering/fizzos/scene";
import { demandFor } from "./director.mjs";
import { FARSTONE_GAME } from "./farstone-game.mjs";

test("demandFor: a hungry NPC asks for food and pays more the more desperate it is", () => {
  assert.equal(demandFor(5), null, "the sated ask for nothing");
  const d = demandFor(18);
  assert.equal(d?.want, "edible");
  assert.ok((d?.reward ?? 0) > (demandFor(14)?.reward ?? 0), "hunger raises the reward");
});

const HARBOR: Bible = {
  rooms: [{ id: "quay", name: "Quay", description: "Granite and tar.", tags: ["place", "harbor", "outdoor"] }],
  npcs: [{ id: "greer", name: "Greer Tenn", description: "A fishwife, gone gaunt.", location: "quay", tags: ["npc", "faction:fishers"] }],
  items: [{ id: "fish1", name: "a fresh fish", description: "Silver off the bank.", location: "giver", tags: ["item", "takeable", "edible", "fish"] }],
};

test("a starving NPC posts a demand the give-machinery completes", () => {
  const { world: w, content } = loadBible(HARBOR);
  const s = new FizzosScene(tell(w, [{ e: "greer", a: "need:hunger", v: "16" }]), content, "quay", FARSTONE_GAME);
  s.join("giver", "quay");

  let posted = false;
  for (let t = 1; t <= 6 && !posted; t++) { s.runTick(t, []); posted = valueOf(s.currentWorld(), "greer", "wants") === "edible"; }
  assert.ok(posted, "the Director read Greer's hunger and posted a demand");

  const { events: je } = s.runTick(7, [{ k: "command", actor: "giver", line: "quests" } satisfies CommandIntent]);
  const journal = je.filter((e) => e.k === "message" && e.to === "giver").map((e) => (e as { text: string }).text).join("\n");
  assert.match(journal, /Greer Tenn needs something to eat/, "the demand is a visible errand");

  const coinBefore = numberOf(s.currentWorld(), "giver", "coin", 0);
  const hungerBefore = numberOf(s.currentWorld(), "greer", "need:hunger", 0);
  const { events: ge } = s.runTick(8, [{ k: "command", actor: "giver", line: "give fish to greer" } satisfies CommandIntent]);
  const reply = ge.filter((e) => e.k === "message" && e.to === "giver").map((e) => (e as { text: string }).text).join("\n");

  assert.match(reply, /presses .* coin into your hand/, "fulfilling the demand pays the reward");
  assert.equal(valueOf(s.currentWorld(), "greer", "wants"), "", "the demand is discharged");
  assert.ok(numberOf(s.currentWorld(), "giver", "coin", 0) > coinBefore, "the giver is paid");
  assert.ok(numberOf(s.currentWorld(), "greer", "need:hunger", 0) < hungerBefore, "and Greer is relieved");
  assert.ok(standingOf(s.currentWorld(), "giver", "fishers") > 0, "a kindness lifts standing with her fellowship");
});

test("a storm writes a breakwater-timber errand that pays and lifts the Watch", () => {
  const bible: Bible = {
    rooms: [{ id: "quay", name: "Quay", description: "Granite.", tags: ["place", "harbor", "outdoor"] }],
    npcs: [{ id: "mara", name: "Sergeant Mara Quill", description: "The Watch.", location: "quay", tags: ["npc", "faction:watch", "coin:200"] }],
    items: [{ id: "baulk", name: "a baulk of timber", description: "Seasoned oak.", location: "hauler", tags: ["item", "takeable", "timber"] }],
  };
  const { world: w, content } = loadBible(bible);
  const s = new FizzosScene(tell(w, [{ e: "the-world", a: "world-time", v: "5" }, { e: "the-world", a: "weather", v: "storm" }]), content, "quay", FARSTONE_GAME);
  s.join("hauler", "quay");
  let posted = false;
  for (let t = 1; t <= 6 && !posted; t++) { s.runTick(t, []); posted = valueOf(s.currentWorld(), "mara", "wants") === "timber"; }
  assert.ok(posted, "the storm authored the breakwater-timber errand on the Watch");

  const before = standingOf(s.currentWorld(), "hauler", "watch");
  const { events } = s.runTick(7, [{ k: "command", actor: "hauler", line: "give baulk to mara" } satisfies CommandIntent]);
  const reply = events.filter((e) => e.k === "message" && e.to === "hauler").map((e) => (e as { text: string }).text).join("\n");
  assert.match(reply, /presses .* coin into your hand/, "delivering timber pays the reward");
  assert.ok(standingOf(s.currentWorld(), "hauler", "watch") > before, "and earns favour with the Watch");
});
