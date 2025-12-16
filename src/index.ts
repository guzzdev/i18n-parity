import path from "node:path";
import { readdir, readFile } from "node:fs/promises";

export interface DiffResult {
    locale: string;
    totalLeafKeys: number;
    presentLeafKeys: number;
    coveragePercent: number;
    missingKeys: string[];
    emptyKeys: string[];
    extraKeys: string[];
}

export async function checkI18n(
    refLocale: string = "fr",
    localeDir: string = path.join(process.cwd(), "src/locales")
): Promise<DiffResult[]> {
    const files = (await readdir(localeDir)).filter(f => f.endsWith(".json"));
    if (files.length === 0) throw new Error("No files found in " + localeDir);

    const referencePath = path.join(localeDir, refLocale + ".json");
    const reference = await readJson(referencePath);

    const otherFiles = files.filter(f => f !== refLocale + ".json");
    const diffs = await Promise.all(
        otherFiles.map(async (file) => {
            const candidate = await readJson(path.join(localeDir, file));
            const locale = file.replace(/\.json$/, "");
            return diff(reference, candidate, locale);
        })
    );
    return diffs;
}

export function diff(
    reference: Record<string, unknown>,
    candidate: Record<string, unknown>,
    locale: string
): DiffResult {
    function isRecord(v: unknown): v is Record<string, unknown> {
        return typeof v === "object" && v !== null && !Array.isArray(v);
    }

    function getLeafPaths(obj: Record<string, unknown>, prefix = ""): string[] {
        const paths: string[] = [];
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            const next = prefix ? prefix + "." + key : key;
            if (isRecord(val)) paths.push(...getLeafPaths(val, next));
            else paths.push(next);
        }
        return paths;
    }

    function getValueByPath(obj: Record<string, unknown>, p: string): unknown {
        return p.split(".").reduce<unknown>((acc, seg) => {
            if (acc && typeof acc === "object" && !Array.isArray(acc)) {
                return (acc as Record<string, unknown>)[seg];
            }
            return undefined;
        }, obj);
    }

    function isEmptyValue(v: unknown): boolean {
        if (v == null) return true;
        if (typeof v === "string") return v.trim().length === 0;
        return false;
    }

    const referenceLeaves = getLeafPaths(reference);
    const candidateLeaves = getLeafPaths(candidate);

    const missingKeys: string[] = [];
    const emptyKeys: string[] = [];

    for (const p of referenceLeaves) {
        const v = getValueByPath(candidate, p);
        if (v === undefined) missingKeys.push(p);
        else if (isEmptyValue(v)) emptyKeys.push(p);
    }

    const extraKeys = candidateLeaves.filter(p => !referenceLeaves.includes(p));
    const totalLeafKeys = referenceLeaves.length;
    const presentLeafKeys = totalLeafKeys - missingKeys.length - emptyKeys.length;
    const coveragePercent = totalLeafKeys === 0 ? 100 : Math.round((presentLeafKeys / totalLeafKeys) * 10000) / 100;

    return { locale, totalLeafKeys, presentLeafKeys, coveragePercent, missingKeys, emptyKeys, extraKeys };
}

async function readJson(filePath: string): Promise<Record<string, unknown>> {
    const raw = await readFile(filePath, "utf8");
    const json = JSON.parse(raw);
    if (!json || typeof json !== "object" || Array.isArray(json)) {
        throw new Error("Invalid JSON: " + filePath);
    }
    return json as Record<string, unknown>;
}