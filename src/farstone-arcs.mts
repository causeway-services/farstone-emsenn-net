/** Farstone's standing story arcs: the dredging-permit petition, and the Hydrant-23 re-inspection. */
import type { GameCommand } from "@red-cup-engineering/fizzos/game";
import { hashStr, rngFor } from "@red-cup-engineering/fizzos/world-clock";

const PERMIT = "the-dredging-permit";

/** `petition` — file for or against the dredging permit at the civic office. Irreversible. */
export const petition: GameCommand = (ctx, actor, arg) => {
  const side = arg.trim().toLowerCase();
  if (ctx.value(PERMIT, "decision-status") !== "contested") {
    const settled = ctx.value(PERMIT, "decision-status");
    return settled === null ? "There is no live petition to file." : `Application 23 is already settled (${settled}); the clerk waves you off.`;
  }
  const room = ctx.roomOf(actor);
  if (room === null || !ctx.tagsOf(room).includes("civic")) {
    return "You can only file a petition at the records clerk's office — downtown, in the civic blocks.";
  }
  if (/coilin|dredge|grant|channel/.test(side)) {
    ctx.tell([{ e: PERMIT, a: "decision-status", v: "granted" }]);
    for (const r of ctx.rooms()) {
      if (ctx.tagsOf(r).includes("shellfish")) {
        ctx.tell([
          { e: r, a: "pollution", v: String(ctx.number(r, "pollution", 0) + 8) },
          { e: r, a: "shellfish-closed", v: "true" },
        ]);
      }
    }
    if (ctx.things().includes("brannaugh-ross")) ctx.tell([{ e: "brannaugh-ross", a: "embittered", v: "true" }]);
    return "You file in favour of the dredge. The channel will be cut — and the silt will choke the marsh clam bed. Coilin's cause carries; Brannaugh's ground is lost, and she will not forget it.";
  }
  if (/brannaugh|clam|deny|marsh|refuse/.test(side)) {
    ctx.tell([{ e: PERMIT, a: "decision-status", v: "denied" }]);
    if (ctx.things().includes("coilin-vey")) ctx.tell([{ e: "coilin-vey", a: "embittered", v: "true" }]);
    return "You file against the dredge. The clam bed is spared and the deep-water channel stays a dream. Brannaugh's cause carries; Coilin seethes, and the feud takes that shape.";
  }
  return "Petition for whom? 'petition coilin' (grant the dredge) or 'petition brannaugh' (spare the clam bed). Choose, and the world will hold to it.";
};

/** `audit` / `recheck` / `reinspect` — dispatch a re-inspection of a contested water-quality cell. */
export const inspect: GameCommand = (ctx, actor, arg) => {
  const target = (arg.trim().toLowerCase().replace(/\s+/g, "-") || "hydrant-23");
  const status = ctx.value(target, "water-quality");
  if (status !== "contested") {
    return status === null ? `There is no contested inspection at "${target}". (try 'inspect hydrant-23')` : `${target.replace(/-/g, " ")} is settled (${status}); no re-inspection is needed.`;
  }
  const room = ctx.roomOf(actor);
  if (room === null || !ctx.tagsOf(room).includes("civic")) {
    return "Re-inspections are dispatched from the records clerk's office — downtown, in the civic blocks.";
  }
  const pass = rngFor(ctx.number("the-world", "world-seed", 1), hashStr(target)) > 0.4;
  ctx.tell([
    { e: target, a: "water-quality", v: pass ? "pass" : "fail" },
    { e: target, a: "advisory", v: pass ? "clear" : "boil-water" },
  ]);
  return pass
    ? `You dispatch a re-inspection of ${target.replace(/-/g, " ")}. The re-test comes back clean — the contradiction resolves to a pass, and the boil-water advisory lifts.`
    : `You dispatch a re-inspection of ${target.replace(/-/g, " ")}. The re-test confirms the fail — the advisory stands, and the source of the contamination must be found.`;
};
