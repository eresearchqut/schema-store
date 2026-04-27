import type {
    JsonSchema
} from "json-schema-library";

import type {DraftId} from "./Drafts";
import type {SchemaVersion} from "./SchemaVersion";

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

export interface ISchemaStore {
    put(request: SchemaStorePutRequest): Promise<JsonSchema>
    get(request: SchemaStoreGetRequest): Promise<JsonSchema | undefined>
    getVersions(request: SchemaStoreGetVersionsRequest): Promise<SchemaVersion[]>
    getLatestVersion(request: SchemaStoreGetLatestVersionsRequest): Promise<SchemaVersion | undefined>
}







