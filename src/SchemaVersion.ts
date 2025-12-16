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

    public equals(other: SchemaVersion): boolean {
        return this.model === other.model && this.revision === other.revision && this.addition === other.addition;
    }

}