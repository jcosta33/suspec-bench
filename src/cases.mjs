// The fixture set loader (AC-001). Loads every cases/<name>/{case.json, expected.json} and ASSERTS each
// case carries a non-empty category tag and a declared expected-facts set (clean cases declare the
// empty set []). A case that violates the contract throws — the fixture set refuses to load.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const CASES_DIR = join(HERE, '..', 'cases');

function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Load and validate the fixture set. Returns an array of cases, each:
 *   { name, dir, category, failureModeSource, slug, taskStem, spec, task, reviewPacket?,
 *     baseFiles, changeSet, expectedFacts: string[], targetFacts: string[] }
 * Throws if any case is malformed (the AC-001 loader assertion).
 */
export function loadCases(casesDir = CASES_DIR) {
    if (!existsSync(casesDir)) {
        throw new Error(`cases directory not found: ${casesDir}`);
    }
    const names = readdirSync(casesDir)
        .filter((n) => statSync(join(casesDir, n)).isDirectory())
        .sort();
    if (names.length === 0) {
        throw new Error(`case set is empty: no case directories under ${casesDir}`);
    }

    const cases = [];
    for (const name of names) {
        const dir = join(casesDir, name);
        const casePath = join(dir, 'case.json');
        const expectedPath = join(dir, 'expected.json');
        if (!existsSync(casePath)) throw new Error(`case '${name}': missing case.json`);
        if (!existsSync(expectedPath)) throw new Error(`case '${name}': missing expected.json`);

        const c = readJson(casePath);
        const e = readJson(expectedPath);

        // AC-001: non-empty category tag.
        if (typeof c.category !== 'string' || c.category.trim() === '') {
            throw new Error(`case '${name}': case.json must carry a non-empty 'category' tag`);
        }
        if (typeof e.category !== 'string' || e.category.trim() === '') {
            throw new Error(`case '${name}': expected.json must carry a non-empty 'category' tag`);
        }
        if (c.category !== e.category) {
            throw new Error(
                `case '${name}': category mismatch — case.json '${c.category}' vs expected.json '${e.category}'`
            );
        }
        // AC-005: each seeded category names its failure-mode source.
        if (typeof c.failureModeSource !== 'string' || c.failureModeSource.trim() === '') {
            throw new Error(`case '${name}': case.json must name a 'failureModeSource' (AC-005 bias control)`);
        }
        // AC-001: a declared expected-facts set (an array; clean cases declare []).
        if (!Array.isArray(e.expectedFacts)) {
            throw new Error(`case '${name}': expected.json must declare 'expectedFacts' as an array (clean cases use [])`);
        }
        for (const f of e.expectedFacts) {
            if (typeof f !== 'string') throw new Error(`case '${name}': every expected fact must be a string`);
        }
        // A clean case (category 'clean') MUST declare the empty set.
        if (c.category === 'clean' && e.expectedFacts.length !== 0) {
            throw new Error(`case '${name}': a 'clean' case must declare the empty expected-facts set [], got ${JSON.stringify(e.expectedFacts)}`);
        }
        // targetFacts (the seeded signal recall is scored over) MUST be a subset of expectedFacts, so a
        // case can never inflate recall with a target the gate is not also expected to emit — the
        // anyMiss hard-fail keys on expectedFacts, so a missed target is always a missed expected fact.
        // Defaults to expectedFacts when omitted.
        const targetFacts = Array.isArray(e.targetFacts) ? e.targetFacts : e.expectedFacts;
        for (const t of targetFacts) {
            if (typeof t !== 'string') throw new Error(`case '${name}': every target fact must be a string`);
            if (!e.expectedFacts.includes(t)) {
                throw new Error(
                    `case '${name}': targetFact ${JSON.stringify(t)} is not in expectedFacts — recall must be scored only over declared expected facts`
                );
            }
        }
        // Materialization fields.
        for (const field of ['slug', 'taskStem', 'spec', 'task']) {
            if (typeof c[field] !== 'string' || c[field].trim() === '') {
                throw new Error(`case '${name}': case.json missing required field '${field}'`);
            }
        }

        cases.push({
            name,
            dir,
            category: c.category,
            failureModeSource: c.failureModeSource,
            slug: c.slug,
            taskStem: c.taskStem,
            spec: c.spec,
            task: c.task,
            reviewPacket: c.reviewPacket ?? null,
            baseFiles: c.baseFiles ?? {},
            changeSet: c.changeSet ?? {},
            expectedFacts: e.expectedFacts,
            targetFacts,
        });
    }
    return cases;
}
