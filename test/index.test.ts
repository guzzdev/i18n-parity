import { describe, test } from "node:test";
import assert from "node:assert";
import path from "node:path";

import { fileURLToPath } from "node:url";
import { diff, checkI18n, type DiffResult } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures", "locales");

describe("diff", () => {
    test("should detect missing keys", () => {
        const reference = {
            a: "value1",
            b: "value2",
            c: { nested: "value3" }
        };
        const candidate = {
            a: "valor1",
            c: { nested: "valor3" }
        };

        const result = diff(reference, candidate, "test");

        assert.deepStrictEqual(result.missingKeys, ["b"]);
        assert.strictEqual(result.emptyKeys.length, 0);
        assert.strictEqual(result.extraKeys.length, 0);
    });

    test("should detect empty keys", () => {
        const reference = {
            a: "value1",
            b: "value2"
        };
        const candidate = {
            a: "valor1",
            b: ""
        };

        const result = diff(reference, candidate, "test");

        assert.strictEqual(result.missingKeys.length, 0);
        assert.deepStrictEqual(result.emptyKeys, ["b"]);
    });

    test("should detect extra keys", () => {
        const reference = {
            a: "value1"
        };
        const candidate = {
            a: "valor1",
            b: "valor2",
            c: { nested: "valor3" }
        };

        const result = diff(reference, candidate, "test");

        assert.strictEqual(result.missingKeys.length, 0);
        assert.strictEqual(result.emptyKeys.length, 0);
        assert.deepStrictEqual(result.extraKeys, ["b", "c.nested"]);
    });

    test("should handle nested objects", () => {
        const reference = {
            level1: {
                level2: {
                    level3: "deep value"
                }
            }
        };
        const candidate = {
            level1: {
                level2: {}
            }
        };

        const result = diff(reference, candidate, "test");

        assert.deepStrictEqual(result.missingKeys, ["level1.level2.level3"]);
    });

    test("should calculate coverage correctly", () => {
        const reference = {
            a: "1",
            b: "2",
            c: "3",
            d: "4"
        };
        const candidate = {
            a: "1",
            b: "",
            d: "4"
        };

        const result = diff(reference, candidate, "test");

        assert.strictEqual(result.totalLeafKeys, 4);
        assert.strictEqual(result.presentLeafKeys, 2); // a et d
        assert.strictEqual(result.coveragePercent, 50);
        assert.strictEqual(result.missingKeys.length, 1); // c
        assert.strictEqual(result.emptyKeys.length, 1); // b
    });

    test("should handle 100% coverage", () => {
        const reference = {
            a: "value1",
            b: "value2"
        };
        const candidate = {
            a: "valor1",
            b: "valor2"
        };

        const result = diff(reference, candidate, "test");

        assert.strictEqual(result.coveragePercent, 100);
        assert.strictEqual(result.missingKeys.length, 0);
        assert.strictEqual(result.emptyKeys.length, 0);
    });

    test("should handle whitespace-only strings as empty", () => {
        const reference = { a: "value" };
        const candidate = { a: "   " };

        const result = diff(reference, candidate, "test");

        assert.deepStrictEqual(result.emptyKeys, ["a"]);
    });

    test("should handle null values as empty", () => {
        const reference = { a: "value" };
        const candidate = { a: null };

        const result = diff(reference, candidate, "test");

        assert.deepStrictEqual(result.emptyKeys, ["a"]);
    });

    test("should set locale correctly", () => {
        const result = diff({}, {}, "es-ES");
        assert.strictEqual(result.locale, "es-ES");
    });
});

describe("checkI18n", () => {
    test("should analyze all locales against reference", async () => {
        const results = await checkI18n("fr", fixturesDir);

        assert.strictEqual(results.length, 2); // en and es

        const enResult = results.find(r => r.locale === "en");
        const esResult = results.find(r => r.locale === "es");

        assert.ok(enResult, "en result should exist");
        assert.ok(esResult, "es result should exist");

        assert.strictEqual(enResult.coveragePercent, 100);
        assert.strictEqual(enResult.missingKeys.length, 0);
        assert.strictEqual(enResult.emptyKeys.length, 0);
        assert.strictEqual(enResult.extraKeys.length, 0);

        assert.ok(esResult.coveragePercent < 100);
        assert.ok(esResult.missingKeys.includes("commands.anchor"));
        assert.ok(esResult.emptyKeys.includes("navigation.starboard"));
        assert.ok(esResult.extraKeys.includes("extra.compass"));
    });

    test("should throw error if directory is empty", async () => {
        const emptyDir = path.join(__dirname, "fixtures", "empty");
        await assert.rejects(
            async () => await checkI18n("fr", emptyDir),
            /No files found/
        );
    });

    test("should exclude reference locale from results", async () => {
        const results = await checkI18n("fr", fixturesDir);
        const frResult = results.find(r => r.locale === "fr");

        assert.strictEqual(frResult, undefined, "Reference locale should not be in results");
    });
});

describe("DiffResult interface", () => {
    test("should have correct structure", () => {
        const result: DiffResult = diff({ a: "1" }, { a: "1" }, "test");

        assert.ok(typeof result.locale === "string");
        assert.ok(typeof result.totalLeafKeys === "number");
        assert.ok(typeof result.presentLeafKeys === "number");
        assert.ok(typeof result.coveragePercent === "number");
        assert.ok(Array.isArray(result.missingKeys));
        assert.ok(Array.isArray(result.emptyKeys));
        assert.ok(Array.isArray(result.extraKeys));
    });
});
