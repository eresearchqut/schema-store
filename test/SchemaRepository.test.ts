import type {JsonSchema} from "json-schema-library";

import type {
    DraftId,
    ISchemaStore,
    SchemaStoreGetRequest,
    SchemaStoreGetVersionsRequest,
    SchemaStorePutRequest} from "../src";
import {
    DraftSchemas,
    SchemaRepository,
    SchemaVersion,
} from "../src";

// A simple in-memory store for testing that preserves all versions per path
class TestSchemaStore implements ISchemaStore {
    private store: Record<string, Record<string, JsonSchema>> = {};

    async put(request: SchemaStorePutRequest): Promise<JsonSchema> {
        const {path, schemaVersion, schema} = request;
        const versions = this.store[path] || {};
        versions[schemaVersion.toString()] = schema;
        this.store[path] = versions;
        return schema;
    }

    async get(request: SchemaStoreGetRequest): Promise<JsonSchema | undefined> {
        const {path, schemaVersion} = request;
        const versions = this.store[path];
        if (!versions) return undefined;
        if (schemaVersion) return versions[schemaVersion.toString()];
        const max = Object.keys(versions).sort().reverse()[0];
        return max ? versions[max] : undefined;
    }

    async getVersions(
        request: SchemaStoreGetVersionsRequest
    ): Promise<SchemaVersion[]> {
        const versions = this.store[request.path];
        return versions
            ? Object.keys(versions)
                .sort()
                .reverse()
                .map(SchemaVersion.fromString)
            : [];
    }

    async getLatestVersion(
        request: Pick<SchemaStoreGetRequest, "path">
    ): Promise<SchemaVersion | undefined> {
        const versions = await this.getVersions(request);
        return versions[0];
    }
}

describe("SchemaRepository", () => {
    let store: TestSchemaStore;
    let repo: SchemaRepository;

    const path = "schemas/example";
    const draftId: DraftId = "draft-07";
    const v1 = new SchemaVersion(0, 0, 1);

    const validSchema: JsonSchema = {
        $id: "https://example.com/schema-valid",
        type: "object",
        properties: {
            name: {type: "string"},
        },
        required: ["name"],
        additionalProperties: false,
    } as unknown as JsonSchema;

    beforeEach(() => {
        store = new TestSchemaStore();
        repo = new SchemaRepository({schemaStore: store, baseUrl: new URL("https://example.com/"), firstVersion: v1});
    });

    describe("createSchema", () => {
        it("creates a schema at the first version and stamps $schema and $id", async () => {
            const created = await repo.createSchema({path, draftId, schema: validSchema});
            expect(created).toBeTruthy();
            // stamped with draft meta $schema
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((created as any).$schema).toBe(DraftSchemas[draftId]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((created as any).$id).toBe(`https://example.com/${path}/${v1.toString()}`);

            const fetched = await repo.getSchema({path});
            expect(fetched).toBeDefined();
        });

        it("fails if a schema already exists at the path and exposes details via getters", async () => {
            await repo.createSchema({path, draftId, schema: validSchema});
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = await repo.createSchema({path, draftId, schema: validSchema}).catch((e: unknown) => e) as any;
            expect(err.name).toBe("SchemaCreateError");
            expect(err.getPath()).toBe(path);
            expect(err.getDraftId()).toBe(draftId);
        });

        it("validates schema against draft and throws on invalid schema with details", async () => {
            const invalidSchema = {type: "not-a-valid-type"} as unknown as JsonSchema;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = await repo.createSchema({path, draftId, schema: invalidSchema}).catch((e: unknown) => e) as any;
            expect(err.name).toBe("SchemaValidationError");
            expect(err.getPath()).toBe(path);
            expect(err.getDraftId()).toBe(draftId);
            expect(Array.isArray(err.getErrors())).toBe(true);
            expect(err.getErrors().length).toBeGreaterThan(0);
        });

        it("uses DEFAULT_FIRST_VERSION (0-0-1) when firstVersion is not configured", async () => {
            const defaultRepo = new SchemaRepository({
                schemaStore: new TestSchemaStore(),
                baseUrl: new URL("https://example.com/"),
            });
            const created = await defaultRepo.createSchema({path, draftId, schema: validSchema});
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((created as any).$id).toBe(`https://example.com/${path}/0-0-1`);
        });
    });

    describe("getSchema", () => {
        it("returns latest when version omitted and specific version when provided and includes $schema and $id", async () => {
            const created = await repo.createSchema({path, draftId, schema: validSchema});
            expect(created).toBeTruthy();

            // Latest (only v1)
            const latest = await repo.getSchema({path});
            expect(latest).toBeTruthy();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((latest as any).$schema).toBe(DraftSchemas[draftId]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((latest as any).$id).toBe(`https://example.com/${path}/${v1.toString()}`);

            // By exact version
            const exact = await repo.getSchema({path, schemaVersion: v1});
            expect(exact).toBeTruthy();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((exact as any).$schema).toBe(DraftSchemas[draftId]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((exact as any).$id).toBe(`https://example.com/${path}/${v1.toString()}`);
        });

        it("throws SchemaNotFoundError when path does not exist and exposes details", async () => {
            const missingPath = "missing/path";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = await repo.getSchema({path: missingPath}).catch((e: unknown) => e) as any;
            expect(err.name).toBe("SchemaNotFoundError");
            expect(err.getPath()).toBe(missingPath);
            expect(err.getSchemaVersion()).toBeUndefined();
        });

        it("throws SchemaNotFoundError when a specific version exists in the index but the store returns no document", async () => {
            await repo.createSchema({path, draftId, schema: validSchema});
            // Corrupt the store by removing the schema document while leaving the version key
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (store as any).store[path][v1.toString()] = undefined;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = await repo.getSchema({path, schemaVersion: v1}).catch((e: unknown) => e) as any;
            expect(err.name).toBe("SchemaNotFoundError");
            expect(err.getPath()).toBe(path);
            expect(err.getSchemaVersion()?.toString()).toBe(v1.toString());
        });
    });

    describe("getLatestVersion", () => {
        it("returns the latest version of a schema", async () => {
            await repo.createSchema({path, draftId, schema: validSchema});
            const latest = await repo.getLatestVersion(path);
            expect(latest?.toString()).toBe(v1.toString());

            await repo.updateSchema({path, draftId, updateType: "addition", schema: validSchema});
            const updatedLatest = await repo.getLatestVersion(path);
            expect(updatedLatest?.toString()).toBe("0-0-2");
        });

        it("throws SchemaNotFoundError when the path does not exist", async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = await repo.getLatestVersion("non-existent").catch((e: unknown) => e) as any;
            expect(err.name).toBe("SchemaNotFoundError");
            expect(err.getPath()).toBe("non-existent");
        });
    });

    describe("updateSchema", () => {
        beforeEach(async () => {
            await repo.createSchema({path, draftId, schema: validSchema});
        });

        it("bumps addition version and preserves draft stamping and stamps $id", async () => {
            const updatedSchema: JsonSchema = {
                $id: "https://example.com/schema-valid-v2",
                type: "object",
                properties: {name: {type: "string"}, age: {type: "integer"}},
                required: ["name"],
                additionalProperties: false,
            } as unknown as JsonSchema;

            const result = await repo.updateSchema({
                path,
                draftId,
                updateType: "addition",
                schema: updatedSchema,
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((result as any).$schema).toBe(DraftSchemas[draftId]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((result as any).$id).toBe(`https://example.com/${path}/0-0-2`);

            const latestVersion = await store.getLatestVersion({path});
            expect(latestVersion?.toString()).toBe("0-0-2");
        });

        it("bumps revision and resets addition", async () => {
            await repo.updateSchema({
                path,
                draftId,
                updateType: "addition",
                schema: validSchema,
            }); // v0-0-2

            await repo.updateSchema({
                path,
                draftId,
                updateType: "revision",
                schema: validSchema,
            }); // v0-1-0

            const latestVersion = await store.getLatestVersion({path});
            expect(latestVersion?.toString()).toBe("0-1-0");
        });

        it("bumps model and resets others", async () => {
            await repo.updateSchema({path, draftId, updateType: "model", schema: validSchema});
            const latestVersion = await store.getLatestVersion({path});
            expect(latestVersion?.toString()).toBe("1-0-0");
        });

        it("throws when updating non-existing path", async () => {
            const otherRepo = new SchemaRepository({
                schemaStore: new TestSchemaStore(),
                baseUrl: new URL("https://example.com/"),
                firstVersion: v1
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = await otherRepo.updateSchema({path: "nope", draftId, updateType: "addition", schema: validSchema}).catch((e: unknown) => e) as any;
            expect(err.name).toBe("SchemaNotFoundError");
            expect(err.getPath()).toBe("nope");
        });

        it("throws SchemaUpdateError on draft mismatch for non-model update and exposes details", async () => {
            const mismatchedDraft: DraftId = "draft-06";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = await repo.updateSchema({path, draftId: mismatchedDraft, updateType: "addition", schema: validSchema}).catch((e: unknown) => e) as any;
            expect(err.name).toBe("SchemaUpdateError");
            expect(err.getPath()).toBe(path);
            expect(err.getSchemaUpdateType()).toBe("addition");
        });

        it("allows draft change when updateType is model", async () => {
            const newDraft: DraftId = "draft-2020-12";
            const result = await repo.updateSchema({path, draftId: newDraft, updateType: "model", schema: validSchema});
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((result as any).$schema).toBe(DraftSchemas[newDraft]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((result as any).$id).toBe(`https://example.com/${path}/1-0-0`);
        });

        it("infers the current draft when draftId is omitted", async () => {
            // Cast to bypass the required draftId type — tests runtime fallback to current draft
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await repo.updateSchema({path, updateType: "addition", schema: validSchema} as any);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((result as any).$schema).toBe(DraftSchemas[draftId]);
        });

        it("validates schema during update and throws SchemaValidationError with details on invalid schema", async () => {
            const invalidSchema = {type: "not-a-valid-type"} as unknown as JsonSchema;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = await repo.updateSchema({path, draftId, updateType: "addition", schema: invalidSchema}).catch((e: unknown) => e) as any;
            expect(err.name).toBe("SchemaValidationError");
            expect(err.getPath()).toBe(path);
            expect(err.getDraftId()).toBe(draftId);
            expect(Array.isArray(err.getErrors())).toBe(true);
            expect(err.getErrors().length).toBeGreaterThan(0);
        });
    });
});
