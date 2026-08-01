/** "The Off-Season" — Farstone's founding campaign, and its `campaignView` hook for
 * `@red-cup-engineering/fizzos/game`'s `GameDefinition.campaignView`. */
import type { Campaign, CampaignView } from "@red-cup-engineering/fizzos/campaign";
import type { World } from "@red-cup-engineering/fizzos/world";
import { valueOf } from "@red-cup-engineering/fizzos/world";

export const OFF_SEASON: Campaign = Object.freeze({
  id: "off-season",
  name: "The Off-Season",
  stages: Object.freeze([
    { id: "feet", title: "Find Your Feet", task: "Make 60 coin on the lean waterfront — trade, fish, or work.", reward: 25, done: (v: CampaignView) => v.coin >= 60 },
    { id: "trade", title: "A Trade in Hand", task: "Train any skill to apprentice (level 15) by doing the work.", reward: 30, done: (v: CampaignView) => v.topSkill >= 15 },
    { id: "eye", title: "A Keener Eye", task: "Internalize a Thought — let the island reshape how you see.", reward: 30, done: (v: CampaignView) => v.thoughtsFixed >= 1 },
    { id: "roof", title: "A Roof of Your Own", task: "Raise a structure of your own — gather the materials and build.", reward: 40, done: (v: CampaignView) => v.ownsBuilt },
    { id: "permit", title: "A Hand in the Dispute", task: "See the dredging-permit dispute resolved — by your petition or another's.", reward: 50, done: (v: CampaignView) => v.permitResolved },
    { id: "pillar", title: "Pillar of the Harbor", task: "Win a faction's friendship (standing 40+). Become someone Farstone reckons with.", reward: 80, done: (v: CampaignView) => v.topStanding >= 40 },
  ]),
});

/** Reads the dredging-permit dispute's resolution off the world, for `CampaignView.permitResolved`. */
export function farstoneCampaignView(w: World, _actor: string): Partial<CampaignView> {
  const permit = valueOf(w, "the-dredging-permit", "decision-status");
  return { permitResolved: permit !== null && permit !== "contested" };
}
