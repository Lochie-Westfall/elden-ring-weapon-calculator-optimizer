import type { Attributes } from "../../calculator/attributes";
import type { EvaluateBuildScore } from "../types";

// Interface for any optimization strategy
export type OptimizerStrategy = (
    initialAttributes: Attributes,
    pointsToAllocate: number,
    minimumAttributes: Partial<Record<keyof Attributes, number>>, // Renamed
    evaluateScore: EvaluateBuildScore // The function to call to get a build's score
) => Attributes; // Returns the best attributes found by the strategy 