import {SchemaStore, SchemaValidationError, SchemaVersion} from "./Schemas";
import {validateSchema} from "./SchemaUtils";
import {JsonSchema} from "json-schema-library";

export class SchemaRepository {

    constructor(readonly  schemaStore: SchemaStore) {

    }

    public addSchema(version: SchemaVersion, schema: JsonSchema): string {
        const {valid, errors} = validateSchema(version, schema);
        if (!valid)
            throw new SchemaValidationError(`Schema is not valid for version ${version}`, errors);
        return this.schemaStore.addSchema(version, schema);
    }



}