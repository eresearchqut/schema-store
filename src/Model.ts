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
    JsonSchema,
    JsonError
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
export const MetaSchemas : Record<DraftId, any> = {
    'draft-2020-12': remotes['https://json-schema.org/draft/2020-12/meta/validation'],
    "draft-2019-09": remotes['https://json-schema.org/draft/2019-09/meta/validation'],
    "draft-07": remotes['http://json-schema.org/draft-07/schema#'],
    "draft-06": remotes['http://json-schema.org/draft-06/schema#'],
    "draft-04": remotes['http://json-schema.org/draft-04/schema#'],
}

export const Schemas : Record<DraftId, string> = {
    'draft-2020-12': 'https://json-schema.org/draft/2020-12/schema',
    "draft-2019-09": 'https://json-schema.org/draft/2019-09/schema',
    "draft-07": 'http://json-schema.org/draft-07/schema#',
    "draft-06": 'http://json-schema.org/draft-06/schema#',
    "draft-04": 'http://json-schema.org/draft-04/schema#',
}

export const MetaCompilers: Record<DraftId, SchemaNode> = {
    'draft-2020-12': compileSchema(MetaSchemas['draft-2020-12'], {drafts: [Drafts['draft-2020-12']]}),
    "draft-2019-09": compileSchema(MetaSchemas['draft-2019-09'], {drafts: [Drafts['draft-2019-09']]}),
    "draft-07": compileSchema(MetaSchemas['draft-07'], {drafts: [Drafts['draft-07']]}),
    "draft-06": compileSchema(MetaSchemas['draft-06'], {drafts: [Drafts['draft-06']]}),
    "draft-04": compileSchema(MetaSchemas['draft-04'], {drafts: [Drafts['draft-04']]}),
}



export class SchemaVersion {

    private readonly model: number;
    private readonly revision: number;
    private readonly addition: number;

    constructor(model: number, revision: number, addition: number) {
        this.model = model;
        this.revision = revision;
        this.addition = addition;
    }

    public toString = (): string => {
        return `${this.model}-${this.revision}-${this.addition}`
    }

    public static fromString = (versionString: string): SchemaVersion => {
        const [model, revision, addition] = versionString.split('-').map(Number);
        return new SchemaVersion(model, revision, addition);
    }

    public getModel(): number {
        return this.model;
    }
    public getRevision(): number {
        return this.revision;
    }
    public getAddition(): number {
        return this.addition;
    }

    public bumpAddition = (): SchemaVersion  => {
        return new SchemaVersion(this.model, this.revision, this.addition + 1)
    }

    public bumpRevision = (): SchemaVersion  => {
        return new SchemaVersion(this.model, this.revision + 1, 0)
    }

    public bumpModel = (): SchemaVersion  => {
        return new SchemaVersion(this.model + 1, 0, 0)
    }

}

export interface SchemaMetadata {
    schemaVersion: SchemaVersion,
    path: string,
    draftId: DraftId,
}

export interface SchemaStore {
    put(path: string, draftId: DraftId, schema: JsonSchema, schemaVersion: SchemaVersion): Promise<SchemaMetadata>
    get(path: string, version?: SchemaVersion): Promise<JsonSchema>
    getVersions(path: string): Promise<SchemaVersion[]>
}

export class SchemaError extends Error {

    private readonly draftId: DraftId | undefined;
    private readonly path: string;

    constructor(message: string, path: string, draftId: DraftId | undefined = undefined) {
        super(message);
        this.name = "SchemaError";
        Object.setPrototypeOf(this, SchemaError.prototype);
        this.path = path;
        this.draftId = draftId;
    }

    getPath(): string {
        return this.path;
    }

    getDraftId(): DraftId | undefined {
        return this.draftId;
    }
}

export class SchemaCreateError extends SchemaError {
    constructor(message: string, path: string, draftId: DraftId) {
        super(message, path, draftId);
        this.name = "SchemaCreateError";
        Object.setPrototypeOf(this, SchemaCreateError.prototype);
    }
}

export class SchemaNotFoundError extends SchemaError {

    private readonly schemaVersion?: SchemaVersion;

    constructor(message: string, path: string, schemaVersion?: SchemaVersion) {
        super(message, path, undefined);
        this.name = "SchemaNotFoundError";
        Object.setPrototypeOf(this, SchemaCreateError.prototype);
        this.schemaVersion = schemaVersion;
    }

    getSchemaVersion(): SchemaVersion | undefined {
        return this.schemaVersion;
    }
}

export class SchemaValidationError extends SchemaError {

    private readonly errors: JsonError[];

    constructor(message: string, path: string, draftId: DraftId, errors: JsonError[]) {
        super(message, path, draftId);
        this.name = "SchemaValidationError";
        Object.setPrototypeOf(this, SchemaValidationError.prototype);
        this.errors = errors;
    }

    getErrors(): JsonError[] {
        return this.errors;
    }

}






