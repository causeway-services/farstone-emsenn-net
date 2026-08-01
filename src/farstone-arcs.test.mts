/** The dredging-permit and Hydrant-23 arcs: contested situations the world holds open until
 * the player resolves them, with an irreversible consequence. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { tell, valueOf, numberOf } from "@red-cup-engineering/fizzos/world";
import { type Bible, loadBible } from "@red-cup-engineering/fizzos/world-load";
import { FizzosScene, type CommandIntent } from "@red-cup-engineering/fizzos/scene";
import { FARSTONE_GAME } from "./farstone-game.mjs";

const ISLAND: Bible = {
  rooms: [
    { id: "downtown", name: "Downtown", description: "The civic blocks.", exits: { south: "marsh" }, tags: ["place", "town", "civic", "outdoor"] },
    { id: "marsh", name: "The Salt Marsh", description: "Spartina and the clam bed.", exits: { north: "downtown" }, tags: ["place", "marsh", "outdoor", "shellfish"] },
  ],
  npcs: [
    { id: "coilin-vey", name: "Coilin Vey", description: "Wants the dredge.", location: "downtown", tags: ["npc", "faction:fishers"] },
    { id: "brannaugh-ross", name: "Brannaugh Ross", description: "Works the clam bed.", location: "marsh", tags: ["npc", "faction:fishers"] },
  ],
};

const file = (line: string, where: string) => {
  const { world, content } = loadBible(ISLAND);
  const s = new FizzosScene(tell(world, [{ e: "the-dredging-permit", a: "decision-status", v: "contested" }]), content, where, FARSTONE_GAME);
  s.join("citizen", where);
  s.runTick(1, []);
  const { events } = s.runTick(2, [{ k: "command", actor: "citizen", line } satisfies CommandIntent]);
  const text = events.filter((e) => e.k === "message" && e.to === "citizen").map((e) => (e as { text: string }).text).join("\n");
  return { s, text };
};

test("you can only petition at the civic office", () => {
  const { s, text } = file("petition brannaugh", "marsh");
  assert.match(text, /records clerk's office/);
  assert.equal(valueOf(s.currentWorld(), "the-dredging-permit", "decision-status"), "contested");
});

test("petitioning for Brannaugh spares the clam bed and sours Coilin", () => {
  const { s, text } = file("petition brannaugh", "downtown");
  assert.match(text, /clam bed is spared/);
  assert.equal(valueOf(s.currentWorld(), "the-dredging-permit", "decision-status"), "denied");
  assert.equal(valueOf(s.currentWorld(), "marsh", "shellfish-closed"), null);
  assert.equal(valueOf(s.currentWorld(), "coilin-vey", "embittered"), "true");
});

test("petitioning for Coilin cuts the channel and fouls the clam bed forever", () => {
  const { s, text } = file("petition coilin", "downtown");
  assert.match(text, /silt will choke the marsh clam bed/);
  assert.equal(valueOf(s.currentWorld(), "the-dredging-permit", "decision-status"), "granted");
  assert.equal(valueOf(s.currentWorld(), "marsh", "shellfish-closed"), "true");
  assert.ok(numberOf(s.currentWorld(), "marsh", "pollution", 0) >= 8);
  assert.equal(valueOf(s.currentWorld(), "brannaugh-ross", "embittered"), "true");
});

test("Hydrant-23 is a contested held cell under a precautionary advisory until re-inspected", () => {
  const bible: Bible = { rooms: [{ id: "downtown", name: "Downtown", description: "Civic.", tags: ["place", "town", "civic", "outdoor"] }] };
  const { world, content } = loadBible(bible);
  const s = new FizzosScene(tell(world, [{ e: "the-world", a: "world-seed", v: "5" }, { e: "hydrant-23", a: "water-quality", v: "contested" }, { e: "hydrant-23", a: "advisory", v: "boil-water" }]), content, "downtown", FARSTONE_GAME);
  s.join("clerk", "downtown");
  const { events } = s.runTick(1, [{ k: "command", actor: "clerk", line: "audit hydrant-23" } satisfies CommandIntent]);
  const reply = events.filter((e) => e.k === "message" && e.to === "clerk").map((e) => (e as { text: string }).text).join("\n");
  assert.match(reply, /re-inspection/);
  const settled = valueOf(s.currentWorld(), "hydrant-23", "water-quality");
  assert.ok(settled === "pass" || settled === "fail");
  const advisory = valueOf(s.currentWorld(), "hydrant-23", "advisory");
  assert.equal(advisory, settled === "pass" ? "clear" : "boil-water");
  const { events: e2 } = s.runTick(2, [{ k: "command", actor: "clerk", line: "audit hydrant-23" } satisfies CommandIntent]);
  assert.match(e2.filter((e) => e.k === "message").map((e) => (e as { text: string }).text).join("\n"), /settled/);
});

test("you can only dispatch a re-inspection from the civic office", () => {
  const bible: Bible = { rooms: [{ id: "marsh", name: "Marsh", description: "Off the map.", tags: ["place", "marsh", "outdoor"] }] };
  const { world, content } = loadBible(bible);
  const s = new FizzosScene(tell(world, [{ e: "hydrant-23", a: "water-quality", v: "contested" }]), content, "marsh", FARSTONE_GAME);
  s.join("clerk", "marsh");
  const { events } = s.runTick(1, [{ k: "command", actor: "clerk", line: "audit hydrant-23" } satisfies CommandIntent]);
  assert.match(events.filter((e) => e.k === "message").map((e) => (e as { text: string }).text).join("\n"), /records clerk's office/);
});

test("once settled, the dispute stays settled", () => {
  const { s } = file("petition coilin", "downtown");
  const { events } = s.runTick(3, [{ k: "command", actor: "citizen", line: "petition brannaugh" } satisfies CommandIntent]);
  const text = events.filter((e) => e.k === "message" && e.to === "citizen").map((e) => (e as { text: string }).text).join("\n");
  assert.match(text, /already settled \(granted\)/);
});
