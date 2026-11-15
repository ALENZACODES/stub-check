/* Stub Check: payroll math for one 2026 Ontario pay stub. Pure functions, no network. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StubChecker = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const cents = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  const num = (x) => (x === null || x === undefined || x === '' || isNaN(Number(x)) ? null : Number(x));

  function expectedCpp(gross, periods, ytdCppBefore, R) {
    const exemption = R.cpp.basicExemption / periods;
    let c = cents(Math.max(0, gross - exemption) * R.cpp.rate);
    if (ytdCppBefore !== null) c = Math.min(c, cents(Math.max(0, R.cpp.maxEmployee - ytdCppBefore)));
    return c;
  }

  function expectedCpp2(gross, ytdGrossBefore, R) {
    if (ytdGrossBefore === null) return null;
    const after = ytdGrossBefore + gross;
    const lo = Math.max(ytdGrossBefore, R.cpp.ympe);
    const hi = Math.min(after, R.cpp2.yampe);
    return cents(Math.max(0, hi - lo) * R.cpp2.rate);
  }

  function expectedEi(gross, ytdEiBefore, R) {
    let e = cents(gross * R.ei.rate);
    if (ytdEiBefore !== null) e = Math.min(e, cents(Math.max(0, R.ei.maxEmployee - ytdEiBefore)));
    return e;
  }

  // stub fields: frequency, gross, cpp, cpp2, ei, incomeTax, otherDeductions, net,
  // ytdGross, ytdCpp, ytdEi (year to date INCLUDING this pay, as most stubs print)
  function check(stub, R, tolerance) {
    const tol = tolerance === undefined ? 0.02 : tolerance;
    const periods = R.periods[stub.frequency];
    const rows = [];
    const notes = [];
    if (!periods) return { ok: false, rows, notes: ['Pick how often you are paid.'] };
    const gross = num(stub.gross);
    if (gross === null) return { ok: false, rows, notes: ['Gross pay is missing.'] };

    const cpp = num(stub.cpp), cpp2 = num(stub.cpp2), ei = num(stub.ei);
    const ytdGross = num(stub.ytdGross), ytdCpp = num(stub.ytdCpp), ytdEi = num(stub.ytdEi);
    const ytdGrossBefore = ytdGross === null ? null : cents(ytdGross - gross);
    const ytdCppBefore = ytdCpp === null || cpp === null ? null : cents(ytdCpp - cpp);
    const ytdEiBefore = ytdEi === null || ei === null ? null : cents(ytdEi - ei);

    const add = (label, shown, expected, why) => {
      if (expected === null) { rows.push({ label, shown, expected: null, diff: null, status: 'skip', why }); return; }
      if (shown === null) { rows.push({ label, shown, expected, diff: null, status: 'missing', why }); return; }
      const diff = cents(shown - expected);
      rows.push({ label, shown, expected, diff, status: Math.abs(diff) <= tol ? 'match' : 'differs', why });
    };

    add('CPP', cpp, expectedCpp(gross, periods, ytdCppBefore, R),
      `5.95% of gross above ${cents(R.cpp.basicExemption / periods).toFixed(2)} (the yearly 3,500 exemption split over ${periods} pays)`);
    const e2 = expectedCpp2(gross, ytdGrossBefore, R);
    if (e2 === null) add('CPP2', cpp2, null, 'Needs year to date gross to know if you passed 74,600');
    else if (e2 === 0 && (cpp2 === null || cpp2 === 0)) rows.push({ label: 'CPP2', shown: cpp2 === null ? 0 : cpp2, expected: 0, diff: 0, status: 'match', why: 'Only owed on earnings between 74,600 and 85,000 for the year' });
    else add('CPP2', cpp2 === null ? 0 : cpp2, e2, '4% of earnings between 74,600 and 85,000 for the year');
    add('EI', ei, expectedEi(gross, ytdEiBefore, R), '1.63% of gross, until 1,123.07 for the year');

    const ded = [cpp, cpp2, ei, num(stub.incomeTax), num(stub.otherDeductions)].reduce((s, v) => s + (v || 0), 0);
    const net = num(stub.net);
    if (net !== null) {
      const expectedNet = cents(gross - ded);
      const diff = cents(net - expectedNet);
      rows.push({ label: 'Net pay', shown: net, expected: expectedNet, diff, status: Math.abs(diff) <= tol ? 'match' : 'differs', why: 'Gross minus every deduction on the stub' });
    }
    if (ytdCpp !== null && ytdCpp > R.cpp.maxEmployee + tol) notes.push(`Year to date CPP is above the 2026 maximum of ${R.cpp.maxEmployee.toFixed(2)}.`);
    if (ytdEi !== null && ytdEi > R.ei.maxEmployee + tol) notes.push(`Year to date EI is above the 2026 maximum of ${R.ei.maxEmployee.toFixed(2)}.`);
    notes.push('Income tax is shown but not checked: it depends on your TD1 claim amounts.');
    const ok = rows.every((r) => r.status === 'match' || r.status === 'skip');
    return { ok, rows, notes };
  }

  return { check, expectedCpp, expectedCpp2, expectedEi, cents };
});
