import type { Attributes } from "../calculator/attributes";
import { AttackPowerType } from "../calculator/attackPowerTypes";
import type { Weapon } from "../calculator/weapon";
import getWeaponAttack from "../calculator/calculator";
import type { ObjectiveWeights } from "./types";

// Calculates a score for a given build configuration based on objectives
export function calculateBuildScore(
    attributes: Attributes,
    weapons: Weapon[], // Changed from weapon: Weapon
    upgradeLevel: number,
    objectiveWeights: ObjectiveWeights,
    weaponWeights: Record<string, number> // Add weaponWeights parameter
): number {
    let totalScore = 0;

    // Iterate over each selected weapon
    for (const weapon of weapons) {
        let weaponScore = 0;

        // Get attack power and status effects for the current weapon and attributes
        const attackResult = getWeaponAttack({
            weapon,
            attributes,
            upgradeLevel,
            twoHanding: false, // TODO: Make this configurable later?
        });

        // --- Score based on Attack Power --- (
        if (objectiveWeights.attackPower) {
            for (const [typeStr, weight] of Object.entries(objectiveWeights.attackPower)) {
                const type = Number(typeStr) as AttackPowerType;
                const attackValue = attackResult.attackPower[type] ?? 0;
                // Penalize heavily if requirements aren't met for this damage type
                const penalty = attackResult.ineffectiveAttackPowerTypes.includes(type) ? 0.1 : 1;
                weaponScore += attackValue * weight * penalty;
            }
        }

        // --- Score based on Status Effect Buildup --- (
        // Note: Status effects are also under attackResult.attackPower in current structure
        if (objectiveWeights.statusEffect) {
            for (const [typeStr, weight] of Object.entries(objectiveWeights.statusEffect)) {
                const type = Number(typeStr) as AttackPowerType;
                // Status effects often use specific keys (like 7 for Bleed)
                const statusValue = attackResult.attackPower[type] ?? 0;
                // Requirement penalty might not apply directly to status, TBC
                // const penalty = attackResult.ineffectiveAttackPowerTypes.includes(type) ? 0.1 : 1;
                weaponScore += statusValue * weight;
            }
        }

        // --- Score based on Spell Scaling --- (
        if (objectiveWeights.spellScaling && (weapon.sorceryTool || weapon.incantationTool)) {
            for (const [typeStr, weight] of Object.entries(objectiveWeights.spellScaling)) {
                const type = Number(typeStr) as AttackPowerType;
                const scalingValue = attackResult.spellScaling[type] ?? 0;
                // Apply requirement penalty here too?
                const penalty = attackResult.ineffectiveAttackPowerTypes.includes(type) ? 0.1 : 1;
                weaponScore += scalingValue * weight * penalty;
            }
        }

        // --- Penalties for Not Meeting Attribute Requirements --- (
        let requirementPenalty = 0;
        // Iterate through the list of ineffective attributes, not the attributes themselves
        for (const _ of attackResult.ineffectiveAttributes) { // Use _ as variable is unused
            // Apply a large negative penalty for each unmet requirement
            requirementPenalty -= 1000000000; // Very large penalty
        }
        weaponScore += requirementPenalty;

        // Get the specific weight for this weapon (default to 1 if not found)
        const weightForThisWeapon = weaponWeights[weapon.name] ?? 1;

        // Add the weighted score for this weapon to the total
        totalScore += weaponScore * weightForThisWeapon;
    }

    // Could apply further global adjustments here (e.g., bonus for meeting Vigor goals?)

    // Return the average score across all weapons?
    // Or the total sum? Let's use the sum for now.
    return totalScore;
} 