import {
    SchemaStore,
    SchemaValidationError,
    DraftId,
    SchemaVersion,
    SchemaMetadata,
    Schemas,
    SchemaCreateError
} from "./Model";
import {validateSchema} from "./SchemaUtils";
import {JsonSchema} from "json-schema-library";

export const DEFAULT_VERSION = new SchemaVersion(0, 0, 1);

export class SchemaRepository {



    constructor(readonly schemaStore: SchemaStore) {

    }

    public async createSchema(path: string, draftId: DraftId, schema: JsonSchema): Promise<SchemaMetadata> {
        if (await this.schemaStore.get(path)) {
            return Promise.reject(new SchemaCreateError(`Schema with path ${path} already exists`, path, draftId));
        }
        const {valid, errors} = validateSchema(draftId, schema);
        if (!valid)
            throw new SchemaValidationError(`Schema is not valid for draft ${draftId}`, path, draftId, errors);
        return this.schemaStore.put(path, draftId, {...schema, $schema: Schemas[draftId]}, DEFAULT_VERSION);
    }




}