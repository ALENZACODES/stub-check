## Inspiration
A pay stub is one of the most private documents a person owns, and almost nobody checks it. Mistakes are common enough: the wrong pay frequency in the payroll system, CPP still deducted after the yearly maximum, EI at last year's rate. Checking by hand means knowing three rates, two yearly ceilings and how the 3,500 exemption is split across pay periods. I wanted a checker that reads the stub for you without asking you to upload it anywhere.

## What it does
Paste the text of a 2026 pay stub or add a photo or screenshot. Stub Check reads the amounts into editable boxes, then checks CPP, CPP2 and EI against the CRA 2026 rates and confirms that net pay adds up from the lines on the stub. Each line shows what the stub says, what the rates give, the difference and the rule used, so you know exactly what to ask payroll about. Three made up sample stubs show a correct stub, an EI deduction that is 6.48 too high, and a monthly stub where CPP reaches its yearly cap, CPP2 starts and EI is done for the year.

## How I used Firebase AI Logic
The reader is a Firebase AI Logic `GenerativeModel` in hybrid mode. By default it uses `PREFER_ON_DEVICE`, so Chrome's Gemini Nano reads the stub on the device when it is available and the cloud Gemini model reads it when it is not. A "device only" switch uses `ONLY_ON_DEVICE` for people who never want the stub to leave their computer. Both paths get the same JSON schema, built with the SDK's `Schema` helpers: `responseConstraint` on device and `responseSchema` in the cloud, so the checker always receives the same fields. Photos go in as inline PNG or JPEG parts, which the on device model supports. `initializeDeviceModel` runs on the button click and shows download progress, and the page reports which path did the reading from `response.inferenceSource`. App Check protects the API with reCAPTCHA v3.

## How I built it
Plain HTML, CSS and JavaScript on GitHub Pages, with the Firebase JS SDK 13.3.0 loaded as modules. The payroll math is a small pure module with its own tests. For pasted text a simple pattern reader reads the stub as well, and the page flags any field where it disagrees with the model, so a misread number is caught before it becomes a false alarm. Without a Firebase config the page falls back to that pattern reader so anyone can try the checker.

## Challenges I ran into
Getting the yearly caps right. A stub prints year to date totals that already include this pay, so the checker works back to the totals before this pay to know how much CPP and EI room was left and whether earnings crossed 74,600, where CPP2 starts. The other challenge was trust: a reader that silently gets one number wrong would make the whole check wrong, so every value stays editable and the two readers are compared.

## Accomplishments that I'm proud of
Every rate and limit matches the CRA 2026 tables, and the tests also confirm each published maximum follows from its rate (71,100 times 5.95% is 4,230.45; 10,400 times 4% is 416; 68,900 times 1.63% is 1,123.07). The sample stubs check out to the cent, and a wrong EI line is caught with the exact difference.

## What I learned
Hybrid inference changes the privacy conversation. Being able to say "this stays on your device" and prove it with a switch matters more for a pay stub than raw accuracy, and structured output on both paths makes the rest of the app simple.

## What's next
Quebec rates (QPP and the lower EI rate), more than one employer, and a printable note to hand to payroll listing the lines that differ.

## Built during the event
Stub Check was started and built during #BuildHybridAI, from November 14, 2026. No earlier code was reused. Third party pieces: the Firebase JS SDK and the CRA rate tables.
