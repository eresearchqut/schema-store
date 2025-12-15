import {SchemaStore, DraftId, SchemaVersion} from "./Schemas";
import {JsonSchema} from "json-schema-library";
import crypto from "node:crypto";

export class SerializableSchemaStore implements SchemaStore {

    private store: Record<string, SchemaVersion> = {};

    addSchema(specificationVersion: DraftId, schema: JsonSchema): string {
        const id = crypto.randomUUID();
        this.store[id] = {specificationVersion, schema};
        return id;
    }

    getSchema(id: string): SchemaVersion | undefined {
        return this.store[id];
    }

    // addVersion(id: string, path: string, version: string): string {
    //     const id = crypto.randomUUID();
    //     this.store[id] = schema;
    //     return id;
    // }

    marshall(): string {
        return JSON.stringify(this.store);
    }

    unmarshall(json: string): void {
        this.store = JSON.parse(json);
    }

}