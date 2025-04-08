import type { Attributes } from "../calculator/attributes";
import type { Weapon } from "../calculator/weapon";
import type { AttackPowerType, WeaponAttackResult } from "../calculator/calculator";
// Restore import and use StartingClass type
import { StartingClass } from "./utils";

// Input parameters for the optimization process
export interface OptimizerInput {
    startingClass: StartingClass; // Use StartingClass enum/type
    targetLevel: number;
    weapon: Weapon; // The specific weapon instance to optimize for
    upgradeLevel: number;
    objectiveWeights: ObjectiveWeights; // User-defined weights for scoring
    minimumAttributes: Partial<Attributes>; // Add minimum attributes
    // constraints?: BuildConstraints; // Optional: Max equip load, required spells etc. (Future)
}

// Weights defining the optimization objective
// Allow numbers between 0 and 1 (or more) to represent priority
export interface ObjectiveWeights {
    attackPower: Partial<Record<AttackPowerType, number>>;
    statusEffect: Partial<Record<AttackPowerType, number>>; // Assuming status types are also AttackPowerType
    spellScaling: Partial<Record<AttackPowerType, number>>;
    // Could add Vigor, Mind, Endurance weights later if needed
}

// The result of the optimization
export interface OptimizerResult {
    optimizedAttributes: Attributes;
    finalScore: number;
    attackResult: WeaponAttackResult; // The detailed attack breakdown for the final attributes
    startingAttributes: Attributes; // For comparison
    startingLevel: number;
}

// Function signature for evaluating a build's score based on attributes
export type EvaluateBuildScore = (attributes: Attributes) => number; 