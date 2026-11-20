# Profile page and following an author

## Application Overview

Conduit practice app, page /profile/practice-author. Signed in as practice-reader (practice-reader@example.com / Practice123, from README.md). Observed: signed out, the page shows the username heading, bio "I write about testing and quality.", 7 articles and no follow button. Signed in as practice-reader, a button "Unfollow practice-author" is shown on a fresh start, so the seed data already has reader following author. Do not assume the start state: set it through the API first. Verify saved data with GET /api/profiles/practice-author (Authorization: Token <token>, field profile.following) and GET /api/articles/feed.

## Test Scenarios

### 1. Profile follow

**Seed:** `tests/seed.spec.ts`

#### 1.1. Following an author is saved

**File:** `tests/profile-follow/follow.spec.ts`

**Steps:**
  1. Get a token for practice-reader with POST /api/users/login. Call DELETE /api/profiles/practice-author/follow so the start state is not following. Confirm GET /api/profiles/practice-author returns following=false.
    - expect: following is false before the test acts
  2. Sign in as practice-reader in the browser and open /profile/practice-author.
    - expect: Button 'Follow practice-author' is shown (ASSUMPTION: the label mirrors 'Unfollow practice-author' and is not seen on the page yet)
  3. Click the follow button.
    - expect: The button changes to 'Unfollow practice-author'
  4. Call GET /api/profiles/practice-author with the reader token.
    - expect: profile.following is true
    - expect: profile.username is practice-author
  5. Reload the page. Then call GET /api/articles/feed with the reader token.
    - expect: The button still reads 'Unfollow practice-author' after reload
    - expect: Every feed article has author.username practice-author, and the feed is not empty (ASSUMPTION: the reader follows nobody else)

#### 1.2. Unfollowing an author is saved

**File:** `tests/profile-follow/unfollow.spec.ts`

**Steps:**
  1. Get a reader token. Call POST /api/profiles/practice-author/follow. Confirm GET /api/profiles/practice-author returns following=true.
    - expect: following is true before the test acts
  2. Sign in as practice-reader and open /profile/practice-author.
    - expect: Button 'Unfollow practice-author' is shown
  3. Click the unfollow button.
    - expect: The button changes to 'Follow practice-author'
  4. Call GET /api/profiles/practice-author with the reader token.
    - expect: profile.following is false
  5. Reload the page. Then call GET /api/profiles/practice-author without a token.
    - expect: The button still reads 'Follow practice-author' after reload
    - expect: following is false for a request with no token
