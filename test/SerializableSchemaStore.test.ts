import type {JsonSchema} from "json-schema-library";

import { SchemaVersion,SerializableSchemaStore } from "../src";

describe("SerializableSchemaStore", () => {
  let store: SerializableSchemaStore;

  const path = "schemas/example";
  const v1 = new SchemaVersion(0, 0, 1);
  const v2 = new SchemaVersion(0, 0, 2);

  const schemaV1: JsonSchema = {
    $id: "https://example.com/schema-v1",
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"],
    additionalProperties: false,
  } as unknown as JsonSchema;

  const schemaV2: JsonSchema = {
    $id: "https://example.com/schema-v2",
    type: "object",
    properties: { name: { type: "string" }, age: { type: "integer" } },
    required: ["name"],
    additionalProperties: false,
  } as unknown as JsonSchema;

  beforeEach(() => {
    store = new SerializableSchemaStore();
  });

  it("put() stores a schema version and get() retrieves it by exact version", async () => {
    await store.put({ path, schemaVersion: v1, draftId: "draft-07", schema: schemaV1 });

    const fetched = await store.get({ path, schemaVersion: v1 });
    expect(fetched).toEqual(schemaV1);
  });

  it("get() without version returns the latest (by sort) version available", async () => {
    await store.put({ path, schemaVersion: v1, draftId: "draft-07", schema: schemaV1 });
    await store.put({ path, schemaVersion: v2, draftId: "draft-07", schema: schemaV2 });

    const fetchedLatest = await store.get({ path });
    expect(fetchedLatest).toEqual(schemaV2);
  });

  it("get() retrieves an older version when explicitly requested", async () => {
    await store.put({ path, schemaVersion: v1, draftId: "draft-07", schema: schemaV1 });
    await store.put({ path, schemaVersion: v2, draftId: "draft-07", schema: schemaV2 });

    const fetchedV1 = await store.get({ path, schemaVersion: v1 });
    expect(fetchedV1).toEqual(schemaV1);
  });

  it("getVersions() returns all stored versions for a path (sorted desc)", async () => {
    await store.put({ path, schemaVersion: v1, draftId: "draft-07", schema: schemaV1 });
    await store.put({ path, schemaVersion: v2, draftId: "draft-07", schema: schemaV2 });

    const versions = await store.getVersions({ path });
    expect(versions).toHaveLength(2);
    expect(versions[0].toString()).toBe(v2.toString());
    expect(versions[1].toString()).toBe(v1.toString());
  });

  it("marshall() serializes the internal store and unmarshall() restores it", async () => {
    await store.put({ path, schemaVersion: v1, draftId: "draft-07", schema: schemaV1 });
    await store.put({ path, schemaVersion: v2, draftId: "draft-07", schema: schemaV2 });

    const json = store.marshall();
    expect(typeof json).toBe("string");
    expect(json.length).toBeGreaterThan(0);

    const restored = new SerializableSchemaStore();
    restored.unmarshall(json);

    const fetchedLatest = await restored.get({ path });
    expect(fetchedLatest).toEqual(schemaV2);

    const fetchedV1 = await restored.get({ path, schemaVersion: v1 });
    expect(fetchedV1).toEqual(schemaV1);

    const versions = await restored.getVersions({ path });
    expect(versions).toHaveLength(2);
    expect(versions[0].toString()).toBe(v2.toString());
    expect(versions[1].toString()).toBe(v1.toString());
  });

  describe("getLatestVersion", () => {
    it("returns undefined when no versions exist for a path", async () => {
      const latest = await store.getLatestVersion({ path });
      expect(latest).toBeUndefined();
    });

    it("returns the only version when a single version exists", async () => {
      await store.put({ path, schemaVersion: v1, draftId: "draft-07", schema: schemaV1 });
      const latest = await store.getLatestVersion({ path });
      expect(latest).toBeDefined();
      expect(latest!.toString()).toBe(v1.toString());
    });

    it("returns the latest version after multiple puts", async () => {
      await store.put({ path, schemaVersion: v1, draftId: "draft-07", schema: schemaV1 });
      await store.put({ path, schemaVersion: v2, draftId: "draft-07", schema: schemaV2 });

      const latest = await store.getLatestVersion({ path });
      expect(latest).toBeDefined();
      expect(latest!.toString()).toBe(v2.toString());
    });
  });
});
