import {validateSchema} from "./SchemaUtils";
import {SchemaVersion} from "./SchemaVersion";
import {JsonError, JsonSchema} from "json-schema-library";
import {DraftId, DraftSchemas} from "./Drafts";
import {SchemaStore} from "./SchemaStore";

export const DEFAULT_FIRST_VERSION = new SchemaVersion(0, 0, 1);

export type SchemaUpdateType = 'model' | 'revision' | 'addition';

export interface SchemaCreateRequest {
    path: string,
    draftId: DraftId,
    schema: JsonSchema
}

export interface SchemaUpdateRequest {
    path: string,
    draftId?: DraftId,
    updateType: SchemaUpdateType,
    schema: JsonSchema
}

export class SchemaRepositoryError extends Error {

    private readonly draftId: DraftId | undefined;
    private readonly path: string;

    constructor(message: string, path: string, draftId: DraftId | undefined = undefined) {
        super(message);
        this.name = "SchemaError";
        Object.setPrototypeOf(this, SchemaRepositoryError.prototype);
        this.path = path;
        this.draftId = draftId;
    }

    getPath(): string {
        return this.path;
    }

    getDraftId(): DraftId | undefined {
        return this.draftId;
    }
}

export class SchemaCreateError extends SchemaRepositoryError {
    constructor(message: string, path: string, draftId: DraftId) {
        super(message, path, draftId);
        this.name = "SchemaCreateError";
        Object.setPrototypeOf(this, SchemaCreateError.prototype);
    }
}

export class SchemaNotFoundError extends SchemaRepositoryError {

    private readonly schemaVersion?: SchemaVersion;

    constructor(message: string, path: string, schemaVersion?: SchemaVersion) {
        super(message, path, undefined);
        this.name = "SchemaNotFoundError";
        Object.setPrototypeOf(this, SchemaCreateError.prototype);
        this.schemaVersion = schemaVersion;
    }

    getSchemaVersion(): SchemaVersion | undefined {
        return this.schemaVersion;
    }
}

export class SchemaValidationError extends SchemaRepositoryError {

    private readonly errors: JsonError[];

    constructor(message: string, path: string, draftId: DraftId, errors: JsonError[]) {
        super(message, path, draftId);
        this.name = "SchemaValidationError";
        Object.setPrototypeOf(this, SchemaValidationError.prototype);
        this.errors = errors;
    }

    getErrors(): JsonError[] {
        return this.errors;
    }

}

export class SchemaRepository {

    constructor(readonly schemaStore: SchemaStore, readonly firstVersion: SchemaVersion = DEFAULT_FIRST_VERSION) {

    }

    public async createSchema(request: SchemaCreateRequest): Promise<JsonSchema> {
        const {path, draftId, schema} = request;
        if (await this.schemaStore.get({path})) {
            return Promise.reject(new SchemaCreateError(`Schema with path ${path} already exists`, path, draftId));
        }
        const {valid, errors} = validateSchema(draftId, schema);
        if (!valid)
            throw new SchemaValidationError(`Schema is not valid for draft ${draftId}`, path, draftId, errors);
        const metadata = {path, draftId, schemaVersion: this.firstVersion};
        const stampedSchema = {...schema, $schema: DraftSchemas[draftId]};
        return this.schemaStore.put({...metadata, schema: stampedSchema})
            .then(() => stampedSchema);
    }

    public async getSchema(path: string, schemaVersion?: SchemaVersion): Promise<JsonSchema> {
        const version = schemaVersion || await this.schemaStore.getLatestVersion({path});
        if (!version)
            throw new SchemaNotFoundError(`Schema with path ${path} not found`, path);
        const versionedSchema = this.schemaStore.get({path, schemaVersion: version});
        if (!versionedSchema)
            throw new SchemaNotFoundError(`Schema with path ${path} and version ${schemaVersion} not found`, path, schemaVersion);
        return versionedSchema as JsonSchema;
    }

    // public async updateSchema() {
    //     const currentVersion = this.schemaStore.getLatestVersion({path});
    // }
}