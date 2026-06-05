# AGENTS.md

## Repository Overview

`@eresearchqut/schema-store` is a TypeScript library that provides versioned storage and lifecycle management for [JSON Schemas](https://json-schema.org/). It supports JSON Schema drafts 04 through 2020-12 via the [`json-schema-library`](https://github.com/sagold/json-schema-library) peer dependency.

The library ships as both ESM and CJS (dual-package via `tsdown`).

---

## Key Concepts

### SchemaVersion (`src/SchemaVersion.ts`)
A three-part version in the format `{model}-{revision}-{addition}` (e.g. `0-0-1`, `1-2-0`). Analogous to semver but with domain-specific naming:

| Component  | Bumped when…                                             |
|------------|----------------------------------------------------------|
| `model`    | Breaking/structural change (also resets revision & addition) |
| `revision` | Non-breaking change to existing fields (resets addition) |
| `addition` | New fields added                                         |

### ISchemaStore (`src/SchemaStore.ts`)
An interface for the backing storage layer. Consumers provide their own implementation (e.g. DynamoDB, S3). A built-in `SerializableSchemaStore` (in-memory, JSON-serializable) is included for testing and lightweight use.

### SchemaRepository (`src/SchemaRepository.ts`)
The main entry point for schema lifecycle management. Wraps an `ISchemaStore` and handles:
- **Create** – stores a schema at the first version (default `0-0-1`), validates it against the specified draft, and stamps `$schema` and `$id` onto the stored document.
- **Get** – retrieves a schema by path and optional version (defaults to latest).
- **Update** – bumps the version according to the `updateType` (`model | revision | addition`), re-validates, and stamps the new version.

Schemas are stamped with:
- `$schema` – the canonical URI for the JSON Schema draft.
- `$id` – `{baseUrl}/{path}/{version}` (e.g. `https://example.com/schemas/person/0-0-1`).

### Drafts (`src/Drafts.ts`)
Supported draft IDs: `draft-04`, `draft-06`, `draft-07`, `draft-2019-09`, `draft-2020-12`.

### SchemaUtils (`src/SchemaUtils.ts`)
- `validateSchema(draftId, schema)` – validates a JSON Schema document against its draft meta-schema.
- `validate(draftId, schema, data)` – validates arbitrary data against a compiled schema.

---

## Project Structure

```
src/
  Drafts.ts                 # Draft ID types, meta-schemas, and compilers
  SchemaRepository.ts       # High-level CRUD + versioning logic and error types
  SchemaStore.ts            # ISchemaStore interface and request/response types
  SchemaUtils.ts            # Schema and data validation helpers
  SchemaVersion.ts          # Three-part version value object
  SerializableSchemaStore.ts# In-memory ISchemaStore with JSON marshal/unmarshal
  index.ts                  # Re-exports everything

test/
  SchemaRepository.test.ts
  SchemaUtils.test.ts
  SerializableSchemaStore.test.ts
```

---

## Development Commands

```sh
npm run build          # Compile to dist/ (ESM + CJS) using tsdown
npm run test           # Run Vitest test suite
npm run test:coverage  # Run tests with coverage report
npm run lint           # ESLint
npm run lint:fix       # ESLint with auto-fix
```

---

## Error Types

All errors extend `SchemaRepositoryError` (which extends `Error`) and expose typed getters:

| Error class              | Thrown when                                              |
|--------------------------|----------------------------------------------------------|
| `SchemaCreateError`      | Creating a schema at a path that already exists          |
| `SchemaNotFoundError`    | Getting/updating a schema at a path/version that doesn't exist |
| `SchemaUpdateError`      | Updating with a mismatched draft on a non-`model` update |
| `SchemaValidationError`  | Schema fails meta-schema validation; exposes `getErrors()` |

---

## Commit Convention

This repo uses [Conventional Commits](https://www.conventionalcommits.org/) and [semantic-release](https://semantic-release.gitbook.io/):

| Prefix             | Release triggered         |
|--------------------|---------------------------|
| `feat:`            | Minor version bump        |
| `fix:` / `perf:`   | Patch version bump        |
| `docs:` / `chore:` | No release                |
| `BREAKING CHANGE:` | Major version bump        |

---

## Implementing a Custom Store

Implement the `ISchemaStore` interface:

```ts
import { ISchemaStore, SchemaStorePutRequest, SchemaStoreGetRequest,
         SchemaStoreGetVersionsRequest, SchemaVersion } from "@eresearchqut/schema-store";
import { JsonSchema } from "json-schema-library";

class MyStore implements ISchemaStore {
  async put(request: SchemaStorePutRequest): Promise<JsonSchema> { /* … */ }
  async get(request: SchemaStoreGetRequest): Promise<JsonSchema | undefined> { /* … */ }
  async getVersions(request: SchemaStoreGetVersionsRequest): Promise<SchemaVersion[]> { /* … */ }
  async getLatestVersion(request: Pick<SchemaStoreGetRequest, "path">): Promise<SchemaVersion | undefined> { /* … */ }
}
```

Then wire it up with `SchemaRepository`:

```ts
const repo = new SchemaRepository({
  schemaStore: new MyStore(),
  baseUrl: new URL("https://schemas.example.com/"),
});
```
