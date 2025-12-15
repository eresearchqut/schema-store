import {
    SchemaStore,
    DraftId,
    SchemaVersion,
    SchemaMetadata,
    SchemaNotFoundError,
} from "./Model";
import {JsonSchema} from "json-schema-library";

export class SerializableSchemaStore implements SchemaStore {

    private store: Record<string, Record<string, JsonSchema>> = {};

    put(path: string, draftId: DraftId, schema: JsonSchema, schemaVersion: SchemaVersion): Promise<SchemaMetadata> {
        const schemaMetadata: SchemaMetadata = {schemaVersion, path, draftId};
        this.store[path] = {[schemaVersion.toString()]: schema};
        return Promise.resolve(schemaMetadata);
    }

    get(path: string, schemaVersion?: SchemaVersion): Promise<JsonSchema> {
        if (!this.store[path] || (schemaVersion && !this.store[path][schemaVersion?.toString()])) {
            return Promise.reject(new SchemaNotFoundError(schemaVersion ? `Schema with path ${path} does not exist for version: ${schemaVersion.toString()}` : `Schema with path ${path} does not exist`, path));
        }
        const versions = this.store[path];
        if (schemaVersion) {
            return Promise.resolve(versions[schemaVersion?.toString()]);
        }
        const maxVersion = Object.keys(versions).sort().reverse()[0]
        return Promise.resolve(versions[maxVersion]);
    }

    getVersions(path: string): Promise<SchemaVersion[]> {
        return Promise.resolve(this.store[path] ? Object.keys(this.store[path]).sort().reverse().map(SchemaVersion.fromString) : [])
    }


    marshall(): string {
        return JSON.stringify(this.store);
    }

    unmarshall(json: string): void {
        this.store = JSON.parse(json);
    }

}