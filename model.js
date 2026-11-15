// Firebase AI Logic hybrid reader: Gemini Nano in Chrome when present, cloud Gemini otherwise.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app-check.js';
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, Schema } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-ai.js';

const FIELDS = ['gross', 'cpp', 'cpp2', 'ei', 'incomeTax', 'otherDeductions', 'net', 'ytdGross', 'ytdCpp', 'ytdEi'];

export const stubSchema = Schema.object({
  properties: {
    frequency: Schema.enumString({ enum: ['weekly', 'biweekly', 'semimonthly', 'monthly'] }),
    ...Object.fromEntries(FIELDS.map((f) => [f, Schema.number()]))
  },
  optionalProperties: ['frequency', ...FIELDS.filter((f) => f !== 'gross')]
});

export const PROMPT = [
  'Read this Canadian pay stub and return its amounts as JSON.',
  'Use plain numbers with no dollar signs or commas.',
  'gross, cpp, cpp2, ei, incomeTax and net are for this pay period only.',
  'otherDeductions is the total of any other deductions for this pay period, such as union dues or benefits.',
  'ytdGross, ytdCpp and ytdEi are the year to date totals printed on the stub.',
  'frequency is how often the person is paid: weekly, biweekly, semimonthly or monthly.',
  'Leave out any value that is not printed. Do not calculate missing values.'
].join(' ');

let app = null;
const models = {};

export function setup(firebaseConfig, recaptchaSiteKey) {
  if (app) return;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  app = initializeApp(firebaseConfig);
  if (recaptchaSiteKey) initializeAppCheck(app, { provider: new ReCaptchaV3Provider(recaptchaSiteKey), isTokenAutoRefreshEnabled: true });
}

function modelFor(mode) {
  if (models[mode]) return models[mode];
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  models[mode] = getGenerativeModel(ai, {
    mode: mode === 'device-only' ? InferenceMode.ONLY_ON_DEVICE : InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: { generationConfig: { responseMimeType: 'application/json', responseSchema: stubSchema, temperature: 0 } },
    onDeviceParams: {
      createOptions: { expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }], expectedOutputs: [{ type: 'text', languages: ['en'] }] },
      promptOptions: { responseConstraint: stubSchema }
    }
  });
  return models[mode];
}

// Must be called from a click.
export function warmUp(mode, onProgress) {
  const m = modelFor(mode);
  return m.initializeDeviceModel((v) => onProgress && onProgress(v));
}

async function fileToPart(file) {
  const data = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  return { inlineData: { data, mimeType: file.type } };
}

export async function readStub({ text, file, mode }) {
  const m = modelFor(mode);
  const parts = [PROMPT];
  if (file) parts.push(await fileToPart(file));
  if (text) parts.push('Pay stub text:\n' + text);
  const result = await m.generateContent(parts);
  const raw = result.response.text();
  const json = JSON.parse(raw.replace(/^```(json)?|```$/g, '').trim());
  return { stub: json, source: result.response.inferenceSource || 'IN_CLOUD' };
}
