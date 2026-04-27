
import type { JsonSchema} from "json-schema-library";
import {compileSchema} from "json-schema-library";

import type {DraftId} from "./Drafts";
import { DraftMetaCompilers,Drafts} from "./Drafts";

export const validateSchema = (draftId: DraftId, schema: JsonSchema) => {
    const metaCompiler = DraftMetaCompilers[draftId];
    return metaCompiler.validate(schema);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validate = (draftId: DraftId, schema: JsonSchema, data: any) => {
    return compileSchema(schema, {drafts: [Drafts[draftId]]}).validate(data)
}




