# My CI workflow and review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

Repository: the P4 folder · Workflow: `.github/workflows/playwright.yml` · Date: 2026-11-23

## 1. What my project needs
- **Node.js on my laptop (`node -v`):** v24.19.0
- **My whole suite on my laptop:** `npx playwright test` → 23 passed, 0 failed
- **What the GitHub computer needs (my words):**
  - Node.js: The GitHub computer must use Node.js 24, because our project requires Node.js >=22.13, and we verified that the tests passed locally using Node.js v24.19.0.
  - Packages: npm ci – It installs the exact dependency versions from package-lock.json, ensuring the GitHub environment matches our local setup
  - Browser: Chromium only (from the example)

## 2. My prompt to Claude
```text
Task: Write a GitHub Actions workflow that runs this Playwright suite on every push and keeps the HTML report. My GitHub repository is the P4 folder, so save it as P4/.github/workflows/playwright.yml. After the file, write one line for each step: what it does.
Material: @P4/package.json @P4/playwright.config.ts @P4/README.md
Rules: Use actions/checkout@v6, actions/setup-node@v6 and actions/upload-artifact@v6. Do not run anything. Do not commit or push. Use Node.js 24, install dependencies using npm ci from package-lock.json, and install only the Chromium browser required by my Playwright configuration
```

## 3. What Claude's workflow got wrong for my project
- **Claude's workflow:** my rule asked for Node.js 24, so my workflow already had `node-version: 24`. The line I judged came from another run: `node-version: 22`.
- **Claude said:** (in that other run) "ASSUMPTION: `node-version: 22` gets the newest Node 22, which is 22.13 or later. You could use 24 instead. Nothing in the material asks for a specific version."
- **My project needs:** Node.js 24 · `npm ci` · Chromium only
- **My answer to the developer:** "No, I wouldn't merge it yet. Our project was tested successfully with Node.js 24 (v24.19.0), and all 23 tests passed. Although package.json allows Node.js versions >=22.13, that doesn't prove our suite works on Node.js 22. We should use Node.js 24 in the GitHub workflow to match our verified environment."
- **My line to Claude:** In @P4/.github/workflows/playwright.yml, add a comment above line 15 that says why it is Node.js 24: my suite is green on Node.js 24 on my laptop. Change nothing else. Do not run anything.

## 4. My reading of the workflow
- **When, where, the code and Node.js (lines 1–16):**
  - name: Playwright tests – Sets the workflow name displayed in GitHub.
  - on: push – Triggers the workflow whenever code is pushed to the repository.
  - jobs: – Defines the tasks GitHub needs to execute.
  - test: – Names the job.
  - runs-on: ubuntu-latest – Runs the job on a fresh Ubuntu Linux computer.
  - steps: – Lists the actions to perform.
  - actions/checkout@v6 – Copies the repository code onto the GitHub computer.
  - actions/setup-node@v6 – Sets up Node.js.
  - node-version: 24 – Installs Node.js version 24 for running the Playwright tests.
- **Packages, browser, tests and the report (lines 17–33):**
  1. cache: npm – Caches npm packages to make future workflow runs faster.
  2. npm ci – Installs the exact dependency versions from package-lock.json.
  3. npx playwright install --with-deps chromium – Installs Chromium and its required system dependencies.
  4. npx playwright test – Executes the Playwright test suite on GitHub.
  5. if: ${{ !cancelled() }} – Ensures the report upload step runs even if tests fail, as long as the workflow hasn't been cancelled.
  6. actions/upload-artifact@v6 – Uploads and saves the HTML test report as a GitHub artifact.
  7. name: playwright-report – Sets the artifact name.
  8. path: playwright-report/ – Specifies the folder containing the report to upload.

## 5. The first run on GitHub
- **Run:** Add the CI workflow · **Result:** … · **Tests:** …
- **The report (artifact):** …

## 6. A red run on purpose
- **The change:** `tests/example.spec.ts` line 6, `toBe(200)` → `toBe(201)`
- **My prediction:** …
- **What GitHub showed:** …

## 7. Fixed, and green again
- **The fix:** line 6 back to `toBe(200)` · **Run:** Fix the expected status · **Result:** …

## 8. Review notes for my other AI-written tests (written while CI ran)
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.
Monday's and Tuesday's tests that I did not review in depth on those days. Each one: kept, changed or removed, and why.

### Monday: `tests/api.spec.ts`
- "…": **kept / changed / removed**, because …

### Tuesday: `tests/contract.spec.ts`
- "…": **kept / changed / removed**, because …
