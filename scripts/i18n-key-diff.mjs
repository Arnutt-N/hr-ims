#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SRC = '/home/user/hr-ims/frontend/next-app/lib/i18n/messages.ts';
const OUT = process.argv[2] || '/home/user/hr-ims/reports/phase-a/2026-05-07/i18n-diff.json';

const text = readFileSync(SRC, 'utf8');

function extractKeysIn(blockName) {
    const start = text.indexOf(`const ${blockName}: Dictionary = {`);
    if (start === -1) throw new Error(`block ${blockName} not found`);
    let depth = 0;
    let i = text.indexOf('{', start);
    const open = i;
    for (; i < text.length; i++) {
        const ch = text[i];
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) break;
        }
    }
    const body = text.slice(open + 1, i);
    const keys = new Set();
    const re = /^\s*'([^']+)'\s*:/gm;
    let m;
    while ((m = re.exec(body)) !== null) keys.add(m[1]);
    return keys;
}

const en = extractKeysIn('en');
const th = extractKeysIn('th');

const missingInTh = [...en].filter((k) => !th.has(k)).sort();
const missingInEn = [...th].filter((k) => !en.has(k)).sort();

const summary = {
    enTotal: en.size,
    thTotal: th.size,
    diff: missingInTh.length + missingInEn.length,
    missingInTh,
    missingInEn,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(summary, null, 2));

console.log(`EN keys:  ${en.size}`);
console.log(`TH keys:  ${th.size}`);
console.log(`Missing in TH: ${missingInTh.length}`);
console.log(`Missing in EN: ${missingInEn.length}`);
console.log(`Wrote: ${OUT}`);
