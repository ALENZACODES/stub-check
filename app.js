import { firebaseConfig, recaptchaSiteKey } from './config.js';

const $ = (s) => document.querySelector(s);
const FIELDS = ['frequency', 'gross', 'cpp', 'cpp2', 'ei', 'incomeTax', 'otherDeductions', 'net', 'ytdGross', 'ytdCpp', 'ytdEi'];
const SOURCE = { ON_DEVICE: 'Read on this device by Gemini Nano in Chrome.', IN_CLOUD: 'Read in the cloud by Gemini, because this device could not.', BASIC: 'Read by the basic reader on this page (no model).' };
let rates = null;
let model = null;
const modelReady = !!firebaseConfig;

if (!modelReady) {
  $('input[value="basic"]').checked = true;
  for (const v of ['device-first', 'device-only']) {
    const r = $(`input[value="${v}"]`); r.disabled = true;
    r.parentElement.append(' (needs the Firebase project, see README)');
  }
}

const fmt = (v) => (v === null || v === undefined ? 'not shown' : Number(v).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

function fillForm(stub) {
  const f = $('#fields');
  for (const k of FIELDS) f.elements[k].value = stub[k] === null || stub[k] === undefined ? '' : stub[k];
}
function readForm() {
  const f = $('#fields'); const s = {};
  for (const k of FIELDS) { const v = f.elements[k].value.trim().replace(/[$,\s]/g, ''); s[k] = k === 'frequency' ? (v || null) : (v === '' ? null : Number(v)); }
  return s;
}

function render() {
  if (!rates) return;
  const res = StubChecker.check(readForm(), rates);
  const tb = $('#results tbody'); tb.innerHTML = '';
  for (const r of res.rows) {
    const tr = document.createElement('tr'); tr.className = r.status;
    const word = { match: 'matches', differs: 'differs', missing: 'not on stub', skip: 'not checked' }[r.status];
    const diff = r.diff === null ? word : `${r.diff > 0 ? '+' : ''}${fmt(r.diff)} (${word})`;
    tr.innerHTML = `<th scope="row">${r.label}</th><td class="num">${fmt(r.shown)}</td><td class="num">${r.expected === null ? 'not checked' : fmt(r.expected)}</td><td class="num">${diff}</td><td>${r.why}</td>`;
    tb.append(tr);
  }
  const v = $('#verdict');
  const bad = res.rows.filter((r) => r.status === 'differs');
  if (!res.rows.length) { v.className = 'verdict'; v.textContent = res.notes[0] || ''; }
  else if (bad.length) {
    v.className = 'verdict bad';
    const rateRows = bad.filter((r) => r.label !== 'Net pay').map((r) => r.label);
    const parts = [];
    if (rateRows.length) parts.push(`${rateRows.join(', ')} ${rateRows.length > 1 ? 'do' : 'does'} not match the 2026 rates.`);
    if (bad.some((r) => r.label === 'Net pay')) parts.push('Net pay does not add up from the lines on the stub.');
    v.textContent = parts.join(' ') + ' Worth asking payroll.';
  }
  else { v.className = 'verdict good'; v.textContent = 'Every line that can be checked matches the 2026 rates.'; }
  $('#notes').innerHTML = res.notes.map((n) => `<li>${n}</li>`).join('');
}

function compareWithBasic(stub, text) {
  if (!text) { $('#disagree').textContent = ''; return; }
  const b = StubReader.read(text);
  const off = FIELDS.filter((k) => b[k] !== null && stub[k] !== undefined && stub[k] !== null && String(b[k]) !== String(stub[k]));
  $('#disagree').textContent = off.length ? `The basic reader saw different values for: ${off.join(', ')}. Check those boxes against your stub.` : '';
}

async function go() {
  const text = $('#stubText').value.trim();
  const file = $('#stubImage').files[0] || null;
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const status = $('#status');
  if (!text && !file) { status.textContent = 'Paste the stub text or choose a photo first.'; return; }
  try {
    if (mode === 'basic') {
      if (!text) { status.textContent = 'The basic reader needs pasted text. Use a device mode for photos.'; return; }
      const stub = StubReader.read(text); fillForm(stub); $('#source').textContent = SOURCE.BASIC; $('#disagree').textContent = '';
    } else {
      if (!model) { model = await import('./model.js'); model.setup(firebaseConfig, recaptchaSiteKey); }
      status.textContent = 'Getting the on-device model ready...';
      const warm = model.warmUp(mode, (p) => { status.textContent = `Downloading the on-device model: ${Math.round(p * 100)}%`; });
      if (mode === 'device-only') await warm;
      status.textContent = 'Reading the stub...';
      const { stub, source } = await model.readStub({ text, file, mode });
      fillForm(stub); $('#source').textContent = SOURCE[source] || SOURCE.IN_CLOUD; compareWithBasic(stub, text);
    }
    status.textContent = 'Done. Edit any box to recheck.';
    render();
    $('#r-h').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    status.textContent = (mode === 'device-only' ? 'This device could not read the stub on its own. Try "on this device first" or the basic reader. ' : 'Could not read the stub. ') + (e && e.message ? `(${e.message})` : '');
  }
}

document.querySelectorAll('[data-sample]').forEach((b) => b.addEventListener('click', async () => {
  const t = await (await fetch('samples/' + b.dataset.sample)).text();
  $('#stubText').value = t; $('#stubImage').value = '';
  $('#status').textContent = 'Sample loaded. Press Read and check.';
}));
$('#readBtn').addEventListener('click', go);
$('#fields').addEventListener('input', render);
fetch('data/rates-2026.json').then((r) => r.json()).then((r) => { rates = r; render(); });
