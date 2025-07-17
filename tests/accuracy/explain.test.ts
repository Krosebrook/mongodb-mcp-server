import { describeAccuracyTests } from "./sdk/describeAccuracyTests.js";
import { AccuracyTestConfig } from "./sdk/describeAccuracyTests.js";

function callsExplain(prompt: string, config: Record<string, unknown>): AccuracyTestConfig {
    return {
        prompt: prompt,
        expectedToolCalls: [
            {
                toolName: "mongodb-find",
                parameters: {
                    database: "mflix",
                    collection: "movies",
                    explain: true,
                    ...config,
                },
            },
        ],
    };
}

const callsExplainWithFind = (prompt: string) =>
    callsExplain(prompt, {
        filter: { release_year: 2020 },
    });

const callsExplainWithAggregate = (prompt: string) =>
    callsExplain(prompt, {
        pipeline: [
                {
                    $match: { release_year: 2020 },
                },
        ],
    });

const callsExplainWithCount = (prompt: string) =>
    callsExplain(prompt, {
        filter: { release_year: 2020 },
        count: true,
    });

/**
 * None of these tests score a parameter match on any of the models, likely
 * because we are using Zod.union, when we probably should've used
 * Zod.discriminatedUnion
 */
describeAccuracyTests([
    callsExplainWithFind(
        `Will fetching documents, where release_year is 2020, from 'mflix.movies' namespace perform a collection scan?`
    ),
    callsExplainWithAggregate(
        `Will aggregating documents, where release_year is 2020, from 'mflix.movies' namespace perform a collection scan?`
    ),
    callsExplainWithCount(
        `Will counting documents, where release_year is 2020, from 'mflix.movies' namespace perform a collection scan?`
    ),
]);
