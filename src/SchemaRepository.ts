import {SchemaStore, SchemaValidationError, DraftId, SchemaVersion} from "./Schemas";
import {validateSchema} from "./SchemaUtils";
import {JsonSchema} from "json-schema-library";

export class SchemaRepository {

    constructor(readonly  schemaStore: SchemaStore) {

    }

    public addSchema(version: DraftId, schema: JsonSchema): Promise<string> | string {
        const {valid, errors} = validateSchema(version, schema);
        if (!valid)
            throw new SchemaValidationError(`Schema is not valid for version ${version}`, errors);
        return this.schemaStore.addSchema(version, schema);
    }

    public getSchema(id: string): Promise<SchemaVersion | undefined> | SchemaVersion | undefined {
        return this.schemaStore.getSchema(id);
    }



}