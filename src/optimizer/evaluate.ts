import type { Attributes } from "../calculator/attributes";
import type { Weapon } from "../calculator/weapon";
import getWeaponAttack, {
    AttackPowerType,
    allDamageTypes,
    allStatusTypes,
} from "../calculator/calculator";
import type { ObjectiveWeights } from "./types";

// Calculates a single score based on the build's performance and objective weights
export function calculateBuildScore(
    attributes: Attributes,
    weapon: Weapon,
    upgradeLevel: number,
    weights: ObjectiveWeights,
    // Could add spell catalysts, selected spells etc. here later
): number {
    const attackResult = getWeaponAttack({
        weapon,
        attributes,
        upgradeLevel,
        twoHanding: false, // TODO: Make this configurable?
    });

    let score = 0;
    const { attackPower, spellScaling, ineffectiveAttributes } = attackResult;

    // Apply a heavy penalty if core requirements are not met
    if (ineffectiveAttributes.length > 0) {
        let requirementPenalty = false;
        for (const attr of ineffectiveAttributes) {
            // Check if the ineffective attribute affects any scaling for this weapon
            // This is a simplified check; a more precise check would involve the weights.
            const affectsScaling = Object.values(AttackPowerType).some(type =>
                weapon.attackElementCorrect[type]?.[attr]
            );
            if (affectsScaling) {
                requirementPenalty = true;
                break;
            }
        }
        if (requirementPenalty) {
            return -1e9; // Very large negative score to avoid invalid builds
        }
    }

    // Combine all relevant types for iteration
    const relevantTypes = [
        ...allDamageTypes,
        ...allStatusTypes,
        // Add any other types if necessary (e.g., for spell scaling if different)
    ];

    // Score from Attack Power, Status, and Spell Scaling using weights
    for (const type of relevantTypes) {
        const apWeight = weights.attackPower?.[type] ?? 0;
        const statusWeight = weights.statusEffect?.[type] ?? 0;
        const scalingWeight = weights.spellScaling?.[type] ?? 0;

        if (apWeight > 0) {
            score += (attackPower[type] ?? 0) * apWeight;
        }
        if (statusWeight > 0) {
            // Assuming status buildup is also in attackPower for relevant types
            score += (attackPower[type] ?? 0) * statusWeight;
        }
        if (scalingWeight > 0) {
            score += (spellScaling[type] ?? 0) * scalingWeight;
        }
    }

    // Add potential weights for Vigor/Mind/Endurance here if needed
    // score += (attributes.vig * (weights.defensive?.vig ?? 0));

    return score;
} 