# My practice fault report (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Practice faults: `P4/faults/practice.json` (F1 to F6) · Date: 2026-11-20
**How to read it:** a "detect" fault is **caught** when at least one test that passed with no fault fails with it, and **missed** when every test still passes. A "robust" fault (the app is only slower) should **stay green**; if tests fail, it **went red**.

## 1. My guess this morning
- **The developer asked:** "Your suite is green. How many real problems would it catch?"
- **My answer:** A green test suite doesn't necessarily mean it catches real problems. We need to measure its effectiveness by introducing intentional bugs or breaking changes and checking how many tests fail. This is mutation testing. It helps us identify gaps in our test coverage and improve the test suite

## 2. Before: my suite against the practice faults
- **Command:** `node materials/faults-run.mjs` (TESTS terminal, in `P4`, with no app running)
- **My test files:** `api.spec.ts`, `contract.spec.ts`, `e2e.spec.ts`, `example.spec.ts`, `profile-follow/following-an-author-is-saved.spec.ts`, `profile-follow/unfollowing-an-author-is-saved.spec.ts`, `seed.spec.ts`
- **No fault:** 20 passed, 0 failed
- **F1** Opening an article gives a server error (500): caught (9 tests failed)
- **F2** The article answer has no body text: caught (4 tests failed)
- **F3** The article answer has a different title: caught (5 tests failed)
- **F4** The comments list is always empty: caught (1 test failed: e2e.spec.ts › a signed-in user posts a comment on an article)
- **F5** The article answer comes 3 seconds late: stayed green (0 tests failed)
- **F6** Posting a comment is refused (422) and nothing is saved: caught (1 test failed: e2e.spec.ts › a signed-in user posts a comment on an article)

## 3. The weak spot I chose, and why
My suite is weakest in comment testing because F4 and F6 were caught by only one test. A good suite should reliably catch both an empty comments list and a failed comment submission (422), with proper API verification.

## 4. How I made the suite stronger
- **My request for Claude** (the New tests line of `P4/prompts/stronger.md`): Add more tests for the comments functionality in P4/tests/comments.spec.ts. Include API tests to verify that a new user can post a comment successfully, the comment text is saved correctly, and a GET request returns the saved comment. Also verify that an unsuccessful comment submission does not save any comment. Ensure the tests use independent test data and do not rely on shared practice users.
- **New or changed test file:** `tests/comments.spec.ts` (new, 3 API tests); `tests/profile-follow/following-an-author-is-saved.spec.ts` and `tests/profile-follow/unfollowing-an-author-is-saved.spec.ts` (changed)
- **Red No fault line first:** "a comment with a blank or missing body is rejected and not saved" failed with no fault (Expected: 422, Received: 201). My decision: the app is wrong, because API.md says the comment body is required. Marked with `test.fail()` and a comment, and to be reported to the developer.

## 5. After: the run again
- **Command:** `node materials/faults-run.mjs F4 F6`
- **No fault:** 23 passed, 0 failed
- **The fault I chose:** F4 The comments list is always empty: caught (3 tests failed, before 1) · F6 Posting a comment is refused (422) and nothing is saved: caught (3 tests failed, before 1)

## 6. What changed
The additional API tests improved our test coverage. Earlier, F4 and F6 were caught by only one E2E test. Now, both faults are caught by three tests, including two API tests.

This makes our comment testing stronger and reduces the risk of missing issues if one test fails or is removed. The suite is green with no faults, so the improvements are working as expected.
