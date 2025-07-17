import { describeAccuracyTests } from "./sdk/describeAccuracyTests.js";
import { AccuracyTestConfig } from "./sdk/describeAccuracyTests.js";

function callsCountToolWithEmptyQuery(prompt: string, database = "mflix", collection = "movies"): AccuracyTestConfig {
    return {
        prompt: prompt,
        expectedToolCalls: [
            {
                toolName: "mongodb-find",
                parameters: {
                    database,
                    collection,
                    count: true,
                },
            },
        ],
    };
}

function callsCountToolWithQuery(
    prompt: string,
    database = "mflix",
    collection = "movies",
    filter: Record<string, unknown> = {}
): AccuracyTestConfig {
    return {
        prompt: prompt,
        expectedToolCalls: [
            {
                toolName: "mongodb-find",
                parameters: {
                    database,
                    collection,
                    filter,
                    count: true,
                },
            },
        ],
    };
}

describeAccuracyTests([
    callsCountToolWithEmptyQuery("Count number of documents in 'mflix.movies' namespace."),
    callsCountToolWithEmptyQuery(
        "How many documents are there in 'characters' collection in 'comics' database?",
        "comics",
        "characters"
    ),
    callsCountToolWithQuery(
        "Count all the documents in 'mflix.movies' namespace with runtime less than 100?",
        "mflix",
        "movies",
        { runtime: { $lt: 100 } }
    ),
]);
