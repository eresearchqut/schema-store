import {MetaCompilers, SchemaVersion, JsonSchema, Drafts} from "./Schemas";
import {compileSchema} from "json-schema-library";

export const validateSchema = (schemaVersion: SchemaVersion, schema: JsonSchema) => {
    const metaCompiler = MetaCompilers[schemaVersion];
    return metaCompiler.validate(schema);
}

export const validate = (schemaVersion: SchemaVersion, schema: JsonSchema, data: any) => {
    return compileSchema(schema, {drafts: [Drafts[schemaVersion]]}).validate(data)
}
