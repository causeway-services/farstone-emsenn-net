/** Farstone's emergent quest Director: mints standing demands off the live simulation's own
 * pressure (hunger, storms, a trade's standing supply need) rather than authored quests. */
import type { GameSystem } from "@red-cup-engineering/fizzos/game";
import { hashStr } from "@red-cup-engineering/fizzos/world-clock";

/** The hunger at which an NPC will start asking strangers for food. */
export const HUNGER_DEMAND = 14;
/** The hunger at which a fed NPC withdraws its standing demand. */
export const HUNGER_SATED = 6;

/** What an NPC's needs would have it ask for — the demand the Director mints, or null. */
export function demandFor(hunger: number): { want: string; reward: number } | null {
  if (hunger >= HUNGER_DEMAND) return { want: "edible", reward: 5 + hunger };
  return null;
}

const ROLE_WANTS: readonly { readonly tag: string; readonly want: string; readonly reward: number }[] = Object.freeze([
  { tag: "innkeeper", want: "fish", reward: 10 },
  { tag: "smith", want: "iron", reward: 16 },
  { tag: "shopkeeper", want: "fish", reward: 9 },
  { tag: "lamp-keeper", want: "fiber", reward: 8 },
]);

/** A standing *supply* demand keyed on an NPC's trade (the inn wants fish, the smith iron). */
export function roleDemandFor(tags: readonly string[]): { want: string; reward: number } | null {
  const role = ROLE_WANTS.find((r) => tags.includes(r.tag));
  return role === undefined ? null : { want: role.want, reward: role.reward };
}

/** Each tick, a living NPC whose hunger crossed the threshold posts a standing food demand
 * (or withdraws it once fed); staggered by id so the harbor doesn't cry out all at once. */
export const farstoneDirector: GameSystem = (ctx) => {
  for (const npc of ctx.things()) {
    if (!ctx.tagsOf(npc).includes("npc") || ctx.value(npc, "condition") === "dead") continue;
    if (ctx.tick % 5 !== hashStr(npc) % 5) continue;
    const hunger = ctx.number(npc, "need:hunger", 0);
    const wants = ctx.value(npc, "wants") ?? "";
    const demand = demandFor(hunger) ?? roleDemandFor(ctx.tagsOf(npc));
    if (demand !== null && wants === "") {
      ctx.tell([{ e: npc, a: "wants", v: demand.want }, { e: npc, a: "want-reward", v: String(demand.reward) }]);
      const room = ctx.roomOf(npc);
      const cry = demand.want === "edible" ? `${ctx.nameOf(npc)} looks half-starved. "I'd see someone right for a bite of something."` : `${ctx.nameOf(npc)} calls out: "I'll pay for ${demand.want}, if you've any to spare."`;
      if (room !== null) ctx.broadcast(room, cry);
    } else if (demand === null && wants === "edible") {
      if (hunger < HUNGER_SATED) ctx.tell([{ e: npc, a: "wants", v: "" }, { e: npc, a: "want-reward", v: "0" }]);
    }
  }
};

/** When a storm closes the harbor, the Watch calls for breakwater timber — a demand that exists
 * only while the storm rages, and withdraws when it lifts. */
export const stormRecovery: GameSystem = (ctx) => {
  const stormClosed = ctx.value("the-world", "harbor-closed") === "true";
  for (const npc of ctx.things()) {
    if (!ctx.tagsOf(npc).includes("npc") || ctx.value(npc, "condition") === "dead") continue;
    const civic = ctx.tagsOf(npc).some((t) => t === "faction:watch" || t === "harbormaster" || t === "civic");
    if (!civic || ctx.tick % 5 !== hashStr(npc) % 5) continue;
    const wants = ctx.value(npc, "wants") ?? "";
    if (stormClosed && wants === "") {
      ctx.tell([{ e: npc, a: "wants", v: "timber" }, { e: npc, a: "want-reward", v: "30" }]);
      const room = ctx.roomOf(npc);
      if (room !== null) ctx.broadcast(room, `${ctx.nameOf(npc)} shouts over the gale: "The breakwater's taking damage — bring me timber and I'll pay well for it!"`);
    } else if (!stormClosed && wants === "timber") {
      ctx.tell([{ e: npc, a: "wants", v: "" }, { e: npc, a: "want-reward", v: "0" }]);
    }
  }
};

/** The single-valued cells the Director settles — registered functional so traces compact. */
export const FARSTONE_DIRECTOR_FUNCTIONAL: readonly string[] = Object.freeze(["wants", "want-reward"]);
