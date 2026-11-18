# My end-to-end tests and review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you found and decided.

App: Conduit practice app · Test file: `P4/tests/e2e.spec.ts` · Date: 2026-11-18

## 1. My first look
- **After I published an article by hand, I would check:** It shows added article in the home
- **Where the page keeps my sign-in:** jwtToken key

## 2. Practice
- **Worked example (the like test):** it signs in through the form as a practice user, so other tests can change its data.
- **Does its check at the end prove the journey?** No. Line 19 does not prove that the like worked. It only checks whether the article heading is visible. The heading would be visible even if the Favorite Article button click failed. Better approach: Verify through the API that favorited is true and favoritesCount is 1 after clicking the Favorite Article button.

## 3. My prompt
```text
Task: Write 2 end-to-end tests in P4/tests/e2e.spec.ts. Test 1: a signed-in user publishes a new article in the editor. Test 2: a signed-in user posts a comment on an article. Make a new user with the API, give the page its token, do the journey in the page, and check the result with the API at the end. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/app/public/app.js app.js is the page's code: take the labels and button names from it. The page keeps the sign-in token in localStorage, key jwtToken.
Rules: Use app.js only for the labels and button names. Do not change the app. Do not run the tests. At the end of each test, verify the saved result using the API: for the publish test, check that the article title and body are saved; for the comment test, check that the comment text is saved correctly.
```

## 4. The run
- **Claude's 2 tests:** 2 passed, 0 failed.

## 5. The teammate's question
- **Claude said:** "Each test makes a new user with `POST /api/users`, so every run has fresh data." At the end: "The tests do not clean up. Each run leaves behind 1 user and 1 article per test, plus 1 comment. You decide what to do about that."
- **My answer:** No. The tests passing only means the expected checks succeeded. They do not automatically clean up the test data. Each run leaves behind new users, articles, and comments in the app. We need to implement cleanup through the API or use a separate test environment to avoid accumulating test data.

## 6. What I saw on the home page
- E2E comment target 1794984825996-34658

## 7. My change
- **My line to Claude:** In P4/tests/e2e.spec.ts, the tests leave behind users, articles, and comments. Clean up the test data using the API in test.afterEach, so cleanup runs even when a check fails. Do not run the tests.
- **The clean-up Claude added:** test.afterEach deletes the comments and articles each test's user made, and expects 204 for each delete. The users stay: API.md has no request to delete a user.

## 8. Proof
- **Each test twice, on an app that keeps its data:** `npx playwright test tests/e2e.spec.ts --repeat-each=2` → 4 passed, 0 failed
- **The newest article on the home page after the run:** Your first end-to-end test
