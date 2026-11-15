/* Basic reader: pulls labelled amounts out of pasted stub text with patterns. Used when no model is set up, and as a cross check. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StubReader = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const money = '\\$?\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{2})|[0-9]+(?:\\.[0-9]{2})?)';
  const LABELS = {
    gross: ['gross pay', 'total earnings', 'gross earnings', 'gross'],
    cpp: ['cpp contributions', 'cpp contribution', 'canada pension plan', 'cpp'],
    cpp2: ['cpp2', 'second additional cpp'],
    ei: ['ei premium', 'employment insurance', 'ei'],
    incomeTax: ['federal and provincial tax', 'income tax', 'tax deducted', 'fed tax', 'tax'],
    net: ['net pay', 'net amount', 'take home', 'net']
  };
  const parse = (s) => Number(s.replace(/,/g, ''));

  function lineValues(line) {
    const out = [];
    const re = new RegExp(money, 'g');
    let m;
    while ((m = re.exec(line))) out.push(parse(m[1]));
    return out;
  }

  function read(text) {
    const lines = String(text || '').split(/\r?\n/);
    const r = { frequency: null, gross: null, cpp: null, cpp2: null, ei: null, incomeTax: null, otherDeductions: null, net: null, ytdGross: null, ytdCpp: null, ytdEi: null };
    const lower = text.toLowerCase();
    if (/bi-?weekly|every two weeks|every 2 weeks/.test(lower)) r.frequency = 'biweekly';
    else if (/semi-?monthly|twice a month/.test(lower)) r.frequency = 'semimonthly';
    else if (/\bweekly\b/.test(lower)) r.frequency = 'weekly';
    else if (/\bmonthly\b/.test(lower)) r.frequency = 'monthly';
    const used = new Set();
    for (const key of ['cpp2', 'gross', 'cpp', 'ei', 'incomeTax', 'net']) {
      for (const label of LABELS[key]) {
        const re = new RegExp('(^|[^a-z0-9])' + label.replace(/ /g, '\\s+') + '(?![a-z0-9])', 'i');
        const after = (l) => { const m = re.exec(l); return m ? l.slice(m.index + m[0].length) : ''; };
        const idx = lines.findIndex((l, i) => !used.has(i) && re.test(l) && lineValues(after(l)).length);
        if (idx >= 0) {
          const v = lineValues(after(lines[idx]));
          r[key] = v[0];
          if (v.length > 1) r['ytd' + key.charAt(0).toUpperCase() + key.slice(1)] = v[v.length - 1];
          used.add(idx);
          break;
        }
      }
    }
    if (r.cpp2 === null) r.cpp2 = 0;
    const keep = { frequency: r.frequency, gross: r.gross, cpp: r.cpp, cpp2: r.cpp2, ei: r.ei, incomeTax: r.incomeTax, otherDeductions: null, net: r.net, ytdGross: r.ytdGross || null, ytdCpp: r.ytdCpp || null, ytdEi: r.ytdEi || null };
    return keep;
  }
  return { read };
});
