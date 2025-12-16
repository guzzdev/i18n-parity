# i18n-parity

Validate parity of translation keys across locales: reports missing, empty, and extra keys with coverage (%)

[![npm version](https://img.shields.io/npm/v/i18n-parity.svg)](https://www.npmjs.com/package/i18n-parity)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Note:** Built for [next-intl](https://next-intl.dev/) but works with any JSON-based i18n setup.

Feel free to contribute or contact me.

## Features

 - Missing keys detection
 - Empty value detection 
 - Extra keys detection
 - Coverage metrics
 - CI/CD
 - Fast & lightweight


## Install

```bash
npm i -D i18n-parity

bun add -d i18n-parity
```

## Usage

```bash
i18n-parity --ref en --dir ./src/locales
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--ref` | Reference locale (filename w/o .json) | `fr` |
| `--dir` | Directory with locale JSON files | `./src/locales` |
| `--format` | `table` or `json` | `table` |
| `--fail-on` | Exit with error on: `missing`, `empty`, `extra` | none |

### Examples

```bash
# Basic usage
i18n-parity --ref en --dir ./locales

# JSON output for CI
i18n-parity --format json

# Fail on missing or empty translations
i18n-parity --fail-on missing,empty
```

Output looks like this:

```
┌─────────┬──────────┬─────────┬───────┬───────┐
│ locale  │ coverage │ missing │ empty │ extra │
├─────────┼──────────┼─────────┼───────┼───────┤
│ es      │ 85.71%   │ 1       │ 1     │ 1     │
│ de      │ 100%     │ 0       │ 0     │ 0     │
└─────────┴──────────┴─────────┴───────┴───────┘

[es] Missing keys (1):
  - navigation.compass
[es] Empty keys (1):
  - commands.anchor
```

## API

```typescript
import { checkI18n, diff } from "i18n-parity";

const results = await checkI18n("en", "src/locales");
console.log(results[0].coveragePercent);
```

The `DiffResult` type:

```typescript
type DiffResult = {
  locale: string;
  totalLeafKeys: number;
  presentLeafKeys: number;
  coveragePercent: number;
  missingKeys: string[];
  emptyKeys: string[];
  extraKeys: string[];
}
```

## CI Setup

GitHub Actions:

```yaml
- uses: oven-sh/setup-bun@v2
- run: bun install
- run: bun i18n-parity --ref en --dir ./locales --fail-on missing,empty
```

## License
[MIT](LICENSE)