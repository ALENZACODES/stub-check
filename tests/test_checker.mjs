import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const C = require('../checker.js');
const Rd = require('../reader.js');
const R = JSON.parse(readFileSync(new URL('../data/rates-2026.json', import.meta.url)));

// Rates match the CRA 2026 tables checked Nov 14, 2026
assert.equal(R.cpp.rate, 0.0595); assert.equal(R.cpp.ympe, 74600); assert.equal(R.cpp.basicExemption, 3500); assert.equal(R.cpp.maxEmployee, 4230.45);
assert.equal(R.cpp2.rate, 0.04); assert.equal(R.cpp2.yampe, 85000); assert.equal(R.cpp2.maxEmployee, 416);
assert.equal(R.ei.rate, 0.0163); assert.equal(R.ei.maxInsurable, 68900); assert.equal(R.ei.maxEmployee, 1123.07);
// The published maximums follow from the rates
assert.equal(C.cents((R.cpp.ympe - R.cpp.basicExemption) * R.cpp.rate), R.cpp.maxEmployee);
assert.equal(C.cents((R.cpp2.yampe - R.cpp.ympe) * R.cpp2.rate), R.cpp2.maxEmployee);
assert.equal(C.cents(R.ei.maxInsurable * R.ei.rate), R.ei.maxEmployee);

// Per pay math
assert.equal(C.expectedCpp(2400, 26, null, R), 134.79);
assert.equal(C.expectedEi(2400, null, R), 39.12);
assert.equal(C.expectedCpp(100, 26, null, R), 0, 'below the exemption owes no CPP');
assert.equal(C.expectedCpp(8000, 12, 4127.85, R), 102.6, 'caps at the yearly maximum');
assert.equal(C.expectedCpp2(8000, 72000, R), 216);
assert.equal(C.expectedCpp2(8000, 60000, R), 0);
assert.equal(C.expectedCpp2(8000, 84000, R), 40);
assert.equal(C.expectedEi(8000, 1123.07, R), 0);
assert.equal(C.expectedEi(8000, 1100, R), 23.07);

const read = (f) => Rd.read(readFileSync(new URL('../samples/' + f, import.meta.url), 'utf8'));

// Sample 1: everything matches
const a = read('biweekly-ok.txt');
assert.deepEqual([a.frequency, a.gross, a.cpp, a.cpp2, a.ei, a.incomeTax, a.net, a.ytdGross, a.ytdCpp, a.ytdEi],
  ['biweekly', 2400, 134.79, 0, 39.12, 290, 1936.09, 52800, 2965.38, 860.64]);
const ra = C.check(a, R);
assert.equal(ra.ok, true, JSON.stringify(ra.rows));

// Sample 2: EI is too high by 6.48 and is flagged; net still adds up
const b = read('biweekly-ei-off.txt');
const rb = C.check(b, R);
assert.equal(rb.ok, false);
const eiRow = rb.rows.find((r) => r.label === 'EI');
assert.equal(eiRow.status, 'differs'); assert.equal(eiRow.diff, 6.48);
assert.equal(rb.rows.find((r) => r.label === 'Net pay').status, 'match');
assert.equal(rb.rows.find((r) => r.label === 'CPP').status, 'match');

// Sample 3: CPP reaches its cap, CPP2 starts, EI is done for the year
const c = read('monthly-cpp2.txt');
assert.equal(c.frequency, 'monthly');
const rc = C.check(c, R);
assert.equal(rc.ok, true, JSON.stringify(rc.rows));
assert.equal(rc.rows.find((r) => r.label === 'CPP2').expected, 216);

// Missing pieces
assert.equal(C.check({ frequency: null, gross: 1 }, R).ok, false);
assert.equal(C.check({ frequency: 'weekly', gross: null }, R).ok, false);
const nocpp2 = C.check({ frequency: 'weekly', gross: 1000, cpp: 55.5, ei: 16.3 }, R);
assert.equal(nocpp2.rows.find((r) => r.label === 'CPP2').status, 'skip');
assert.equal(nocpp2.rows.find((r) => r.label === 'CPP').expected, C.cents((1000 - 3500 / 52) * 0.0595));

// Over the yearly maximum is noted
const over = C.check({ frequency: 'monthly', gross: 8000, cpp: 0, ei: 0, ytdCpp: 4300, ytdEi: 1200, ytdGross: 90000 }, R);
assert.ok(over.notes.some((n) => n.includes('CPP is above')));
assert.ok(over.notes.some((n) => n.includes('EI is above')));

console.log('Stub Check tests passed.');
