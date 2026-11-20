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
        username: `follow-${role}-${id}`,
        email: `follow-${role}-${id}@example.com`,
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
  test('Following an author is saved', async ({ page, request }) => {
    // 1. API: make a new reader and a new author; the reader does not follow yet
    const reader = await createUser(request, 'reader');
    const author = await createUser(request, 'author');
    const authHeaders = { Authorization: `Token ${reader.token}` };
    const profileUrl = `${BASE_URL}/api/profiles/${encodeURIComponent(author.username)}`;

    const before = await request.get(profileUrl, { headers: authHeaders });
    expect(before.status()).toBe(200);
    expect((await before.json()).profile.following).toBe(false);

    // 2. Sign in the browser with the reader's token and open the author profile
    await signInPage(page, reader.token);
    await page.goto(`${BASE_URL}/profile/${encodeURIComponent(author.username)}`);
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: `Follow ${author.username}`, exact: true }),
    ).toBeVisible();

    // 3. Click follow
    await page
      .getByRole('button', { name: `Follow ${author.username}`, exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: `Unfollow ${author.username}`, exact: true }),
    ).toBeVisible();

    // 4. API: the follow is saved
    const after = await request.get(profileUrl, { headers: authHeaders });
    expect(after.status()).toBe(200);
    const afterBody = await after.json();
    expect(afterBody.profile.following).toBe(true);
    expect(afterBody.profile.username).toBe(author.username);

    // 5. Reload: the button still reads Unfollow
    await page.reload();
    await expect(
      page.getByRole('button', { name: `Unfollow ${author.username}`, exact: true }),
    ).toBeVisible();
  });
});
