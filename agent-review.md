# Tests from Playwright's agents, and my review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Date: 2026-11-20

## 1. How I set up the agents
- **Command:** `npx playwright init-agents --loop=claude` (TESTS terminal, in `P4`)
- **What it made:** `.claude/agents/playwright-test-planner.md`, `.claude/agents/playwright-test-generator.md`, `.claude/agents/playwright-test-healer.md`, `.mcp.json`, `specs/README.md`, `tests/seed.spec.ts`
- **Browser hidden:** `"--headless"` added to `P4/.mcp.json`: yes
- **Where I started Claude for the agents:** in `P4`, because Claude finds the agents and their browser only there

## 2. What I asked the agents
- **Area:** the profile page and following an author
- **My prompt** (`P4/prompts/agents.md`):
  - Task: First use the playwright-test-planner agent to plan tests for the profile page and following an author. Save the plan as specs/profile-follow.md. Then use the playwright-test-generator agent to write one test for each scenario in the plan, in the folder tests/profile-follow/.
  - Material: Start on the page /profile/practice-author. For steps that need a signed-in user, use a practice user from README.md.
  - Rules: Plan at most 2 short scenarios, with at most 5 steps each. Do not change any other test file. Do not run the test suite. Every test must verify the actual result of the user action, not just check that an element or success message is visible. Use the API to verify saved data wherever possible.
- **The plan the planner saved:** `specs/profile-follow.md` (2 scenarios: 1.1 Following an author is saved, 1.2 Unfollowing an author is saved)
- **The test files the generator wrote:** `tests/profile-follow/following-an-author-is-saved.spec.ts`, `tests/profile-follow/unfollowing-an-author-is-saved.spec.ts`
- `tests/seed.spec.ts` is the agents' start file. It checks nothing about the app, so it is not reviewed here.

## 3. My review of every generated test
- **The teammate's question:** "Claude says each test sets its own start state first. So we can keep this test in our suite as it is, right?" (about "Following an author is saved"; Claude said: "Each test leaves the reader in a different follow state. Each test sets its own start state first, so run order should not matter.")
- **My answer:** No. The test uses a shared practice user (practice-reader) and changes the follow state by following and unfollowing the author. Even though it resets the starting state, it can interfere with other tests that use the same account. We should create a new user through the API for each test and clean up the test data afterward to ensure test isolation and reliability.
- "Following an author is saved" · **changed**, because the test checks a useful user journey (following an author), but it uses a shared practice user. It should create a new user through the API for each test and verify the saved follow state through the API to avoid affecting other tests.
- "Unfollowing an author is saved" · **changed**, because the test covers a useful unfollow journey and verifies the saved follow state through the API. However, it uses the shared practice-reader account, which can interfere with other tests. It should create its own user through the API, use that user's token in the browser, and avoid relying on shared test data.

## 4. What I asked Claude to change, and the result
- **My change** (the Changes line of `P4/prompts/stronger.md`): In @P4/tests/profile-follow/following-an-author-is-saved.spec.ts: Changed. The test checks a useful user journey (following an author), but it uses a shared practice user. It should create a new user through the API for each test and verify the saved follow state through the API to avoid affecting other tests. In @P4/tests/profile-follow/unfollowing-an-author-is-saved.spec.ts: Changed. The test covers a useful unfollow journey and verifies the saved follow state through the API. However, it uses the shared practice-reader account, which can interfere with other tests. It should create its own user through the API, use that user's token in the browser, and avoid relying on shared test data.
- **Result:** No fault: 23 passed, 0 failed (second fault run, after the fix below)
- **Fix after a red No fault line:** "a comment with a blank or missing body is rejected and not saved" failed with no fault (Expected: 422, Received: 201). My decision: the app is wrong, the test is right. I typed: In @P4/tests/comments.spec.ts, mark the test that verifies an empty comment body is rejected with `test.fail()`. Add a one-line comment explaining that API.md says an empty comment body should return 422, but the app currently returns 201. Do not change the test assertions or any other code. Do not run the tests. The changed lines: `// API.md says an empty comment body should return 422, but the app currently returns 201.` and `test.fail();`
