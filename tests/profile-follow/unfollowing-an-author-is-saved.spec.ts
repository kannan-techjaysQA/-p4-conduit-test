// spec: specs/profile-follow.md
// seed: tests/seed.spec.ts

import { test, expect, APIRequestContext, Page } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';

const unique = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

async function createUser(request: APIRequestContext, role: string) {
  const id = unique();
  const response = await request.post(`${BASE_URL}/api/users`, {
    data: {
      user: {
        username: `unfollow-${role}-${id}`,
        email: `unfollow-${role}-${id}@example.com`,
        password: 'password123',
      },
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).user as { username: string; token: string };
}

async function signInPage(page: Page, token: string) {
  await page.addInitScript((t) => localStorage.setItem('jwtToken', t), token);
}

test.describe('Profile follow', () => {
  test('Unfollowing an author is saved', async ({ page, request }) => {
    // 1. API: make a new reader and a new author; the reader follows, confirm following=true
    const reader = await createUser(request, 'reader');
    const author = await createUser(request, 'author');
    const authHeaders = { Authorization: `Token ${reader.token}` };
    const profileUrl = `${BASE_URL}/api/profiles/${encodeURIComponent(author.username)}`;

    const followResponse = await request.post(`${profileUrl}/follow`, {
      headers: authHeaders,
    });
    expect(followResponse.status()).toBe(200);

    const before = await request.get(profileUrl, { headers: authHeaders });
    expect(before.status()).toBe(200);
    expect((await before.json()).profile.following).toBe(true);

    // 2. Sign in the browser with the reader's token and open the author profile
    await signInPage(page, reader.token);
    await page.goto(`${BASE_URL}/profile/${encodeURIComponent(author.username)}`);
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: `Unfollow ${author.username}`, exact: true }),
    ).toBeVisible();

    // 3. Click unfollow
    await page
      .getByRole('button', { name: `Unfollow ${author.username}`, exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: `Follow ${author.username}`, exact: true }),
    ).toBeVisible();

    // 4. API: the unfollow is saved
    const after = await request.get(profileUrl, { headers: authHeaders });
    expect(after.status()).toBe(200);
    const afterBody = await after.json();
    expect(afterBody.profile.following).toBe(false);
    expect(afterBody.profile.username).toBe(author.username);

    // 5. Reload: the button still reads Follow; no-token request is not following
    await page.reload();
    await expect(
      page.getByRole('button', { name: `Follow ${author.username}`, exact: true }),
    ).toBeVisible();

    const anonymous = await request.get(profileUrl);
    expect(anonymous.status()).toBe(200);
    expect((await anonymous.json()).profile.following).toBe(false);
  });
});
