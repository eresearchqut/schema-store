import {SchemaStore, SpecificationVersion, StoreRecord} from "./Schemas";
import {JsonSchema} from "json-schema-library";
import crypto from "node:crypto";


export class SerializableSchemaStore implements SchemaStore {

    private store: Record<string, StoreRecord> = {};

    addSchema(schemaVersion: SpecificationVersion, schema: JsonSchema): string {
        const id = crypto.randomUUID();
        this.store[id] = {specificationVersion: schemaVersion, schema};
        return id;
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