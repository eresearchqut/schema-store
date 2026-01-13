import {validateSchema} from "./SchemaUtils";
import {SchemaVersion} from "./SchemaVersion";
import {JsonError, JsonSchema} from "json-schema-library";
import {DraftId, DraftSchemas, getDraftId} from "./Drafts";
import {ISchemaStore} from "./SchemaStore";

export const DEFAULT_FIRST_VERSION = new SchemaVersion(0, 0, 1);

export type SchemaUpdateType = 'model' | 'revision' | 'addition';

export interface SchemaCreateRequest {
    path: string,
    draftId: DraftId,
    schema: JsonSchema
}

export interface SchemaGetRequest {
    path: string,
    schemaVersion?: SchemaVersion
}

export interface SchemaUpdateRequest {
    path: string,
    draftId: DraftId,
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
        Object.setPrototypeOf(this, SchemaNotFoundError.prototype);
        this.schemaVersion = schemaVersion;
    }

    getSchemaVersion(): SchemaVersion | undefined {
        return this.schemaVersion;
    }
}

export class SchemaUpdateError extends SchemaRepositoryError {

    private readonly schemaUpdateType?: SchemaUpdateType;

    constructor(message: string, path: string, schemaUpdateType?: SchemaUpdateType) {
        super(message, path, undefined);
        this.name = "SchemaUpdateError";
        Object.setPrototypeOf(this, SchemaUpdateError.prototype);
        this.schemaUpdateType = schemaUpdateType;
    }

    getSchemaUpdateType(): SchemaUpdateType | undefined {
        return this.schemaUpdateType;
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

export interface SchemaRepositoryConfig {
    schemaStore: ISchemaStore,
    baseUrl: URL,
    firstVersion?: SchemaVersion
}

export class SchemaRepository {

    constructor(readonly config: SchemaRepositoryConfig) {

    }

    private schemaId(path: string, version: SchemaVersion): string {
        const {baseUrl} = this.config;
        const versionUrl = new URL(`/${path}/${version.toString()}`, baseUrl);
        return versionUrl?.href;
    }

    private stampSchema(path: string, draftId: DraftId, schema: JsonSchema, version: SchemaVersion): JsonSchema {
        const $id = this.schemaId(path, version);
        const $schema = DraftSchemas[draftId];
        return {...schema, $schema, $id};
    }

    public async createSchema(request: SchemaCreateRequest): Promise<JsonSchema> {
        const {path, draftId, schema} = request;
        const {firstVersion = DEFAULT_FIRST_VERSION, schemaStore} = this.config;
        if (await schemaStore.getLatestVersion({path})) {
            return Promise.reject(new SchemaCreateError(`Schema with path ${path} already exists`, path, draftId));
        }
        const {valid, errors} = validateSchema(draftId, schema);
        if (!valid)
            throw new SchemaValidationError(`Schema is not valid for draft ${draftId}`, path, draftId, errors);
        const metadata = {path, draftId, schemaVersion: firstVersion};
        const stampedSchema = this.stampSchema(path, draftId, schema, firstVersion);
        return schemaStore.put({...metadata, schema: stampedSchema})
            .then(() => stampedSchema);
    }

    public async getSchema(request: SchemaGetRequest): Promise<JsonSchema> {
        const {path, schemaVersion} = request;
        const {schemaStore} = this.config;
        const version = schemaVersion || await schemaStore.getLatestVersion({path});
        if (!version)
            throw new SchemaNotFoundError(`Schema with path ${path} not found`, path);
        const versionedSchema = await schemaStore.get({path, schemaVersion: version});
        if (!versionedSchema)
            throw new SchemaNotFoundError(`Schema with path ${path} and version ${schemaVersion} not found`, path, schemaVersion);
        return versionedSchema as JsonSchema;
    }

    public async getLatestVersion(path: string): Promise<SchemaVersion> {
        const {schemaStore} = this.config;
        const latestVersion = await schemaStore.getLatestVersion({path});
        if (!latestVersion)
            throw new SchemaNotFoundError(`Schema with path ${path} not found`, path);
        return latestVersion;
    }

    public async updateSchema(request: SchemaUpdateRequest): Promise<JsonSchema> {
        const {path, updateType, schema} = request;

        const {schemaStore} = this.config;
        const currentVersion = await this.getLatestVersion(path);
        const currentSchema = await this.getSchema({...request, schemaVersion: currentVersion});
        const currentDraftId = getDraftId(currentSchema.$schema);

        if (request.draftId && currentDraftId !== request.draftId && updateType !== 'model') {
            throw new SchemaUpdateError(`Cannot update draft ${currentDraftId} schema with draft ${request.draftId} schema unless the update type is model`, path, updateType);
        }

        const draftId = request.draftId || currentDraftId;

        const {valid, errors} = validateSchema(draftId, schema);
        if (!valid)
            throw new SchemaValidationError(`Schema is not valid for draft ${draftId}`, path, draftId, errors);

        const newVersion = 'addition' === updateType ? currentVersion.bumpAddition()
            : 'revision' === updateType ? currentVersion.bumpRevision() : currentVersion.bumpModel();
        const stampedSchema = this.stampSchema(path, draftId, schema, newVersion);
        return schemaStore.put({path, draftId, schemaVersion: newVersion, schema: stampedSchema})
            .then(() => stampedSchema);

    }
}