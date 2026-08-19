# Plugin Manifest (v1)

> **Source of truth:** [`public/v1/plugin-manifest.schema.json`](../public/v1/plugin-manifest.schema.json)

This document describes the manifest format for Zenso plugins. Every plugin ships a `manifest.json` at the root of its zip archive. The manifest declares metadata, configuration schema, data sources, and runtime capabilities.

## Required fields

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique plugin identifier in `owner/repo` format. Must match `^[a-z0-9]+/[a-z0-9-]+$`. Example: `zenso/zenso-plugin-calendar`. |
| `name` | `string` | Human-readable plugin name shown in the panel. Must not be empty. |
| `schema_version` | `1` | Must be exactly `1` for this schema version. Matches the `v1` in the published URL. |
| `version` | `string` | Plugin version in SemVer `X.Y.Z` format. |
| `core_min` | `string` | Minimum Zenso core version required, in SemVer `X.Y.Z` format. |
| `config_schema` | `object` | JSON Schema (draft-07) describing the plugin instance configuration. See [Config schema](#config-schema) below. |

## Optional fields

| Field | Type | Description |
|---|---|---|
| `$schema` | `string` | URL of the manifest schema this file conforms to. Recommended: `https://schemas.zenso.ink/v1/plugin-manifest.schema.json`. |
| `thumbnail` | `string` | Relative path to a preview image bundled with the plugin. |
| `description` | `string` | Short description of what the plugin does. |
| `license` | `string` | SPDX license identifier (e.g. `MIT`). |
| `author` | `object` | Author information. If present, `author.name` (string) is required. `author.url` (string, URI) is optional. |
| `capabilities` | `array` | Runtime capabilities the plugin needs. Only `["script"]` is currently supported — it allows bundled `.js` files in the zip. If omitted, no `.js` files are permitted. |
| `data_sources` | `array` | Server-side data fetching declarations. See [Data sources](#data-sources) below. |

## Config schema

`config_schema` is a **standard JSON Schema (draft-07)** document that describes the plugin instance configuration (`configJson`). It must declare `type: "object"` and a `properties` map.

The Zenso panel reads `config_schema.properties` at runtime and renders one form field per property. Each property's `type` determines the input control:

| `type` | Panel renders as | Supported keywords |
|---|---|---|
| `string` | Text input | `enum` (dropdown), `format: "uri"` (URL validation), `default` |
| `number` | Number input | `minimum`, `maximum`, `default` |
| `boolean` | Toggle switch | `default` |
| `array` | Dynamic list with add/remove | `items.type` (`string`, `number`, or `boolean`), `items.format` |

### Config schema structure

```json
{
  "type": "object",
  "properties": {
    "<field_name>": {
      "type": "<string|number|boolean|array>",
      "description": "Help text shown below the field",
      "default": "<pre-filled value>",
      "enum": ["option1", "option2"],
      "format": "uri",
      "minimum": 1,
      "maximum": 100,
      "items": { "type": "string", "format": "uri" }
    }
  },
  "required": ["<field_name>"]
}
```

### Config schema fields

| Keyword | Applies to | Description |
|---|---|---|
| `type` | all | **Required.** Must be one of: `string`, `number`, `boolean`, `array`. |
| `description` | all | Help text shown below the input in the panel. |
| `default` | all | Pre-filled value. Any JSON value. |
| `enum` | `string`, `number` | Array of allowed values. Renders as a dropdown. Must have at least one item. |
| `format` | `string` | Format hint. Currently only `"uri"` is enforced by the panel (URL validation). Future: `date`, `time`, `datetime`, `email`. |
| `minimum` | `number` | Minimum allowed value. |
| `maximum` | `number` | Maximum allowed value. |
| `items` | `array` | Object with `type` (`string`, `number`, or `boolean`) and optional `format`. Defines the type of each list item. |

### Example: calendar plugin config

```json
{
  "type": "object",
  "properties": {
    "calendar_feeds": {
      "type": "array",
      "items": { "type": "string", "format": "uri" },
      "description": "ICS feed URLs (Google Calendar secret iCal address, Apple iCloud public calendar)"
    },
    "days_ahead": {
      "type": "number",
      "minimum": 1,
      "maximum": 60,
      "default": 14,
      "description": "How many days ahead to show events"
    },
    "view": {
      "type": "string",
      "enum": ["list", "month", "week", "day"],
      "default": "list",
      "description": "Calendar layout: list (agenda), month, week, or day grid"
    }
  },
  "required": ["calendar_feeds"]
}
```

This produces three form fields in the panel:
1. `calendar_feeds` — dynamic list of URL inputs (add/remove buttons)
2. `days_ahead` — number input with min 1, max 60, pre-filled 14
3. `view` — dropdown with four options, pre-selected "list"

### Example: minimal config (no fields)

A plugin with no user-facing configuration:

```json
{
  "type": "object",
  "properties": {}
}
```

## Data sources

`data_sources` is an array of server-side data fetching declarations. When a plugin instance is rendered, the Zenso backend:

1. Iterates each entry in `data_sources`.
2. Looks up a handler by `type` (currently only `"ics"` is registered).
3. Reads `configJson` values using field names from `config` (e.g. `urls_field: "calendar_feeds"` tells the handler to read `configJson.calendar_feeds`).
4. Fetches and processes data server-side (expanding recurring events, converting timezones).
5. Injects the result into the Liquid template context under `context[source.id]`.

Unknown `type` values are silently skipped with a warning — no crash.

### Data source fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | yes | Identifier for this source. The resolved data is injected into the template context under this key. |
| `type` | `string` | yes | Source handler type. Currently supported: `"ics"`. |
| `config` | `object` | no | Source-specific options. For `"ics"`: `{ "urls_field": "<configJson_key>", "days_ahead_field": "<configJson_key>" }` — references to config field names. |
| `refresh_ttl` | `number` | no | Cache TTL in seconds. Server enforces a minimum of 300. Default: 600. |

### Example: calendar data source

```json
{
  "data_sources": [
    {
      "id": "calendar",
      "type": "ics",
      "config": {
        "urls_field": "calendar_feeds",
        "days_ahead_field": "days_ahead"
      },
      "refresh_ttl": 600
    }
  ]
}
```

This tells the backend: "fetch ICS feeds from `configJson.calendar_feeds`, look ahead `configJson.days_ahead` days, cache for 600 seconds, and inject the result as `context.calendar`."

## Full manifest example

```json
{
  "$schema": "https://schemas.zenso.ink/v1/plugin-manifest.schema.json",
  "id": "zenso/zenso-plugin-calendar",
  "name": "Zenso Calendar",
  "thumbnail": "assets/logo.png",
  "description": "Read-only agenda view synced from Google Calendar or Apple iCloud via ICS feeds.",
  "schema_version": 1,
  "version": "0.0.2",
  "core_min": "0.0.0",
  "license": "MIT",
  "author": {
    "name": "Zenso",
    "url": "https://github.com/zensoink"
  },
  "capabilities": ["script"],
  "config_schema": {
    "type": "object",
    "properties": {
      "calendar_feeds": {
        "type": "array",
        "items": { "type": "string", "format": "uri" },
        "description": "ICS feed URLs (Google Calendar secret iCal address, Apple iCloud public calendar)"
      },
      "days_ahead": {
        "type": "number",
        "minimum": 1,
        "maximum": 60,
        "default": 14,
        "description": "How many days ahead to show events"
      },
      "view": {
        "type": "string",
        "enum": ["list", "month", "week", "day"],
        "default": "list",
        "description": "Calendar layout: list (agenda), month, week, or day grid"
      }
    },
    "required": ["calendar_feeds"]
  },
  "data_sources": [
    {
      "id": "calendar",
      "type": "ics",
      "config": {
        "urls_field": "calendar_feeds",
        "days_ahead_field": "days_ahead"
      },
      "refresh_ttl": 600
    }
  ]
}
```

## Versioning

| Change type | Example | Action |
|---|---|---|
| Breaking (remove field, change type) | Delete `config_schema` | New dir `v2/`, new `$id`, `schema_version: 2` |
| Backward-compatible (add optional field) | Add `tags` property | Update the file in-place under `v1/` |

Minor/patch updates (descriptions, new optional properties, new enum values, new config field types) are committed directly to `v1/`. Consumer plugins continue to work without migration.

New config field types (e.g. `date`, `object`) are added as in-place `v1` updates once both the panel and backend support them.
