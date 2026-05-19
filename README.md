# Schema Store

[![npm version](https://badge.fury.io/js/@eresearchqut%2Fschema-store.svg)](https://badge.fury.io/js/@eresearchqut%2Fschema-store)
[![Coverage Status](https://coveralls.io/repos/github/eresearchqut/schema-store/badge.svg?branch=main)](https://coveralls.io/github/eresearchqut/schema-store?branch=main)

A TypeScript library for versioned [JSON Schema](https://json-schema.org/) lifecycle management. It provides a storage-agnostic repository layer for creating, retrieving, and evolving schemas over time — with built-in validation against JSON Schema drafts 04 through 2020-12 and a domain-specific three-part versioning system (`model-revision-addition`) that makes the intent of each schema change explicit.

## Features

- **Versioned schema storage** — schemas are stored with a three-part `{model}-{revision}-{addition}` version (e.g. `1-2-0`), analogous to semver with domain-specific semantics
- **Multi-draft support** — supports JSON Schema drafts `draft-04`, `draft-06`, `draft-07`, `draft-2019-09`, and `draft-2020-12` via [`json-schema-library`](https://github.com/sagold/json-schema-library)
- **Schema validation** — schemas are validated against their draft meta-schema on create and update
- **Data validation** — validate arbitrary data against any stored schema
- **Automatic stamping** — `$schema` (draft URI) and `$id` (`{baseUrl}/{path}/{version}`) are stamped onto every stored schema
- **Pluggable storage** — implement the `ISchemaStore` interface to back the store with any persistence layer (e.g. DynamoDB, S3)
- **Built-in in-memory store** — `SerializableSchemaStore` provides a JSON-serializable in-memory implementation for testing and lightweight use
- **Typed errors** — structured error classes (`SchemaCreateError`, `SchemaNotFoundError`, `SchemaUpdateError`, `SchemaValidationError`) make error handling precise

## Installation

```sh
npm install @eresearchqut/schema-store
```

## Prerequisites

- Node.js
- [`json-schema-library`](https://www.npmjs.com/package/json-schema-library) and [`lodash`](https://www.npmjs.com/package/lodash) (peer dependencies)

```sh
npm install json-schema-library lodash
```

## Usage

### Basic setup

```ts
import { SchemaRepository, SerializableSchemaStore } from "@eresearchqut/schema-store";

const repo = new SchemaRepository({
  schemaStore: new SerializableSchemaStore(),
  baseUrl: new URL("https://schemas.example.com/"),
});
```

### Creating a schema

Schemas are validated against the specified draft meta-schema before being stored. On success, the returned schema is stamped with `$schema` and `$id`.

```ts
const schema = await repo.createSchema({
  path: "person",
  draftId: "draft-2020-12",
  schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      age:  { type: "integer" },
    },
    required: ["name"],
  },
});

// schema.$id     → "https://schemas.example.com/person/0-0-1"
// schema.$schema → "https://json-schema.org/draft/2020-12/schema"
```

### Retrieving a schema

```ts
// Latest version
const latest = await repo.getSchema({ path: "person" });

// Specific version
import { SchemaVersion } from "@eresearchqut/schema-store";

const specific = await repo.getSchema({
  path: "person",
  schemaVersion: SchemaVersion.fromString("1-0-0"),
});
```

### Updating a schema

Use `updateType` to control version bumping:

| `updateType` | When to use | Version change |
|---|---|---|
| `addition` | New optional fields added | `0-0-1` → `0-0-2` |
| `revision` | Existing fields changed (non-breaking) | `0-0-2` → `0-1-0` |
| `model` | Breaking/structural change | `0-1-0` → `1-0-0` |

```ts
const updated = await repo.updateSchema({
  path: "person",
  draftId: "draft-2020-12",
  updateType: "addition",
  schema: {
    type: "object",
    properties: {
      name:  { type: "string" },
      age:   { type: "integer" },
      email: { type: "string", format: "email" },
    },
    required: ["name"],
  },
});

// updated.$id → "https://schemas.example.com/person/0-0-2"
```

### Validating data

```ts
import { validate } from "@eresearchqut/schema-store";

const schema = await repo.getSchema({ path: "person" });
const errors = validate("draft-2020-12", schema, { name: "Alice", age: 30 });

if (errors.length === 0) {
  console.log("Data is valid");
}
```

### Error handling

```ts
import {
  SchemaCreateError,
  SchemaNotFoundError,
  SchemaValidationError,
} from "@eresearchqut/schema-store";

try {
  await repo.createSchema({ path: "person", draftId: "draft-2020-12", schema: {} });
} catch (err) {
  if (err instanceof SchemaCreateError) {
    console.error("Schema already exists at path:", err.getPath());
  } else if (err instanceof SchemaValidationError) {
    console.error("Invalid schema:", err.getErrors());
  }
}
```

### Implementing a custom store

Implement the `ISchemaStore` interface to use any persistence backend:

```ts
import type {
  ISchemaStore,
  SchemaStorePutRequest,
  SchemaStoreGetRequest,
  SchemaStoreGetVersionsRequest,
} from "@eresearchqut/schema-store";
import { SchemaVersion } from "@eresearchqut/schema-store";
import type { JsonSchema } from "json-schema-library";

class MyStore implements ISchemaStore {
  async put(request: SchemaStorePutRequest): Promise<JsonSchema> { /* … */ }
  async get(request: SchemaStoreGetRequest): Promise<JsonSchema | undefined> { /* … */ }
  async getVersions(request: SchemaStoreGetVersionsRequest): Promise<SchemaVersion[]> { /* … */ }
  async getLatestVersion(request: Pick<SchemaStoreGetRequest, "path">): Promise<SchemaVersion | undefined> { /* … */ }
}

const repo = new SchemaRepository({
  schemaStore: new MyStore(),
  baseUrl: new URL("https://schemas.example.com/"),
});
```

### Schema lifecycle: create, evolve, breaking change

A complete example showing a schema evolving through all three update types:

```ts
const repo = new SchemaRepository({
  schemaStore: new SerializableSchemaStore(),
  baseUrl: new URL("https://schemas.example.com/"),
});

// 1. Create at 0-0-1
await repo.createSchema({
  path: "order",
  draftId: "draft-2020-12",
  schema: {
    type: "object",
    properties: {
      id:     { type: "string" },
      amount: { type: "number" },
    },
    required: ["id", "amount"],
  },
});

// 2. Add an optional field → 0-0-2
await repo.updateSchema({
  path: "order",
  draftId: "draft-2020-12",
  updateType: "addition",
  schema: {
    type: "object",
    properties: {
      id:       { type: "string" },
      amount:   { type: "number" },
      currency: { type: "string" },         // new optional field
    },
    required: ["id", "amount"],
  },
});

// 3. Tighten an existing field (non-breaking) → 0-1-0
await repo.updateSchema({
  path: "order",
  draftId: "draft-2020-12",
  updateType: "revision",
  schema: {
    type: "object",
    properties: {
      id:       { type: "string", minLength: 1 }, // added constraint
      amount:   { type: "number", minimum: 0 },   // added constraint
      currency: { type: "string" },
    },
    required: ["id", "amount"],
  },
});

// 4. Breaking restructure → 1-0-0
await repo.updateSchema({
  path: "order",
  draftId: "draft-2020-12",
  updateType: "model",
  schema: {
    type: "object",
    properties: {
      id:    { type: "string", minLength: 1 },
      total: {                                    // renamed from amount
        type: "object",
        properties: {
          value:    { type: "number", minimum: 0 },
          currency: { type: "string" },
        },
        required: ["value", "currency"],
      },
    },
    required: ["id", "total"],
  },
});

const version = await repo.getLatestVersion("order");
console.log(version.toString()); // "1-0-0"
```

### Migrating between JSON Schema drafts

Changing the draft is a breaking change and requires `updateType: "model"`. Mixing drafts on
`revision` or `addition` updates throws a `SchemaUpdateError`.

```ts
// Schema created with draft-07
await repo.createSchema({
  path: "product",
  draftId: "draft-07",
  schema: { type: "object", properties: { name: { type: "string" } } },
});

// Migrate to draft-2020-12 — must use updateType: "model"
await repo.updateSchema({
  path: "product",
  draftId: "draft-2020-12",
  updateType: "model",
  schema: { type: "object", properties: { name: { type: "string" } } },
});
// version bumps to 1-0-0, $schema updated to draft-2020-12 URI
```

### Persisting state with SerializableSchemaStore

`SerializableSchemaStore` can be snapshotted to JSON and restored, making it useful for
lambda-style environments or test fixtures:

```ts
const store = new SerializableSchemaStore();
const repo = new SchemaRepository({
  schemaStore: store,
  baseUrl: new URL("https://schemas.example.com/"),
});

await repo.createSchema({ path: "item", draftId: "draft-2020-12", schema: { type: "object" } });

// Snapshot to a string (e.g. write to S3, a database, or a file)
const snapshot = store.marshall();

// Later — restore into a fresh store
const restored = new SerializableSchemaStore();
restored.unmarshall(snapshot);

const restoredRepo = new SchemaRepository({
  schemaStore: restored,
  baseUrl: new URL("https://schemas.example.com/"),
});

const schema = await restoredRepo.getSchema({ path: "item" });
```

### Custom starting version

By default the first version is `0-0-1`. Pass `firstVersion` to start elsewhere:

```ts
import { SchemaRepository, SerializableSchemaStore, SchemaVersion } from "@eresearchqut/schema-store";

const repo = new SchemaRepository({
  schemaStore: new SerializableSchemaStore(),
  baseUrl: new URL("https://schemas.example.com/"),
  firstVersion: new SchemaVersion(1, 0, 0),
});

await repo.createSchema({
  path: "config",
  draftId: "draft-2020-12",
  schema: { type: "object" },
});

const version = await repo.getLatestVersion("config");
console.log(version.toString()); // "1-0-0"
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.


### Commit message convention
Semantic release uses conventional commits. Your commit messages should follow this format:

* feat: new feature → triggers minor version bump (1.x.0)
* fix: bug fix → triggers patch version bump (1.0.x)
* perf: performance improvement → triggers patch version bump
* docs: documentation change → no release
* chore: maintenance task → no release
* BREAKING CHANGE: in footer → triggers major version bump (x.0.0)

Example:

> feat: add batch write support
>
> Added support for batch write operations to improve performance

Or with breaking change:

> feat: change repository API
> 
> BREAKING CHANGE: The query method now returns a Promise instead of an Observable

## License

MIT

## Support

For issues and questions, please open an issue on the GitHub repository.
