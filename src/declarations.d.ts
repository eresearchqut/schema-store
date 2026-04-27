// Local type declarations for packages whose sub-path exports lack explicit
// "types" conditions in their package.json exports map (not resolvable by TS6).
declare module "json-schema-library/remotes" {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const remotes: any[];
}
