import type { Attributes } from "../../calculator/attributes";
import type { EvaluateBuildScore } from "../types";
import type { Weapon } from "../../calculator/weapon";

// Interface for any optimization strategy
export type OptimizerStrategy = (
    initialAttributes: Attributes,
    pointsToAllocate: number,
    minimumAttributes: Partial<Record<keyof Attributes, number>>, // Renamed
    evaluateScore: EvaluateBuildScore, // Now expects (attributes, weapons) => number
    weapons: Weapon[] // Add weapons array to the strategy signature
) => Attributes; // Returns the best attributes found by the strategy 