import { z } from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { DbOperationArgs, MongoDBToolBase } from "../mongodbTool.js";
import { ToolArgs, OperationType } from "../../tool.js";
import { EJSON } from "bson";
import { SortDirection } from "mongodb";
import { ErrorCodes, MongoDBError } from "../../../common/errors.js";
import { ExplainTool } from "../metadata/explain.js";

export const FindToolArgs = {
     filter: z
        .object({}).passthrough()
        .optional()
        .describe("The query filter, matching the syntax of the query argument of db.collection.find()"),
    projection: z
        .object({}).passthrough()
        .optional()
        .describe("The projection, matching the syntax of the projection argument of db.collection.find(). Only used when filter is provided."),
    limit: z.number().optional().default(10).describe("The maximum number of documents to return. Only used when filter is provided."),
    sort: z
        .object({}).catchall(z.custom<SortDirection>())
        .optional()
        .describe("A document, describing the sort order, matching the syntax of the sort argument of cursor.sort(). The keys of the object are the fields to sort on, while the values are the sort directions (1 for ascending, -1 for descending). Only used when filter is provided."),
    pipeline: z.array(z.object({}).passthrough()).optional().describe("An array of aggregation stages to execute, matching the syntax of the aggregation pipeline in db.collection.aggregate(). It's ignored if a filter is provided."),
    explain: z.boolean().optional().default(false).describe("If true, returns the explain plan of the query or aggregation pipeline."),
    count: z.boolean().optional().default(false).describe("If true, returns the count of the documents matching the filter. Only used when filter is provided. For aggregation pipelines, use the $count stage in the pipeline instead."),
};

export class MongoDbFindTool extends MongoDBToolBase {
    public name = "mongodb-find";
    protected description = `
    This tool retrieves documents or the count of documents from MongoDB collections based on an specific filter or an aggregation pipeline, excluding $out and $merge stages. This tool MUST be used to retrieve the execution plan of a query or aggregation pipeline.
    `;

    protected argsShape = {
        ...DbOperationArgs,
        ...FindToolArgs,
    };
    public operationType: OperationType = "read";

    protected async execute({
        database,
        collection,
        filter,
        projection,
        limit,
        sort,
        pipeline,
        explain,
        count,
    }: ToolArgs<typeof this.argsShape>): Promise<CallToolResult> {
        const provider = await this.ensureConnected();

        if (filter) {
            if (count && !explain) {
               const count = await provider.count(database, collection, filter);

                return {
                    content: [
                        {
                            text: `Found ${count} documents in the collection "${collection}"`,
                            type: "text",
                        },
                    ],
                }; 
            } else if (count) {
                const result = await provider.runCommandWithCheck(database, {
                    explain: {
                        count: collection,
                        query: filter,
                    },
                    verbosity: ExplainTool.defaultVerbosity,
                });
                
                return {
                    content: [
                        {
                            text: `Here is some information about the winning plan chosen by the query optimizer for running the given \`count\` operation in "${database}.${collection}". This information can be used to understand how the query was executed and to optimize the query performance.`,
                            type: "text",
                        },
                        {
                            text: JSON.stringify(result),
                            type: "text",
                        },
                    ],
                };
            } else if (explain) {
                const result = await provider
                                    .find(database, collection, filter, { projection, limit, sort })
                                    .explain(ExplainTool.defaultVerbosity);
                
                return {
                    content: [
                        {
                            text: `Here is some information about the winning plan chosen by the query optimizer for running the given \`find\` operation in "${database}.${collection}". This information can be used to understand how the query was executed and to optimize the query performance.`,
                            type: "text",
                        },
                        {
                            text: JSON.stringify(result),
                            type: "text",
                        },
                    ],
                };
            } else {
                const documents = await provider.find(database, collection, filter, { projection, limit, sort }).toArray();

                const content: Array<{ text: string; type: "text" }> = [
                    {
                        text: `Found ${documents.length} documents in the collection "${collection}":`,
                        type: "text",
                    },
                    ...documents.map((doc) => {
                        return {
                            text: EJSON.stringify(doc),
                            type: "text",
                        } as { text: string; type: "text" };
                    }),
                ];

                return { content };
            }
        } else if (pipeline) {
            if (explain) {
                const result = await provider
                    .aggregate(
                        database,
                        collection,
                        pipeline,
                        {},
                        {
                            writeConcern: undefined,
                        }
                    )
                    .explain(ExplainTool.defaultVerbosity);

                return {
                    content: [
                        {
                            text: `Here is some information about the winning plan chosen by the query optimizer for running the given \`aggregate\` operation in "${database}.${collection}". This information can be used to understand how the query was executed and to optimize the query performance.`,
                            type: "text",
                        },
                        {
                            text: JSON.stringify(result),
                            type: "text",
                        },
                    ],
                };
            } else {
                const documents = await provider.aggregate(database, collection, pipeline).toArray();

                const content: Array<{ text: string; type: "text" }> = [
                    {
                        text: `Found ${documents.length} documents in the collection "${collection}":`,
                        type: "text",
                    },
                    ...documents.map((doc) => {
                        return {
                            text: EJSON.stringify(doc),
                            type: "text",
                        } as { text: string; type: "text" };
                    }),
                ];

                return {
                    content,
                };
            }
        } else {
            const documents = await provider.find(database, collection, {}, { projection, limit, sort }).toArray();

                const content: Array<{ text: string; type: "text" }> = [
                    {
                        text: `Found ${documents.length} documents in the collection "${collection}":`,
                        type: "text",
                    },
                    ...documents.map((doc) => {
                        return {
                            text: EJSON.stringify(doc),
                            type: "text",
                        } as { text: string; type: "text" };
                    }),
                ];

                return { content };
        }
    }
}
