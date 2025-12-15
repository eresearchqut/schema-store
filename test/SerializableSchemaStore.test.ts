import {SerializableSchemaStore} from "../src";
import {DraftId} from "../src";
import {JsonSchema} from "json-schema-library";

describe('SerializableSchemaStore marshall/unmarshall', () => {

  const versions: DraftId[] = [
    'draft-2020-12',
    'draft-2019-09',
    'draft-07',
    'draft-06',
    'draft-04'
  ];

  it('marshall on a new store returns valid JSON for an empty object', () => {
    const store = new SerializableSchemaStore();
    const json = store.marshall();
    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json)).toEqual({});
  });

  it('round-trips a single schema for all supported specification versions', () => {
    for (const version of versions) {
      const store1 = new SerializableSchemaStore();
      const schema: JsonSchema = { type: 'string', minLength: 1 };
      const id = store1.addSchema(version, schema);

      const json = store1.marshall();

      const store2 = new SerializableSchemaStore();
      store2.unmarshall(json);

      const loaded = store2.getSchema(id);
      expect(loaded).toBeDefined();
      expect(loaded?.specificationVersion).toBe(version);
      expect(loaded?.schema).toEqual(schema);
    }
  });

  it('round-trips multiple schemas with mixed versions and preserves ids', () => {
    const store1 = new SerializableSchemaStore();
    const schemaA: JsonSchema = { $id: 'https://example.com/a', type: 'object', properties: { a: { type: 'number' } }, additionalProperties: false };
    const schemaB: JsonSchema = { $id: 'https://example.com/b', type: 'array', items: { type: 'integer' } };
    const schemaC: JsonSchema = { type: 'boolean' };

    const idA = store1.addSchema('draft-07', schemaA);
    const idB = store1.addSchema('draft-2019-09', schemaB);
    const idC = store1.addSchema('draft-04', schemaC);

    const json = store1.marshall();

    const store2 = new SerializableSchemaStore();
    store2.unmarshall(json);

    expect(store2.getSchema(idA)?.schema).toEqual(schemaA);
    expect(store2.getSchema(idA)?.specificationVersion).toBe('draft-07');
    expect(store2.getSchema(idB)?.schema).toEqual(schemaB);
    expect(store2.getSchema(idB)?.specificationVersion).toBe('draft-2019-09');
    expect(store2.getSchema(idC)?.schema).toEqual(schemaC);
    expect(store2.getSchema(idC)?.specificationVersion).toBe('draft-04');
  });

  it('unmarshall replaces existing store state (overwrite behavior)', () => {
    const store = new SerializableSchemaStore();
    const schema1: JsonSchema = { type: 'number', minimum: 0 };
    const schema2: JsonSchema = { type: 'string' };

    const id1 = store.addSchema('draft-06', schema1);
    const snapshot = store.marshall();

    const id2 = store.addSchema('draft-07', schema2);
    expect(store.getSchema(id1)).toBeDefined();
    expect(store.getSchema(id2)).toBeDefined();

    // Restore from snapshot that only contained id1
    store.unmarshall(snapshot);

    expect(store.getSchema(id1)).toBeDefined();
    expect(store.getSchema(id2)).toBeUndefined();
  });

  it('unmarshall throws when JSON is invalid', () => {
    const store = new SerializableSchemaStore();
    expect(() => store.unmarshall('{invalid json')).toThrow(SyntaxError);
  });
});
