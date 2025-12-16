import {
    JsonSchema
} from "json-schema-library";
import {SchemaVersion} from "./SchemaVersion";
import {DraftId} from "./Drafts";

export interface SchemaStoreMetadata {
    schemaVersion: SchemaVersion,
    path: string,
    draftId: DraftId,
}

export interface SchemaStorePutRequest  {
    schemaVersion: SchemaVersion,
    path: string,
    draftId: DraftId,
    schema: JsonSchema
}

export interface SchemaStoreGetRequest  {
    schemaVersion?: SchemaVersion,
    path: string,
}

export interface SchemaStoreGetVersionsRequest  {
    path: string,
}

export interface SchemaStoreGetLatestVersionsRequest  {
    path: string,
}

export interface SchemaStore {
    put(request: SchemaStorePutRequest): Promise<void>
    get(request: SchemaStoreGetRequest): Promise<JsonSchema | undefined>
    getVersions(request: SchemaStoreGetVersionsRequest): Promise<SchemaVersion[]>
    getLatestVersion(request: SchemaStoreGetLatestVersionsRequest): Promise<SchemaVersion | undefined>
}







