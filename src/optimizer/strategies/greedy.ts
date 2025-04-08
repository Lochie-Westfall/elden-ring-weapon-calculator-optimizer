import { allAttributes, type Attributes } from "../../calculator/attributes";
// import type { EvaluateBuildScore } from "../types";
import type { OptimizerStrategy } from "./interface";

export const greedyAllocateStrategy: OptimizerStrategy = (
    initialAttributes,
    pointsToAllocate,
    minimumAttributes, // Renamed, but NOT used as a cap here
    evaluateScore // The pre-configured scoring function
) => {
    let currentAttributes = { ...initialAttributes };
    let pointsLeft = pointsToAllocate;

    // Pre-calculate initial score to compare against
    let bestScore = evaluateScore(currentAttributes);

    while (pointsLeft > 0) {
        let bestAttributeToIncrease: keyof Attributes | null = null;
        let maxScoreIncrease = bestScore; // Use current best score as baseline
        let foundImprovement = false;

        // Iterate through each attribute to find the best single point allocation
        for (const attribute of allAttributes) {
            // Use hard cap of 99, ignore minimums during allocation
            // const cap = attributeCaps[attribute] ?? 99;
            const cap = 99;

            // Check if attribute is already at or above its cap
            if (currentAttributes[attribute] >= cap) {
                continue;
            }

            // Create temporary attributes with one point added
            const tempAttributes = {
                ...currentAttributes,
                [attribute]: currentAttributes[attribute] + 1,
            };

            const currentScore = evaluateScore(tempAttributes);

            // Find the attribute that yields the absolute highest score
            if (currentScore > maxScoreIncrease) {
                maxScoreIncrease = currentScore;
                bestAttributeToIncrease = attribute;
                foundImprovement = true;
            }
            // Optional: Handle ties? (e.g., prioritize main scaling stats) - simple version picks first best
        }

        // If no attribute increase improved the score (e.g., hit all relevant caps), stop.
        if (!foundImprovement || !bestAttributeToIncrease) {
            // console.warn("Greedy allocation stopped: No further improvement found.");
            break;
        }

        // Reassign currentAttributes to the new best state found
        currentAttributes = {
            ...currentAttributes,
            [bestAttributeToIncrease]: currentAttributes[bestAttributeToIncrease] + 1
        };
        bestScore = maxScoreIncrease; // Update the best score
        pointsLeft--;
    }

    if (pointsLeft > 0) {
        console.warn(`Greedy allocation finished with ${pointsLeft} points unspent.`);
        // Optionally, distribute remaining points randomly or based on a simple heuristic?
        // For now, just leave them unspent.
    }

    return currentAttributes;
}; 