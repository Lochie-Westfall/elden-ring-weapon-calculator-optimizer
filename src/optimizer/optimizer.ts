import { calculateBuildScore } from "./evaluate";
import type { OptimizerInput, OptimizerResult, EvaluateBuildScore } from "./types";
import type { OptimizerStrategy } from "./strategies/interface";
import { greedyAllocateStrategy } from "./strategies/greedy"; // Default strategy
import type { Attributes } from "../calculator/attributes";
import { allAttributes } from "../calculator/attributes"; // Import allAttributes
import getWeaponAttack from "../calculator/calculator";
import { getStartingStats } from "./utils"; // Use getStartingStats
import type { Weapon } from "../calculator/weapon"; // Import Weapon type

// Main function to run the optimization process
export function optimizeBuild(
    input: OptimizerInput,
    // Allow passing a different strategy function
    strategy: OptimizerStrategy = greedyAllocateStrategy
    // Remove extra parameter, minimumAttributes is in input
): OptimizerResult {
    console.log('--- optimizeBuild START ---');
    console.log('Input:', JSON.stringify(input, null, 2));

    // Use getStartingStats
    const { level: classStartingLevel, attributes: classStartingAttributes } = getStartingStats(input.startingClass);
    // Use const for level as it's not reassigned here
    const initialLevel = classStartingLevel;
    const initialAttributes = classStartingAttributes;
    console.log('Initial Class Attributes:', JSON.stringify(initialAttributes, null, 2));
    console.log('Initial Class Level:', initialLevel);

    // Use input.weapons (array)
    const selectedWeaponsDetails = input.weapons;

    // Calculate minimums based on ALL selected weapons
    const actualStartingAttributes: Attributes = { ...initialAttributes };
    let levelAfterMinimums = initialLevel;

    allAttributes.forEach((attr) => {
        const classStat = initialAttributes[attr];
        const minimumStatInput = input.minimumAttributes[attr] ?? 0;
        // Find the highest requirement across all selected weapons for this attribute
        const maxWeaponRequirement = Math.max(0, ...selectedWeaponsDetails.map(w => w.requirements[attr] ?? 0));

        const requiredStat = Math.max(classStat, minimumStatInput, maxWeaponRequirement);
        actualStartingAttributes[attr] = requiredStat;

        if (requiredStat > classStat) {
            levelAfterMinimums += requiredStat - classStat;
        }
    });
    console.log('Actual Starting Attributes (after minimums/reqs):', JSON.stringify(actualStartingAttributes, null, 2));
    console.log('Level after minimums/reqs:', levelAfterMinimums);

    // If target level is below the level needed for minimums, just return minimums
    if (input.targetLevel < levelAfterMinimums) {
        console.warn('Target level is lower than required for minimum/weapon stats. Returning minimums.');
        const score = calculateBuildScore(
            actualStartingAttributes,
            selectedWeaponsDetails,
            input.upgradeLevel,
            input.objectiveWeights,
            input.weaponWeights
        );
        // Get detailed attack for the first weapon only
        const attackResult = getWeaponAttack({
            weapon: selectedWeaponsDetails[0],
            attributes: actualStartingAttributes,
            upgradeLevel: input.upgradeLevel,
            twoHanding: false,
        });
        console.log('--- optimizeBuild END (target level too low) ---');
        return {
            optimizedAttributes: actualStartingAttributes,
            finalScore: score,
            attackResult: attackResult,
            startingAttributes: initialAttributes,
            startingLevel: initialLevel,
        };
    }

    const pointsToAllocate = input.targetLevel - levelAfterMinimums;
    console.log('Points to Allocate:', pointsToAllocate);

    // Define the evaluation function for the strategy - must match EvaluateBuildScore signature
    const evaluate: EvaluateBuildScore = (attributes: Attributes, weaponsToEvaluate: Weapon[] = selectedWeaponsDetails) =>
        calculateBuildScore(
            attributes,
            weaponsToEvaluate,
            input.upgradeLevel,
            input.objectiveWeights,
            input.weaponWeights
        );

    // Run the optimization strategy
    const optimizedAttributes = strategy(
        actualStartingAttributes,
        pointsToAllocate,
        input.minimumAttributes,
        evaluate, // Pass the evaluate function expecting (attrs, weapons)
        selectedWeaponsDetails // Pass the weapons array itself
    );

    console.log('Optimized Attributes from Strategy:', JSON.stringify(optimizedAttributes, null, 2));
    // Evaluate final score with all weapons by calling evaluate directly
    const finalScore = evaluate(optimizedAttributes, selectedWeaponsDetails);
    console.log('Score from Strategy:', finalScore);
    console.log('--- optimizeBuild END ---');

    // Get detailed attack result for the *first* weapon for display
    const attackResult = getWeaponAttack({
        weapon: selectedWeaponsDetails[0],
        attributes: optimizedAttributes,
        upgradeLevel: input.upgradeLevel,
        twoHanding: false,
    });

    return {
        optimizedAttributes,
        finalScore,
        attackResult: attackResult, // Result for first weapon
        startingAttributes: initialAttributes,
        startingLevel: initialLevel,
    };
} 