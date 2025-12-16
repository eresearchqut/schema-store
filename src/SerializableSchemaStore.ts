import {
    SchemaStore,
    SchemaStoreGetRequest,
    SchemaStoreGetVersionsRequest,
    SchemaStorePutRequest
} from "./SchemaStore";
import {JsonSchema} from "json-schema-library";
import {SchemaVersion} from "./SchemaVersion";

export class SerializableSchemaStore implements SchemaStore {

    private store: Record<string, Record<string, JsonSchema>> = {};

    async put(request: SchemaStorePutRequest): Promise<void> {
        const {schemaVersion, path, schema} = request;
        this.store[path] = {[schemaVersion.toString()]: schema};
    }

    async get(request: SchemaStoreGetRequest): Promise<JsonSchema | undefined> {
        const {path, schemaVersion} = request;
        const versions = this.store[path];
        if (schemaVersion) {
            return Promise.resolve(versions[schemaVersion.toString()]);
        }
        const maxVersion = Object.keys(versions).sort().reverse()[0]
        return versions[maxVersion];
    }

    async getVersions(request: SchemaStoreGetVersionsRequest): Promise<SchemaVersion[]> {
        const {path} = request;
        return this.store[path] ? Object.keys(this.store[path])
            .sort().reverse().map(SchemaVersion.fromString) : [];
    }

    async getLatestVersion(request: Pick<SchemaStoreGetRequest, "path">): Promise<SchemaVersion | undefined> {
        const versions = await this.getVersions(request);
        return versions.length > 0 ? versions[0] : undefined;
    }

    marshall(): string {
        return JSON.stringify(this.store);
    }

    unmarshall(json: string): void {
        this.store = JSON.parse(json);
    }

}