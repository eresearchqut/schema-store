import {SerializableSchemaStore, SchemaVersion, DraftId, JsonSchema} from "../src";

describe('SerializableSchemaStore', () => {

    const draft: DraftId = 'draft-07';

    describe('put', () => {
        it('returns SchemaMetadata with correct fields', async () => {
            const store = new SerializableSchemaStore();
            const path = 'schemas/example';
            const version = new SchemaVersion(1, 0, 0);
            const schema: JsonSchema = { type: 'string' };

            const meta = await store.put(path, draft, schema, version);

            expect(meta).toEqual({ schemaVersion: version, path, draftId: draft });
        });
    });

    describe('get', () => {
        it('retrieves the stored schema when version is specified', async () => {
            const store = new SerializableSchemaStore();
            const path = 'schemas/with-version';
            const version = new SchemaVersion(1, 2, 3);
            const schema: JsonSchema = { type: 'object', properties: { name: { type: 'string' } } };

            await store.put(path, draft, schema, version);
            const retrieved = await store.get(path, version);
            expect(retrieved).toEqual(schema);
        });

        it('retrieves the latest schema when version is not specified (single version case)', async () => {
            const store = new SerializableSchemaStore();
            const path = 'schemas/latest';
            const version = new SchemaVersion(2, 0, 0);
            const schema: JsonSchema = { type: 'number' };

            await store.put(path, draft, schema, version);
            const retrieved = await store.get(path);
            expect(retrieved).toEqual(schema);
        });

        it('rejects when schema path does not exist', async () => {
            const store = new SerializableSchemaStore();
            await expect(store.get('does/not/exist'))
                .rejects.toThrow(/Schema with path does\/not\/exist does not exist/);
        });

        it('rejects when specific version does not exist for path', async () => {
            const store = new SerializableSchemaStore();
            const path = 'schemas/missing-version';
            const schema: JsonSchema = { type: 'string' };
            await store.put(path, draft, schema, new SchemaVersion(1, 0, 0));

            await expect(store.get(path, new SchemaVersion(9, 9, 9)))
                .rejects.toThrow(/does not exist for version/);
        });
    });

    describe('getVersions', () => {
        it('returns an empty array when path not found', async () => {
            const store = new SerializableSchemaStore();
            const versions = await store.getVersions('unknown/path');
            expect(Array.isArray(versions)).toBe(true);
            expect(versions.length).toBe(0);
        });

        it('returns a list with the stored version for the path', async () => {
            const store = new SerializableSchemaStore();
            const path = 'schemas/versions';
            const v1 = new SchemaVersion(1, 0, 0);
            const schema: JsonSchema = { type: 'boolean' };
            await store.put(path, draft, schema, v1);

            const versions = await store.getVersions(path);
            expect(versions.map(v => v.toString())).toEqual([v1.toString()]);
        });
    });

    describe('marshall/unmarshall', () => {
        it('serializes and restores the store contents', async () => {
            const store1 = new SerializableSchemaStore();
            const p1 = 'schemas/a';
            const p2 = 'schemas/b';
            const vA = new SchemaVersion(1, 0, 0);
            const vB = new SchemaVersion(3, 2, 1);
            const sA: JsonSchema = { type: 'string', minLength: 1 };
            const sB: JsonSchema = { type: 'object', properties: { id: { type: 'integer' } }, additionalProperties: false };

            await store1.put(p1, draft, sA, vA);
            await store1.put(p2, draft, sB, vB);

            const snapshot = store1.marshall();

            const store2 = new SerializableSchemaStore();
            store2.unmarshall(snapshot);

            await expect(store2.get(p1, vA)).resolves.toEqual(sA);
            await expect(store2.get(p2, vB)).resolves.toEqual(sB);

            const versionsA = await store2.getVersions(p1);
            expect(versionsA.map(v => v.toString())).toEqual([vA.toString()]);
        });
    });
});
