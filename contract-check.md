# My schema, auth and contract checks (week 4, project P4)

App: Conduit practice app on my laptop · Date: 2026-11-17

## 1. My first look
How I would check that an article answer has the right shape: Check that the response contains the article object and all required fields listed in API.md, such as slug, title, description, body, tagList, createdAt, updatedAt, favorited, favoritesCount, and author. Also verify their data types.

## 2. Practice: the key list check
File: `P4/materials/contract-example.spec.ts` (the sign-up answer).
Three changes: `bio` is missing · a new field `password` is added · `token` becomes a number.
- **The toMatchObject check (worked example):** missing: passes · new field: passes · number: fails
- **The key list check (my answer):** Missing bio: Fails. · New field password: Fails. · Token is a number: Passes.

## 3. My prompt for Claude
```text
Task: Write Playwright API tests in P4/tests/contract.spec.ts. Schema checks: the answers of GET /api/articles/:slug and GET /api/user have the shape that API.md gives, checked with toMatchObject and expect.any. Auth tests: no token, a wrong token, and changing someone else's article. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. Check both the required field names and their data types against API.md, and verify that authentication failures return the correct status code and error message.
```

## 4. Claude's tests and my run
- **Run:** `npx playwright test tests/contract.spec.ts` · **Result:** 5 passed, 0 failed
- **A red test, and who was wrong:** No test failed.

## 5. The teammate's question
- **Claude's test:** "GET /api/articles/:slug answers with the Article shape" (checked with `toMatchObject` and `expect.any` only)
- **Claude said:** "checks that the answer is 200 and has every Article field from API.md with the right type."
- **My answer:** No. toMatchObject checks only the fields listed in the assertion. An extra field like password will not make the test fail. We need an exact key-list check using Object.keys() to detect unexpected fields.

## 6. My change
- **What I asked Claude:** "In @P4/tests/contract.spec.ts, the Article shape test allows unexpected fields like password because it uses toMatchObject. Add an exact key-list check using the Article keys from P4/API.md. Do not run the tests."
- **The run after it:** 5 passed, 0 failed

## 7. Proof: the contract test fails when the answer changes
- **My prediction before the run:** The first test will fail: schema › GET /api/articles/:slug answers with the Article shape. Why: F2 removes one field from the article response. The new exact key-list check expects all the fields defined in P4/API.md. Since one field is missing, the actual keys won't match the expected keys, so the contract test will fail. The other four tests should pass because F2 only affects the article response.
- **Run with the practice fault F2 on:** `$env:CONDUIT_FAULT = "F2"`, then `npx playwright test tests/contract.spec.ts` · **Result:** 4 passed, 1 failed (schema › GET /api/articles/:slug answers with the Article shape)
- **What Playwright showed:** at the key list (line 39): `- Expected  - 1` / `+ Received  + 0`, with the line `-   "body",`
- **My answer about a red test:** The fault removed the body field. I can see this because "body" appears in the Expected list with a minus sign (-), but it is missing from the Received list.
- **Run with the fault off again:** `$env:CONDUIT_FAULT = ""`, then the same run · **Result:** 5 passed, 0 failed
