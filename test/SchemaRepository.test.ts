import {SchemaRepository} from "../src";
import {SerializableSchemaStore} from "../src";
import {SchemaValidationError, DraftId} from "../src";
import {JsonSchema} from "json-schema-library";

describe('Schema Repository Tests', () => {

    const versions: DraftId[] = [
        'draft-2020-12',
        'draft-2019-09',
        'draft-07',
        'draft-06',
        'draft-04'
    ];

    describe('addSchema', () => {

        // Define a set of schemas that are broadly valid across all supported drafts
        const schemaCases: Array<{
            name: string,
            valid: JsonSchema,
            invalid: JsonSchema
        }> = [
            {
                name: 'simple object with required string',
                valid: {
                    $id: 'https://example.com/simple-object',
                    type: 'object',
                    properties: {
                        name: {type: 'string'}
                    },
                    required: ['name'],
                    additionalProperties: false
                },
                // Invalid because type must be string or array of strings, not number
                invalid: {type: 123 as unknown as string}
            },
            {
                name: 'string with minLength',
                valid: {
                    $id: 'https://example.com/string-min',
                    type: 'string',
                    minLength: 1
                },
                // Invalid because minLength must be a non-negative integer, not string
                // and also type is invalid
                invalid: {type: 5 as unknown as string, minLength: '1' as unknown as number}
            }
        ];

        // Build parameter table [version, caseName, validSchema, invalidSchema]
        const table: Array<[DraftId, string, JsonSchema, JsonSchema]> = [];
        for (const v of versions) {
            for (const c of schemaCases) {
                table.push([v, c.name, c.valid, c.invalid]);
            }
        }

        it.each(table)(
            'addSchema returns an id when schema is valid (version=%s, %s)',
            async (version, _name, validSchema: JsonSchema) => {
                const repo = new SchemaRepository(new SerializableSchemaStore());
                const id = await repo.addSchema(version, validSchema);
                expect(typeof id).toBe('string');
                expect(id.length).toBeGreaterThan(0);
            }
        );

        it.each(table)(
            'addSchema throws SchemaValidationError when schema is invalid (version=%s, %s)',
            (version, _name, _validSchema: JsonSchema, invalidSchema: JsonSchema) => {
                const repo = new SchemaRepository(new SerializableSchemaStore());
                try {
                    repo.addSchema(version, invalidSchema);
                    // If no error was thrown, fail the test
                    fail('Expected SchemaValidationError to be thrown');
                } catch (err) {
                    expect(err).toBeInstanceOf(SchemaValidationError);
                    const e = err as SchemaValidationError;
                    const errors = e.getErrors();
                    expect(Array.isArray(errors)).toBe(true);
                    expect(errors.length).toBeGreaterThan(0);
                }
            }
        );
    });

    describe('getSchema', () => {
        it('returns the same schema and specificationVersion as stored', async () => {
            const repo = new SchemaRepository(new SerializableSchemaStore());
            const schema: JsonSchema = {
                $id: 'https://example.com/employee',
                type: 'object',
                properties: {name: {type: 'string'}},
                required: ['name'],
                additionalProperties: false
            };
            const version: DraftId = 'draft-07';
            const id = await repo.addSchema(version, schema);

            const stored = await repo.getSchema(id);
            expect(stored).toBeDefined();
            expect(stored?.specificationVersion).toBe(version);
            expect(stored?.schema).toEqual(schema);
        });

        it('returns undefined when schema id does not exist', async () => {
            const repo = new SchemaRepository(new SerializableSchemaStore());
            const result = await repo.getSchema('non-existent-id');
            expect(result).toBeUndefined();
        });

        it('works for all supported specification versions', async () => {
            const repo = new SchemaRepository(new SerializableSchemaStore());
            for (const version of versions) {
                const schema: JsonSchema = {
                    type: 'string',
                    minLength: 1
                };
                const id = await repo.addSchema(version, schema);
                const stored = await repo.getSchema(id);
                expect(stored?.specificationVersion).toBe(version);
                expect(stored?.schema).toEqual(schema);
            }
        });
    });
});