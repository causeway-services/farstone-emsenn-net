/** Farstone's Thought Cabinet catalog, for `@red-cup-engineering/fizzos/thoughts`'s `Thought[]` mechanism. */
import type { Thought } from "@red-cup-engineering/fizzos/thoughts";

export const THOUGHTS: readonly Thought[] = Object.freeze([
  {
    id: "the-held-permit", name: "The Permit That Won't Resolve",
    premise: "You have seen the world hold a thing and its opposite at once, and not break.",
    conclusion: "You stop needing contradictions to resolve. You can hold two truths and keep walking — and you see the seams in everything now.",
    ticks: 20, effects: { "faculty:logic": 2, "faculty:inland-empire": 2 },
    available: (s) => s.seenContradiction,
  },
  {
    id: "off-season-mind", name: "Off-Season Mind",
    premise: "The lean cold has worn at you, the way it wears at everyone on this rock.",
    conclusion: "You have gone hard against the season. You endure more — and feel others' troubles a little less.",
    ticks: 30, effects: { "faculty:endurance": 3, "faculty:empathy": -1 },
    available: (s) => s.season === "winter" || s.season === "autumn",
  },
  {
    id: "salt-in-the-blood", name: "Salt in the Blood",
    premise: "Your hands know the work now — the net, the line, the squared stone.",
    conclusion: "The craft has settled into you. The island speaks to you through your hands, and your eye misses less.",
    ticks: 25, effects: { "faculty:shivers": 2, "faculty:perception": 2 },
    available: (s) => s.topSkill >= 20,
  },
  {
    id: "grey-eyed-lady", name: "The Grey-Eyed Lady",
    premise: "You have kept the chapel's quiet, and felt the tide answer in you.",
    conclusion: "Maraset's calm is in you now. You read others gently, and the harbor itself speaks plainer.",
    ticks: 30, effects: { "faculty:shivers": 1, "faculty:empathy": 2 },
    available: (s) => s.chapelStanding >= 20,
  },
  {
    id: "marsh-knowing", name: "Marsh-Knowing",
    premise: "You have taken the marsh-witch's road, where reason thins and other things speak.",
    conclusion: "You know things you cannot argue. The uncanny is louder; cold logic, quieter.",
    ticks: 30, effects: { "faculty:inland-empire": 3, "faculty:logic": -1 },
    available: (s) => s.marshStanding >= 20,
  },
]);
