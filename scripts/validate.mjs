#!/usr/bin/env node
// Validate all schemas in public/v1/ against the draft-07 meta-schema,
// so a corrupted schema can never be published.
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const Ajv = (await import('ajv')).default;

const ajv = new Ajv({ strict: false });

const root = new URL('..', import.meta.url).pathname;
const meta = require('ajv/dist/refs/json-schema-draft-07.json');
const validateMeta = ajv.compile(meta);

const schemaDir = join(root, 'public', 'v1');
const schemaFiles = readdirSync(schemaDir).filter(f => f.endsWith('.json'));

let fail = false;
for (const file of schemaFiles) {
  const schema = JSON.parse(readFileSync(join(schemaDir, file), 'utf-8'));
  if (!validateMeta(schema)) {
    console.error(`✗ ${file} — invalid draft-07 schema`);
    console.error(JSON.stringify(validateMeta.errors, null, 2));
    fail = true;
  } else {
    console.log(`✓ ${file} — valid draft-07 schema`);
  }
}

if (fail) {
  process.exit(1);
}
