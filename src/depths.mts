/** The Underfarr's living machinery: monsters that respawn at their den, and a seeded
 * atmosphere of drips/skitters that deepens with depth. Content (rooms, monsters, hoards)
 * is bible data; this module owns only the systems that keep the dungeon dangerous. */
import type { GameSystem } from "@red-cup-engineering/fizzos/game";
import { numericTag } from "@red-cup-engineering/fizzos/world-load";
import { hashStr, rngFor } from "@red-cup-engineering/fizzos/world-clock";

/** A slain monster lies as a corpse this many ticks before the dark renews it. Overridable per-monster. */
export const DEFAULT_RESPAWN = 50;

/** Read a monster's home room from a `home:<room>` tag, or null when it dens where it stands. */
export function homeOf(tags: readonly string[]): string | null {
  const tag = tags.find((t) => t.startsWith("home:"));
  return tag === undefined ? null : tag.slice("home:".length);
}

/** A slain `monster` lies as a corpse until `respawn:<n>` ticks pass, then revives at its den —
 * the same entity, replay-exact. Dropped gear stays where it fell; only the threat returns. */
export const monsterRespawn: GameSystem = (ctx) => {
  for (const id of ctx.things()) {
    const tags = ctx.tagsOf(id);
    if (!tags.includes("monster")) continue;
    if (ctx.value(id, "condition") !== "dead") continue;
    const diedAt = ctx.number(id, "died-at", -1);
    if (diedAt < 0) {
      ctx.tell([{ e: id, a: "died-at", v: String(ctx.tick) }]);
      continue;
    }
    const delay = numericTag(tags, "respawn") ?? DEFAULT_RESPAWN;
    if (ctx.tick - diedAt < delay) continue;
    const home = homeOf(tags) ?? ctx.roomOf(id);
    const maxHealth = ctx.number(id, "max-health", ctx.number(id, "health", 10));
    ctx.tell([
      { e: id, a: "health", v: String(maxHealth) },
      { e: id, a: "condition", v: "alive" },
      { e: id, a: "died-at", v: "-1" },
    ]);
    if (home !== null) {
      ctx.place(id, home);
      ctx.broadcast(home, `Something stirs in the dark — ${ctx.nameOf(id)} is here again, as if it never fell.`);
    }
  }
};

const STIRRINGS: readonly (readonly string[])[] = Object.freeze([
  ["Water drips somewhere in the dark, counting time.", "Old timbers creak overhead, taking the weight of the mountain.", "Small claws scrabble away down an unseen drift.", "Your lamp gutters, and the shadows lean in."],
  ["A cold draught comes up from below, smelling of wet stone and older air.", "Far off, something heavy shifts and is still.", "The rock here is gnawed — by what, you would rather not know.", "A pebble falls into water you cannot see, and falls a long time."],
  ["The dead are stacked in the walls here, and the quiet has a listening quality.", "Dust sifts from a niche, though nothing moved it.", "A dry whisper runs along the bone-shelves and dies.", "Your own breath sounds like an intrusion."],
  ["The air is warm and wet and green-smelling, all wrong this far down.", "Spores drift across your lamp like slow snow.", "Something large breathes in the dark, slow and patient.", "Water moves against your boots, and the fungus glows a sickly blue."],
  ["The grey water is utterly still, and utterly deep.", "A bell that is not a bell tolls once, far under the stone.", "You feel watched by something with very old, very patient eyes.", "The cold here is not the cold of stone. It is the cold of the sea's bottom."],
]);

/** A seeded, depth-keyed atmosphere: a player in a `depth:<n>` room now and then hears the
 * place around them, deeper rooms speaking more often. Texture, never mechanics. */
export const deepStir: GameSystem = (ctx) => {
  for (const player of ctx.players()) {
    const room = ctx.roomOf(player);
    if (room === null) continue;
    const depthTag = ctx.tagsOf(room).find((t) => t.startsWith("depth:"));
    if (depthTag === undefined) continue;
    const depth = Number(depthTag.slice("depth:".length)) || 1;
    const lines = STIRRINGS[Math.min(depth, STIRRINGS.length) - 1] ?? STIRRINGS[0]!;
    const chance = 0.12 + 0.04 * depth;
    const key = hashStr(`${player}|${room}`);
    const roll = rngFor(key, ctx.tick, 1);
    if (roll < chance) {
      const which = Math.floor(rngFor(key, ctx.tick, 2) * lines.length) % lines.length;
      ctx.message(player, lines[which]!);
    }
  }
};

/** Farstone's depth systems, handed to the engine alongside the climate and director systems. */
export const DEPTHS_SYSTEMS: readonly GameSystem[] = Object.freeze([monsterRespawn, deepStir]);

/** The single-valued cell the respawn system settles — registered functional so traces compact. */
export const DEPTHS_FUNCTIONAL: readonly string[] = Object.freeze(["died-at"]);
