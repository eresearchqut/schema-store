
import { SchemaRepository } from "../src/SchemaRepository";
import { SerializableSchemaStore } from "../src/SerializableSchemaStore";
import { SpecificationVersion, SchemaValidationError } from "../src";
import { JsonSchema } from "json-schema-library";

describe('Schema Repository Tests', () => {

    const versions: SpecificationVersion[] = [
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
                    name: { type: 'string' }
                },
                required: ['name'],
                additionalProperties: false
            },
            // Invalid because type must be string or array of strings, not number
            invalid: { type: 123 as unknown as string }
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
            invalid: { type: 5 as unknown as string, minLength: '1' as unknown as number }
        }
    ];

    // Build parameter table [version, caseName, validSchema, invalidSchema]
    const table: Array<[SpecificationVersion, string, JsonSchema, JsonSchema]> = [];
    for (const v of versions) {
        for (const c of schemaCases) {
            table.push([v, c.name, c.valid, c.invalid]);
        }
    }

    it.each(table)(
        'addSchema returns an id when schema is valid (version=%s, %s)',
        (version, _name, validSchema: JsonSchema) => {
            const repo = new SchemaRepository(new SerializableSchemaStore());
            const id = repo.addSchema(version, validSchema);
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
});