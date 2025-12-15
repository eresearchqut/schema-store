import {
    SchemaStore,
    SchemaStoreGetRequest,
    SchemaStoreGetVersionsRequest,
    SchemaStorePutRequest,
    SchemaVersion,
} from "./Model";
import {JsonSchema} from "json-schema-library";

export class SerializableSchemaStore implements SchemaStore {

    private store: Record<string, Record<string, JsonSchema>> = {};

    put(request: SchemaStorePutRequest): Promise<void> {
        const {schemaVersion, path, schema} = request;
        this.store[path] = {[schemaVersion.toString()]: schema};
        return Promise.resolve();
    }

    get(request: SchemaStoreGetRequest): Promise<JsonSchema | undefined> {
        const {path, schemaVersion} = request;
        const versions = this.store[path];
        if (schemaVersion) {
            return Promise.resolve(versions[schemaVersion.toString()]);
        }
        const maxVersion = Object.keys(versions).sort().reverse()[0]
        return Promise.resolve(versions[maxVersion]);
    }

    getVersions(request: SchemaStoreGetVersionsRequest): Promise<SchemaVersion[]> {
        const {path} = request;
        return Promise.resolve(this.store[path] ? Object.keys(this.store[path])
            .sort().reverse().map(SchemaVersion.fromString) : [])
    }

    marshall(): string {
        return JSON.stringify(this.store);
    }

    unmarshall(json: string): void {
        this.store = JSON.parse(json);
    }

}