import {validateSchema, validate, SpecificationVersion, JsonSchema} from "../src";

describe('Schema Util Tests', () => {

    beforeAll(async () => {

    });

    beforeEach(async () => {

    });

    afterAll(async () => {

    });

    describe('validateSchema', () => {
        const versions: SpecificationVersion[] = [
            'draft-2020-12',
            'draft-2019-09',
            'draft-07',
            'draft-06',
            'draft-04'
        ];
        it.each(versions)(
            'returns valid=true for a valid schema definition (%s)',
            (version) => {
                // A basic valid JSON Schema object for all drafts
                const validSchema = {
                    $id: 'https://example.com/my-schema',
                    title: 'Example',
                    description: 'A simple object schema',
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        age: { type: 'integer' }
                    },
                    required: ['name'],
                    additionalProperties: false
                };

                const result = validateSchema(version, validSchema);
                expect(result).toBeDefined();
                expect(result.valid).toBe(true);
                expect(Array.isArray(result.errors)).toBe(true);
                expect(result.errors.length).toBe(0);
            }
        );

        it.each(versions)(
            'returns valid=false for an invalid schema definition (%s)',
            (version) => {
                // Invalid because "type" must be string or string[] in all drafts, not a number
                const invalidSchema = {
                    type: 123,
                };

                const result = validateSchema(version, invalidSchema);
                expect(result).toBeDefined();
                expect(result.valid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
            }
        );
    });

    describe('validate (data against schema)', () => {
        const versions: SpecificationVersion[] = [
            'draft-2020-12',
            'draft-2019-09',
            'draft-07',
            'draft-06',
            'draft-04'
        ];

        // Define a small set of schemas that are compatible across all listed drafts
        const schemas: JsonSchema[] = [
            {
                name: 'simple string with minLength',
                schema: { type: 'string', minLength: 3 },
                valid: 'abc',
                invalid: 'ab'
            },
            {
                name: 'object with required string property',
                schema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' }
                    },
                    required: ['name'],
                    additionalProperties: false
                },
                valid: { name: 'Alice' },
                invalid: { name: 123 }
            }
        ];

        // Build a table of [version, schemaName, schema, validData, invalidData]
        const table: Array<[SpecificationVersion, string, JsonSchema, unknown, unknown]> = [];
        for (const v of versions) {
            for (const s of schemas) {
                table.push([v, s.name, s.schema, s.valid, s.invalid]);
            }
        }

        it.each(table)(
            'returns valid=true for valid data (version=%s, %s)',
            (version, _name, schema: JsonSchema, validData) => {
                const result = validate(version, schema, validData);
                expect(result).toBeDefined();
                expect(result.valid).toBe(true);
                expect(Array.isArray(result.errors)).toBe(true);
                expect(result.errors.length).toBe(0);
            }
        );

        it.each(table)(
            'returns valid=false for invalid data (version=%s, %s)',
            (version, _name, schema: JsonSchema, _validData, invalidData) => {
                const result = validate(version, schema, invalidData);
                expect(result).toBeDefined();
                expect(result.valid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
            }
        );
    });




});