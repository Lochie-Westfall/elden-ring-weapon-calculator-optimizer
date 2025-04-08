import { allAttributes, type Attributes } from "../../calculator/attributes";
// import type { EvaluateBuildScore } from "../types"; // Removed unused import
import type { OptimizerStrategy } from "./interface";
// Removed unused import
// import type { Weapon } from "../../calculator/weapon"; 

// Greedy strategy: Iteratively adds points to the attribute that gives the biggest score increase.
export const greedyAllocateStrategy: OptimizerStrategy = (
    initialAttributes,
    pointsToAllocate,
    minimumAttributes, // Keep minimums for potential future use (e.g., soft caps)
    evaluateScore, // Expects (attributes, weapons) => number
    weapons // Added weapons parameter
) => {
    // eslint-disable-next-line prefer-const
    let currentAttributes = { ...initialAttributes };
    let pointsRemaining = pointsToAllocate;

    while (pointsRemaining > 0) {
        let bestAttribute: keyof Attributes | null = null;
        let bestScoreIncrease = -Infinity;
        // Pass weapons to evaluateScore, use const for currentScore
        const currentScore = evaluateScore(currentAttributes, weapons);

        for (const attr of allAttributes) {
            if (currentAttributes[attr] >= 99) continue; // Skip attributes already at hard cap

            const nextAttributes = { ...currentAttributes };
            nextAttributes[attr] += 1;

            // Re-evaluate score with the potential point allocation
            // Pass weapons to evaluateScore
            const nextScore = evaluateScore(nextAttributes, weapons);
            const scoreIncrease = nextScore - currentScore;

            if (scoreIncrease > bestScoreIncrease) {
                bestScoreIncrease = scoreIncrease;
                bestAttribute = attr;
            }
        }

        // If no attribute provides a positive score increase, stop allocating points.
        // Allow zero increase to handle plateaus or exact target levels.
        if (bestAttribute === null || bestScoreIncrease < 0) {
            break;
        }

        // Allocate the point to the best attribute found.
        currentAttributes[bestAttribute] += 1;
        pointsRemaining -= 1;
    }

    // The strategy itself doesn't return the score, just the attributes.
    // The final score is calculated once in optimizeBuild.
    return currentAttributes;
}; 