import {
    draft04,
    draft06,
    draft07,
    draft2019,
    draft2020,
    Draft,
    SchemaNode,
    remotes,
    compileSchema,
    JsonSchema, JsonError
} from "json-schema-library";

export type SpecificationVersion = 'draft-2020-12' | 'draft-2019-09' | 'draft-07' | 'draft-06' | 'draft-04';

export const Drafts: Record<SpecificationVersion, Draft> = {
    "draft-04": draft04,
    "draft-06": draft06,
    "draft-07": draft07,
    "draft-2019-09": draft2019,
    'draft-2020-12': draft2020
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export const MetaSchemas : Record<SpecificationVersion, any> = {
    'draft-2020-12': remotes['https://json-schema.org/draft/2020-12/meta/validation'],
    "draft-2019-09": remotes['https://json-schema.org/draft/2019-09/meta/validation'],
    "draft-07": remotes['http://json-schema.org/draft-07/schema#'],
    "draft-06": remotes['http://json-schema.org/draft-06/schema#'],
    "draft-04": remotes['http://json-schema.org/draft-04/schema#'],
}

export const MetaCompilers: Record<SpecificationVersion, SchemaNode> = {
    'draft-2020-12': compileSchema(MetaSchemas['draft-2020-12'], {drafts: [Drafts['draft-2020-12']]}),
    "draft-2019-09": compileSchema(MetaSchemas['draft-2019-09'], {drafts: [Drafts['draft-2019-09']]}),
    "draft-07": compileSchema(MetaSchemas['draft-07'], {drafts: [Drafts['draft-07']]}),
    "draft-06": compileSchema(MetaSchemas['draft-06'], {drafts: [Drafts['draft-06']]}),
    "draft-04": compileSchema(MetaSchemas['draft-04'], {drafts: [Drafts['draft-04']]}),
}

export interface SchemaStore {
    addSchema(specificationVersion: SpecificationVersion, schema: JsonSchema): Promise<string> | string;
    getSchema(id: string): Promise<SchemaWithSpecification | undefined> | SchemaWithSpecification | undefined;
}

export class SchemaValidationError extends Error {

    private readonly errors: JsonError[];

    constructor(message: string, errors: JsonError[]) {
        super(message);
        this.name = "SchemaValidationError";
        Object.setPrototypeOf(this, SchemaValidationError.prototype);
        this.errors = errors;
    }

    getErrors(): JsonError[] {
        return this.errors;
    }

}

export interface SchemaWithSpecification {
    specificationVersion: SpecificationVersion;
    schema: JsonSchema;
}
