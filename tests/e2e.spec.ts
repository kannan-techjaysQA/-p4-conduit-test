import { test, expect, APIRequestContext, Page } from '@playwright/test';

const unique = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

async function createUser(request: APIRequestContext) {
  const id = unique();
  const response = await request.post('/api/users', {
    data: { user: { username: `e2e-user-${id}`, email: `e2e-${id}@example.com`, password: 'password123' } },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).user as { username: string; token: string };
}

async function signInPage(page: Page, token: string) {
  await page.addInitScript((t) => localStorage.setItem('jwtToken', t), token);
}

let user: { username: string; token: string } | undefined;

test.afterEach(async ({ request }) => {
  if (!user) return;
  const auth = { Authorization: `Token ${user.token}` };
  const list = await request.get(`/api/articles?author=${encodeURIComponent(user.username)}&limit=100`);
  expect(list.status()).toBe(200);
  const { articles } = await list.json();
  for (const article of articles) {
    const slug = encodeURIComponent(article.slug);
    const { comments } = await (await request.get(`/api/articles/${slug}/comments`)).json();
    for (const comment of comments.filter((c: { author: { username: string } }) => c.author.username === user!.username)) {
      const deleted = await request.delete(`/api/articles/${slug}/comments/${comment.id}`, { headers: auth });
      expect(deleted.status()).toBe(204);
    }
    const deleted = await request.delete(`/api/articles/${slug}`, { headers: auth });
    expect(deleted.status()).toBe(204);
  }
  user = undefined;
});

test('a signed-in user publishes a new article in the editor', async ({ page, request }) => {
  user = await createUser(request);
  await signInPage(page, user.token);
  const title = `E2E article ${unique()}`;
  const body = 'This article was written in the editor by an end-to-end test.';

  await page.goto('/editor');
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel("What's this article about?").fill('An end-to-end test article');
  await page.getByLabel('Write your article').fill(body);
  await page.getByRole('button', { name: 'Publish Article' }).click();

  await expect(page).toHaveURL(/\/article\//);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();

  const slug = decodeURIComponent(new URL(page.url()).pathname.split('/')[2]);
  const response = await request.get(`/api/articles/${encodeURIComponent(slug)}`);
  expect(response.status()).toBe(200);
  const { article } = await response.json();
  expect(article.title).toBe(title);
  expect(article.body).toBe(body);
  expect(article.author.username).toBe(user.username);
});

test('a signed-in user posts a comment on an article', async ({ page, request }) => {
  user = await createUser(request);
  const created = await request.post('/api/articles', {
    headers: { Authorization: `Token ${user.token}` },
    data: { article: { title: `E2E comment target ${unique()}`, description: 'For the comment test', body: 'Article body.' } },
  });
  expect(created.status()).toBe(201);
  const { slug } = (await created.json()).article;
  await signInPage(page, user.token);
  const commentText = `E2E comment ${unique()}`;

  await page.goto(`/article/${encodeURIComponent(slug)}`);
  await page.getByLabel('Write a comment').fill(commentText);
  await page.getByRole('button', { name: 'Post Comment' }).click();

  await expect(page.getByRole('listitem').filter({ hasText: commentText })).toBeVisible();

  const response = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
  expect(response.status()).toBe(200);
  const { comments } = await response.json();
  expect(comments).toHaveLength(1);
  expect(comments[0].body).toBe(commentText);
  expect(comments[0].author.username).toBe(user.username);
});
