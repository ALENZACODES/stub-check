# Stub Check

Check the CPP, CPP2, EI and net pay on a 2026 Ontario pay stub. Paste the stub text or add a photo. Stub Check reads the amounts with Firebase AI Logic hybrid inference (Gemini Nano in Chrome on your device when it is available, cloud Gemini when it is not), lets you correct them, then checks each line against the CRA 2026 payroll rates.

Live: https://alenzacodes.github.io/stub-check/

Built by John Khan in Toronto, Ontario for #BuildHybridAI 2026.

## Why

A pay stub is one of the most private documents a person has, and most people never check it. Payroll mistakes do happen: the wrong pay frequency, CPP still taken after the yearly maximum, EI at an old rate. Checking means knowing three rates, two ceilings and the exemption split. Stub Check does that in seconds, and the device only mode means the stub never leaves Chrome.

## How it works

1. **Read.** `model.js` creates a Firebase AI Logic `GenerativeModel` in `PREFER_ON_DEVICE` or `ONLY_ON_DEVICE` mode, with the same JSON schema given to both paths (`responseConstraint` on device, `responseSchema` in the cloud). Text and PNG or JPEG photos are supported. The page shows which path read the stub, from `response.inferenceSource`.
2. **Cross check.** For pasted text, a small pattern reader (`reader.js`) reads the stub too, and the page flags any box where the two disagree.
3. **Check.** `checker.js` computes the expected CPP, CPP2 and EI for the pay period from the 2026 rates in `data/rates-2026.json`, using the year to date lines for the yearly caps, and checks that net pay adds up.
4. **Explain.** Each line shows the stub value, the expected value, the difference and the rule used.

Without a Firebase config the page still works with the basic reader for pasted text, so judges can try the checker at once.

## 2026 rates used (CRA, checked Nov 14, 2026)

| | Rate | Limits |
|---|---|---|
| CPP | 5.95% | 3,500 yearly exemption, earnings up to 74,600, maximum 4,230.45 |
| CPP2 | 4% | earnings from 74,600 to 85,000, maximum 416.00 |
| EI (outside Quebec) | 1.63% | insurable earnings up to 68,900, maximum 1,123.07 |

Sources: [CPP](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp/cpp-contribution-rates-maximums-exemptions.html), [CPP2](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/calculating-deductions/making-deductions/second-additional-cpp-contribution-rates-maximums.html), [EI](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html). The tests also check that each published maximum follows from its rate.

## Tests

```
node tests/test_checker.mjs
```

GitHub Actions runs them on every push. They cover the rates, per pay math, yearly caps, CPP2 start, EI end of year, the three sample stubs and missing values.

## Turn on the model

1. Create a Firebase project (no billing needed) and, under AI Services, AI Logic, click Get started and pick the Gemini Developer API.
2. Register a web app and paste its config into `config.js` as `firebaseConfig`.
3. Create a reCAPTCHA v3 key for `alenzacodes.github.io`, register it in App Check for the web app, and paste the site key into `config.js` as `recaptchaSiteKey`. For localhost, the page turns on the App Check debug token; register that token in the console.
4. For on device reading in Chrome 139 or later on desktop, enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` and restart.

## Run locally

```
python3 -m http.server 8080
```

Open http://localhost:8080/.

## Limits

Canada outside Quebec, one employer, 2026 only. Income tax is not checked because it depends on TD1 claims. Taxable benefits, bonuses taxed separately and pay periods spanning two years are not handled. The sample stubs are made up.

## License

Apache License 2.0. See `LICENSE`.
