import {MetaCompilers, DraftId, Drafts} from "./Model";
import {compileSchema, JsonSchema} from "json-schema-library";

export const validateSchema = (draftId: DraftId, schema: JsonSchema) => {
    const metaCompiler = MetaCompilers[draftId];
    return metaCompiler.validate(schema);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validate = (draftId: DraftId, schema: JsonSchema, data: any) => {
    return compileSchema(schema, {drafts: [Drafts[draftId]]}).validate(data)
}




