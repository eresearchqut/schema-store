import {
    DraftId,
    SchemaCreateError,
    SchemaMetadata,
    SchemaNotFoundError,
    Schemas,
    SchemaStore,
    SchemaValidationError,
    SchemaVersion
} from "./Model";
import {validateSchema} from "./SchemaUtils";
import {JsonSchema} from "json-schema-library";

export const FIRST_VERSION = new SchemaVersion(0, 0, 1);

export class SchemaRepository {


    constructor(readonly schemaStore: SchemaStore) {

    }

    public async createSchema(path: string, draftId: DraftId, schema: JsonSchema): Promise<SchemaMetadata> {
        if (await this.schemaStore.get({path})) {
            return Promise.reject(new SchemaCreateError(`Schema with path ${path} already exists`, path, draftId));
        }
        const {valid, errors} = validateSchema(draftId, schema);
        if (!valid)
            throw new SchemaValidationError(`Schema is not valid for draft ${draftId}`, path, draftId, errors);
        const metadata = {path, draftId, schemaVersion: FIRST_VERSION};
        return this.schemaStore.put({...metadata, schema: {...schema, $schema: Schemas[draftId]}})
            .then(() => metadata);
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
}