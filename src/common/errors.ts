export enum ErrorCodes {
    NotConnectedToMongoDB = 1_000_000,
    MisconfiguredConnectionString = 1_000_001,
    ForbiddenCollscan = 1_000_002,
    InvalidArguments = 1_000_003,
}

export class MongoDBError extends Error {
    constructor(
        public code: ErrorCodes,
        message: string
    ) {
        super(message);
    }
}
