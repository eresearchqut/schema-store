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
} from "json-schema-library";

export type DraftId = 'draft-2020-12' | 'draft-2019-09' | 'draft-07' | 'draft-06' | 'draft-04';

export const Drafts: Record<DraftId, Draft> = {
    "draft-04": draft04,
    "draft-06": draft06,
    "draft-07": draft07,
    "draft-2019-09": draft2019,
    'draft-2020-12': draft2020
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export const DraftMetaSchemas : Record<DraftId, any> = {
    'draft-2020-12': remotes['https://json-schema.org/draft/2020-12/meta/validation'],
    "draft-2019-09": remotes['https://json-schema.org/draft/2019-09/meta/validation'],
    "draft-07": remotes['http://json-schema.org/draft-07/schema#'],
    "draft-06": remotes['http://json-schema.org/draft-06/schema#'],
    "draft-04": remotes['http://json-schema.org/draft-04/schema#'],
}

export const DraftSchemas : Record<DraftId, string> = {
    'draft-2020-12': 'https://json-schema.org/draft/2020-12/schema',
    "draft-2019-09": 'https://json-schema.org/draft/2019-09/schema',
    "draft-07": 'http://json-schema.org/draft-07/schema#',
    "draft-06": 'http://json-schema.org/draft-06/schema#',
    "draft-04": 'http://json-schema.org/draft-04/schema#',
}

export const getDraftId = (schema: string): DraftId | undefined =>
    Object.keys(DraftSchemas).find((key) => DraftSchemas[key as DraftId] === schema) as DraftId | undefined;

export const DraftMetaCompilers: Record<DraftId, SchemaNode> = {
    'draft-2020-12': compileSchema(DraftMetaSchemas['draft-2020-12'], {drafts: [Drafts['draft-2020-12']]}),
    "draft-2019-09": compileSchema(DraftMetaSchemas['draft-2019-09'], {drafts: [Drafts['draft-2019-09']]}),
    "draft-07": compileSchema(DraftMetaSchemas['draft-07'], {drafts: [Drafts['draft-07']]}),
    "draft-06": compileSchema(DraftMetaSchemas['draft-06'], {drafts: [Drafts['draft-06']]}),
    "draft-04": compileSchema(DraftMetaSchemas['draft-04'], {drafts: [Drafts['draft-04']]}),
}















