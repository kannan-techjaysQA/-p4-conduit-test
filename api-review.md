# API review: Claude's first API tests (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you decided and what you saw.

- **App:** Conduit, the practice app on your own laptop (`http://127.0.0.1:3000`)
- **API description:** `P4/API.md`
- **Test file:** `P4/tests/api.spec.ts`, written by Claude
- **Prompt file:** `P4/prompts/api.md`

## 1. My first look, by hand
The request my comment sent in the app, and the status that came back.
- Request Method: POST
- Status Code: 201 (Created)

## 2. My predictions and the real answers
One line per request: what I predicted, and what the app really answered.
- **A** (a comment, with the token): I predicted 201 Created — Response body contains the new comment with its ID and body ("Clear and useful."). The app answered 201, `{"comment":{"id":5,...,"body":"Clear and useful.","author":{"username":"practice-reader",...}}}`
- **B** (the same comment, with no token): I predicted 401 Unauthorized — errors: token is missing. The app answered 401, `{"errors":{"token":["is missing"]}}`
- **C** (a comment on an article that does not exist): I predicted 404 Not Found — errors: article not found. The app answered 404, `{"errors":{"article":["not found"]}}`
- **The answer that surprised me most:** B surprised me most because the request had no Authorization token, so the API returned 401 Unauthorized instead of creating the comment. This confirms that authentication is required for the POST comments endpoint.

## 3. My prompt to Claude
```text
Task: Write at least 6 Playwright API tests for articles in the Conduit API: create, read, change and delete an article. At least 3 positive and at least 3 negative tests. Save them in P4/tests/api.spec.ts. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. Check both the response status code and response body, including the actual article data, not just whether the request succeeds.
```

## 4. The run
- **Result:** 9 tests: 8 passed, 1 failed.
- **A red test, and who is wrong** (only if a test failed):
  - **Test:** "the author changes the title and body, and the description stays as it was" (line 92)
  - **Expected and Received** (line 107): Expected `["testing", "api"]`, Received `[]`
  - **What API.md says:** "Updating: every field is optional. A field you do not send stays as it was."
  - **My answer:** The app is wrong. According to API.md, fields not included in the update request must retain their previous values. Since tagList was not sent, the existing tags should remain ["testing", "api"], not become an empty array. Keep the test and report this as a bug.
- **My note** (only if I kept a red test with `test.fail()`): The app removes existing tags when updating the article title and body, but API.md says the tags must remain unchanged.

## 5. The developer's question
The test I looked at, and my answer to: "So the app saved nothing, right?"
- **Test:** "create without a title gives 422 "title can't be blank"" (from another run, lines 128–138)
- **My answer:** No. The 422 status and error message confirm that the API rejected the request, but they don't prove that no article was saved. We need an additional check to verify that the article was not created.

## 6. Tests I reviewed with the API checklist
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.

### "a signed-in user creates an article and gets it back with the sent data"
- **My decision:** Keep, because it checks the exact status, response body values, data structure, timestamps, author details and default values. It also creates its own user and uses unique article data, so the test is independent.

## 7. My API rules
The rules I added to my `playwright-quality` skill, under `## API rules`:
1. Check the exact status code and response body values against API.md, not just whether the request succeeds.
2. After every request that changes data or is rejected, use a GET request to verify the actual data.
3. Each test must create its own user and test data with unique values so it can run independently in any order.
