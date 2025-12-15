import {MetaCompilers, SpecificationVersion, Drafts} from "./Schemas";
import {compileSchema, JsonSchema} from "json-schema-library";

export const validateSchema = (schemaVersion: SpecificationVersion, schema: JsonSchema) => {
    const metaCompiler = MetaCompilers[schemaVersion];
    return metaCompiler.validate(schema);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validate = (schemaVersion: SpecificationVersion, schema: JsonSchema, data: any) => {
    return compileSchema(schema, {drafts: [Drafts[schemaVersion]]}).validate(data)
}
