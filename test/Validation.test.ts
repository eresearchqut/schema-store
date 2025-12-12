import { validateSchema, SchemaVersion } from "../src";

describe('Validation Tests', () => {



    beforeAll(async () => {

    });

    beforeEach(async () => {

    });

    afterAll(async () => {

    });

    describe('validateSchema', () => {
        const versions: SchemaVersion[] = [
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




});