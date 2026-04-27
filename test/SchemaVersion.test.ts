import { SchemaVersion } from "../src";

describe("SchemaVersion", () => {

    describe("constructor / getters", () => {
        it("stores and exposes model, revision, addition", () => {
            const v = new SchemaVersion(2, 3, 4);
            expect(v.getModel()).toBe(2);
            expect(v.getRevision()).toBe(3);
            expect(v.getAddition()).toBe(4);
        });
    });

    describe("toString", () => {
        it("formats as model-revision-addition", () => {
            expect(new SchemaVersion(0, 0, 1).toString()).toBe("0-0-1");
            expect(new SchemaVersion(1, 2, 3).toString()).toBe("1-2-3");
            expect(new SchemaVersion(10, 0, 0).toString()).toBe("10-0-0");
        });
    });

    describe("fromString", () => {
        it("parses a version string into a SchemaVersion", () => {
            const v = SchemaVersion.fromString("1-2-3");
            expect(v.getModel()).toBe(1);
            expect(v.getRevision()).toBe(2);
            expect(v.getAddition()).toBe(3);
        });

        it("round-trips through toString", () => {
            const original = new SchemaVersion(4, 5, 6);
            const roundTripped = SchemaVersion.fromString(original.toString());
            expect(roundTripped.toString()).toBe(original.toString());
        });
    });

    describe("bumpAddition", () => {
        it("increments addition and leaves model and revision unchanged", () => {
            const v = new SchemaVersion(1, 2, 3).bumpAddition();
            expect(v.getModel()).toBe(1);
            expect(v.getRevision()).toBe(2);
            expect(v.getAddition()).toBe(4);
        });

        it("does not mutate the original instance", () => {
            const original = new SchemaVersion(0, 0, 1);
            original.bumpAddition();
            expect(original.getAddition()).toBe(1);
        });
    });

    describe("bumpRevision", () => {
        it("increments revision and resets addition to 0", () => {
            const v = new SchemaVersion(1, 2, 5).bumpRevision();
            expect(v.getModel()).toBe(1);
            expect(v.getRevision()).toBe(3);
            expect(v.getAddition()).toBe(0);
        });

        it("does not mutate the original instance", () => {
            const original = new SchemaVersion(0, 1, 3);
            original.bumpRevision();
            expect(original.getRevision()).toBe(1);
            expect(original.getAddition()).toBe(3);
        });
    });

    describe("bumpModel", () => {
        it("increments model and resets revision and addition to 0", () => {
            const v = new SchemaVersion(1, 4, 7).bumpModel();
            expect(v.getModel()).toBe(2);
            expect(v.getRevision()).toBe(0);
            expect(v.getAddition()).toBe(0);
        });

        it("does not mutate the original instance", () => {
            const original = new SchemaVersion(2, 3, 4);
            original.bumpModel();
            expect(original.getModel()).toBe(2);
            expect(original.getRevision()).toBe(3);
            expect(original.getAddition()).toBe(4);
        });
    });

    describe("equals", () => {
        it("returns true for identical versions", () => {
            expect(new SchemaVersion(1, 2, 3).equals(new SchemaVersion(1, 2, 3))).toBe(true);
        });

        it("returns false when model differs", () => {
            expect(new SchemaVersion(1, 2, 3).equals(new SchemaVersion(2, 2, 3))).toBe(false);
        });

        it("returns false when revision differs", () => {
            expect(new SchemaVersion(1, 2, 3).equals(new SchemaVersion(1, 9, 3))).toBe(false);
        });

        it("returns false when addition differs", () => {
            expect(new SchemaVersion(1, 2, 3).equals(new SchemaVersion(1, 2, 9))).toBe(false);
        });
    });
});
