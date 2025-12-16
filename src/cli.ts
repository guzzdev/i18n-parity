#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { diff, checkI18n, type DiffResult } from "./index.js";

type Flags = {
    ref: string;
    dir: string;
    format: "table" | "json";
    "fail-on": string[];
};

function parseArgs(argv: string[]): Flags {
    const out: Flags = { ref: "fr", dir: "src/locales", format: "table", "fail-on": [] };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--ref" && argv[i + 1]) out.ref = argv[++i];
        else if (a === "--dir" && argv[i + 1]) out.dir = argv[++i];
        else if (a === "--format" && argv[i + 1]) out.format = (argv[++i] as Flags["format"]);
        else if (a === "--fail-on" && argv[i + 1]) out["fail-on"] = argv[++i].split(",").map(s => s.trim());
        else if (a === "-h" || a === "--help") {
            printHelp();
            process.exit(0);
        }
    }
    return out;
}

function printHelp() {
    console.log(`i18n-parity
Usage:
  i18n-parity --ref fr --dir ./src/locales [--format table|json] [--fail-on missing,empty,extra]

Options:
  --ref       Reference locale filename (without .json). Default: fr
  --dir       Locales directory. Default: ./src/locales
  --format    Output format: table|json. Default: table
  --fail-on   Comma list: missing,empty,extra. Default: none
`);
}

(async () => {
    const flags = parseArgs(process.argv);
    const dir = path.isAbsolute(flags.dir) ? flags.dir : path.join(process.cwd(), flags.dir);

    const results = await checkI18n(flags.ref, dir);

    if (flags.format === "json") {
        console.log(JSON.stringify(results, null, 2));
    } else {
        console.table(results.map(r => ({
            locale: r.locale,
            coverage: r.coveragePercent + "%",
            missing: r.missingKeys.length,
            empty: r.emptyKeys.length,
            extra: r.extraKeys.length,
        })));

        for (const r of results) {
            if (r.missingKeys.length) {
                console.log(`[${r.locale}] Missing keys (${r.missingKeys.length}):`);
                for (const k of r.missingKeys) console.log("  - " + k);
            }
            if (r.emptyKeys.length) {
                console.log(`[${r.locale}] Empty keys (${r.emptyKeys.length}):`);
                for (const k of r.emptyKeys) console.log("  - " + k);
            }
            if (r.extraKeys.length) {
                console.log(`[${r.locale}] Extra keys (${r.extraKeys.length}):`);
                for (const k of r.extraKeys) console.log("  - " + k);
            }
        }
    }

    const failOn = new Set(flags["fail-on"]);
    const shouldFail = results.some(r =>
        (failOn.has("missing") && r.missingKeys.length > 0) ||
        (failOn.has("empty") && r.emptyKeys.length > 0) ||
        (failOn.has("extra") && r.extraKeys.length > 0)
    );

    if (shouldFail) {
        process.exitCode = 1;
    }
})();