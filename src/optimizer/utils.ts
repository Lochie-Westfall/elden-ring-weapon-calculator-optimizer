import type { Attributes } from "../calculator/attributes";
import { allAttributes } from "../calculator/attributes";

export enum StartingClass {
    VAGABOND = "Vagabond",
    WARRIOR = "Warrior",
    HERO = "Hero",
    BANDIT = "Bandit",
    ASTROLOGER = "Astrologer",
    PROPHET = "Prophet",
    SAMURAI = "Samurai",
    PRISONER = "Prisoner",
    CONFESSOR = "Confessor",
    WRETCH = "Wretch",
}

export const startingClassStats: Record<StartingClass, { level: number, attributes: Attributes }> = {
    [StartingClass.VAGABOND]: { level: 9, attributes: { vig: 15, min: 10, end: 11, str: 14, dex: 13, int: 9, fai: 9, arc: 7 } },
    [StartingClass.WARRIOR]: { level: 8, attributes: { vig: 11, min: 12, end: 11, str: 10, dex: 16, int: 10, fai: 8, arc: 9 } },
    [StartingClass.HERO]: { level: 7, attributes: { vig: 14, min: 9, end: 12, str: 16, dex: 9, int: 7, fai: 8, arc: 11 } },
    [StartingClass.BANDIT]: { level: 5, attributes: { vig: 10, min: 11, end: 10, str: 9, dex: 13, int: 9, fai: 8, arc: 14 } },
    [StartingClass.ASTROLOGER]: { level: 6, attributes: { vig: 9, min: 15, end: 9, str: 8, dex: 12, int: 16, fai: 7, arc: 9 } },
    [StartingClass.PROPHET]: { level: 7, attributes: { vig: 10, min: 14, end: 8, str: 11, dex: 10, int: 7, fai: 16, arc: 10 } },
    [StartingClass.SAMURAI]: { level: 9, attributes: { vig: 12, min: 11, end: 13, str: 12, dex: 15, int: 9, fai: 8, arc: 8 } },
    [StartingClass.PRISONER]: { level: 9, attributes: { vig: 11, min: 12, end: 11, str: 11, dex: 14, int: 14, fai: 6, arc: 9 } },
    [StartingClass.CONFESSOR]: { level: 10, attributes: { vig: 10, min: 13, end: 10, str: 12, dex: 12, int: 9, fai: 14, arc: 9 } },
    [StartingClass.WRETCH]: { level: 1, attributes: { vig: 10, min: 10, end: 10, str: 10, dex: 10, int: 10, fai: 10, arc: 10 } },
};

/**
 * Calculates the character level based on attributes.
 * Assumes the provided attributes are valid (e.g., >= base stats for some class).
 * This formula is derived from how levels are calculated in Souls games:
 * Level = BaseLevel + Sum(Attribute Points Spent)
 * Each point costs 1 level.
 */
export function calculateLevel(attributes: Attributes): number {
    // Find the starting class that requires the lowest sum of spent points
    // (This handles cases where stats might match multiple classes exactly or exceed them)
    let minLevel = Infinity;

    for (const className of Object.values(StartingClass)) {
        const baseInfo = startingClassStats[className];
        let pointsSpent = 0;
        let possibleClass = true;
        for (const attr of allAttributes) {
            const spentOnAttr = attributes[attr] - baseInfo.attributes[attr];
            if (spentOnAttr < 0) {
                possibleClass = false; // Attributes are lower than this class's base, invalid
                break;
            }
            pointsSpent += spentOnAttr;
        }

        if (possibleClass) {
            minLevel = Math.min(minLevel, baseInfo.level + pointsSpent);
        }
    }
    // If no class matches (e.g., stats below Wretch), return 1 or throw error?
    // Returning Wretch level as a fallback, though technically invalid input.
    return minLevel === Infinity ? 1 : minLevel;

}

/**
 * Gets the base attributes and level for a chosen starting class.
 */
export function getStartingStats(className: StartingClass): { level: number, attributes: Attributes } {
    return startingClassStats[className];
} 