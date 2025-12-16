import { SchemaRepository } from "../src";
import { DraftId, DraftSchemas } from "../src/Drafts";
import { SchemaVersion } from "../src/SchemaVersion";
import {
  SchemaStore,
  SchemaStoreGetRequest,
  SchemaStoreGetVersionsRequest,
  SchemaStorePutRequest,
} from "../src/SchemaStore";
import { JsonSchema } from "json-schema-library";

// A simple in-memory store for testing that preserves all versions per path
class TestSchemaStore implements SchemaStore {
  private store: Record<string, Record<string, JsonSchema>> = {};

  async put(request: SchemaStorePutRequest): Promise<void> {
    const { path, schemaVersion, schema } = request;
    const versions = this.store[path] || {};
    versions[schemaVersion.toString()] = schema;
    this.store[path] = versions;
  }

  async get(request: SchemaStoreGetRequest): Promise<JsonSchema | undefined> {
    const { path, schemaVersion } = request;
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
      name: { type: "string" },
    },
    required: ["name"],
    additionalProperties: false,
  } as unknown as JsonSchema;

  beforeEach(() => {
    store = new TestSchemaStore();
    repo = new SchemaRepository(store, v1);
  });

  describe("createSchema", () => {
    it("creates a schema at the first version and stamps $schema", async () => {
      const created = await repo.createSchema({ path, draftId, schema: validSchema });
      expect(created).toBeTruthy();
      // stamped with draft meta $schema
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((created as any).$schema).toBe(DraftSchemas[draftId]);

      const fetched = await repo.getSchema({ path });
      expect(fetched).toBeDefined();
    });

    it("fails if a schema already exists at the path", async () => {
      await repo.createSchema({ path, draftId, schema: validSchema });
      await expect(
        repo.createSchema({ path, draftId, schema: validSchema })
      ).rejects.toHaveProperty("name", "SchemaCreateError");
    });

    it("validates schema against draft and throws on invalid schema", async () => {
      const invalidSchema = { type: "not-a-valid-type" } as unknown as JsonSchema;
      await expect(
        repo.createSchema({ path, draftId, schema: invalidSchema })
      ).rejects.toHaveProperty("name", "SchemaValidationError");
    });
  });

  describe("getSchema", () => {
    it("returns latest when version omitted and specific version when provided", async () => {
      const created = await repo.createSchema({ path, draftId, schema: validSchema });
      expect(created).toBeTruthy();

      // Latest (only v1)
      const latest = await repo.getSchema({ path });
      expect(latest).toBeTruthy();

      // By exact version
      const exact = await repo.getSchema({ path, schemaVersion: v1 });
      expect(exact).toBeTruthy();
    });

    it("throws SchemaNotFoundError when path does not exist", async () => {
      await expect(repo.getSchema({ path: "missing/path" })).rejects.toHaveProperty(
        "name",
        "SchemaNotFoundError"
      );
    });
  });

  describe("updateSchema", () => {
    beforeEach(async () => {
      await repo.createSchema({ path, draftId, schema: validSchema });
    });

    it("bumps addition version and preserves draft stamping", async () => {
      const updatedSchema: JsonSchema = {
        $id: "https://example.com/schema-valid-v2",
        type: "object",
        properties: { name: { type: "string" }, age: { type: "integer" } },
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

      const latestVersion = await store.getLatestVersion({ path });
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

      const latestVersion = await store.getLatestVersion({ path });
      expect(latestVersion?.toString()).toBe("0-1-0");
    });

    it("bumps model and resets others", async () => {
      await repo.updateSchema({ path, draftId, updateType: "model", schema: validSchema });
      const latestVersion = await store.getLatestVersion({ path });
      expect(latestVersion?.toString()).toBe("1-0-0");
    });

    it("throws when updating non-existing path", async () => {
      const otherRepo = new SchemaRepository(new TestSchemaStore(), v1);
      await expect(
        otherRepo.updateSchema({ path: "nope", draftId, updateType: "addition", schema: validSchema })
      ).rejects.toHaveProperty("name", "SchemaNotFoundError");
    });
  });
});
