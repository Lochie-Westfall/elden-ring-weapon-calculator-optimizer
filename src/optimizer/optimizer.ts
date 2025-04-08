import { calculateBuildScore } from "./evaluate";
import type { OptimizerInput, OptimizerResult } from "./types";
import type { OptimizerStrategy } from "./strategies/interface";
import { greedyAllocateStrategy } from "./strategies/greedy"; // Default strategy
import type { Attributes } from "../calculator/attributes";
import { allAttributes } from "../calculator/attributes"; // Import allAttributes
import getWeaponAttack from "../calculator/calculator";
import { getStartingStats } from "./utils"; // Use getStartingStats

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

    // Use input.weapon directly
    const selectedWeaponDetails = input.weapon;
    // Remove check as weapon is guaranteed by type
    // if (!selectedWeaponDetails) { ... }

    // Calculate the actual starting attributes considering the minimums
    const actualStartingAttributes: Attributes = { ...initialAttributes };
    let levelAfterMinimums = initialLevel;

    allAttributes.forEach((attr) => {
        const classStat = initialAttributes[attr];
        // Access minimums from input object
        const minimumStat = input.minimumAttributes[attr] ?? 0;
        // Use the correct property name 'requirements'
        const weaponRequirement = selectedWeaponDetails.requirements[attr] ?? 0;

        // Use the highest of class stat, user minimum, or weapon requirement
        const requiredStat = Math.max(classStat, minimumStat, weaponRequirement);
        actualStartingAttributes[attr] = requiredStat;

        // Add points spent if we had to raise the stat above the class base
        if (requiredStat > classStat) {
            levelAfterMinimums += requiredStat - classStat;
        }
    });
    console.log('Actual Starting Attributes (after minimums/reqs):', JSON.stringify(actualStartingAttributes, null, 2));
    console.log('Level after minimums/reqs:', levelAfterMinimums);

    // If target level is below the level needed for minimums, just return minimums
    if (input.targetLevel < levelAfterMinimums) {
        console.warn('Target level is lower than required for minimum/weapon stats. Returning minimums.');
        // Correct calculateBuildScore call (remove affinityId)
        const score = calculateBuildScore(
            actualStartingAttributes,
            selectedWeaponDetails,
            input.upgradeLevel,
            input.objectiveWeights,
        );
        const attackResult = getWeaponAttack({
            weapon: selectedWeaponDetails,
            attributes: actualStartingAttributes,
            upgradeLevel: input.upgradeLevel,
            twoHanding: false, // Make configurable?
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

    // Define the evaluation function for the strategy
    // Correct calculateBuildScore call (remove affinityId)
    const evaluate = (attributes: Attributes) =>
        calculateBuildScore(
            attributes,
            selectedWeaponDetails,
            input.upgradeLevel,
            input.objectiveWeights,
        );

    // Run the optimization strategy
    // Pass input.minimumAttributes
    const optimizedAttributes = strategy(
        actualStartingAttributes, // Start allocation from *after* minimums are met
        pointsToAllocate,
        input.minimumAttributes, // Pass minimums from input
        evaluate
    );

    console.log('Optimized Attributes from Strategy:', JSON.stringify(optimizedAttributes, null, 2));
    const finalScore = evaluate(optimizedAttributes);
    console.log('Score from Strategy:', finalScore);
    console.log('--- optimizeBuild END ---');

    const attackResult = getWeaponAttack({
        weapon: selectedWeaponDetails,
        attributes: optimizedAttributes,
        upgradeLevel: input.upgradeLevel,
        twoHanding: false, // Make configurable?
    });

    return {
        optimizedAttributes,
        finalScore,
        attackResult: attackResult,
        startingAttributes: initialAttributes,
        startingLevel: initialLevel,
    };
} 