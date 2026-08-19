# zenso-schemas

JSON Schemas for the Zenso plugin ecosystem, published at **https://schemas.zenso.ink**.

## Structure

```
public/
  _headers                          # Cloudflare Pages headers (CORS + cache)
  v1/
    plugin-manifest.schema.json     # Schema for plugin manifest files
scripts/
  validate.mjs                      # Meta-schema validation
package.json
.github/workflows/
  validate-and-deploy.yml           # CI: schema validation
```

## Versioning strategy

Only **major versions** appear in the URL (`/v1/`, `/v2/`, ...).

| Change type | Example | Action |
|---|---|---|
| Breaking (remove field, change type) | Delete `config_schema` | New dir `v2/`, new `$id`, `schema_version: 2` |
| Backward-compatible (add optional field) | Add `tags` property | Update the file in-place under `v1/` |

Minor/patch updates (descriptions, new optional properties, enum extensions) are committed directly to the existing `v1/` directory. Consumer plugins continue to work without migration.

Each schema file has a hardcoded `$id`:

```
https://schemas.zenso.ink/v1/plugin-manifest.schema.json
```

This URL must match the file's path on the CDN.

## Contract

The schema at `public/v1/plugin-manifest.schema.json` is the **source of truth** for the plugin manifest format. All three consumers read it to stay in sync:

**`plugin-manifest.schema.json`** (this repo) → **API** (`zenso-api`) zod schema + TS types → **Panel** (`zenso-panel`) form builder (`buildFields()`).

### Required fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Pattern: `owner/repo` |
| `name` | string | yes | |
| `schema_version` | number | yes | `1` for v1 |
| `version` | string | yes | SemVer `X.Y.Z` |
| `core_min` | string | yes | SemVer `X.Y.Z` |
| `config_schema` | object | yes | See below |

### Optional fields

| Field | Type | Notes |
|---|---|---|
| `$schema` | string | URL of the schema |
| `thumbnail` | string | Relative path |
| `description` | string | |
| `license` | string | |
| `author` | object | `{ name, url? }` |
| `capabilities` | array | Only `["script"]` supported |
| `data_sources` | array | `{ id, type, config?, refresh_ttl? }` |

### `config_schema` — config form types

The panel's `buildFields()` reads each property's `type` and renders a form field. Supported types:

| `type` | Renders as | Key keywords |
|---|---|---|
| `string` | Text input | `enum` → dropdown, `format: "uri"` → URL validation |
| `number` | Number input | `minimum`, `maximum`, `default` |
| `boolean` | Toggle switch | |
| `array` | Dynamic list | `items.type` → `string\|number\|boolean` |

Nested objects are not supported by the panel form builder.

## Local development

```bash
npm install
npm run validate          # validate schemas against the draft-07 meta-schema
```

## Releasing a new major version

1. Copy `public/v1/` → `public/v2/`.
2. In `public/v2/plugin-manifest.schema.json`:
   - Change `$id` to `https://schemas.zenso.ink/v2/plugin-manifest.schema.json`.
   - Change `schema_version` const to `2`.
3. Add the new dir to CI validation globs (`public/v2/*.json`).
4. Merge to `main`. Cloudflare Pages auto-deploys.

## Deployment

Cloudflare Pages, connected to this repo:

- **Build command:** *(empty)*
- **Build output:** `public`
- **Custom domain:** `schemas.zenso.ink`

Auto-deploys on every push to `main`. Versioned paths (`/v*/`) are cached aggressively (immutable); the root `/` catch-all revalidates every hour.
