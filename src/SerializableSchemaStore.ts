import {SchemaStore, SchemaVersion} from "./Schemas";
import {JsonSchema} from "json-schema-library";
import crypto from "node:crypto";

export class SerializableSchemaStore implements SchemaStore {

    private store: Record<string, JsonSchema> = {};

    addSchema(version: SchemaVersion, schema: JsonSchema): string {
        const id = crypto.randomUUID();
        this.store[id] = schema;
        return id;
    }

    marshall(): string {
        return JSON.stringify(this.store);
    }

    unmarshall(json: string): void {
        this.store = JSON.parse(json);
    }

}