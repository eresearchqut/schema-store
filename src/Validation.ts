import {MetaCompilers, SchemaVersion, JsonSchema} from "./Schemas";

export const validateSchema = (schemaVersion: SchemaVersion, schema: JsonSchema) => {
    const metaCompiler = MetaCompilers[schemaVersion];
    return metaCompiler.validate(schema);
}

