import { test, expect, APIRequestContext } from '@playwright/test';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function unique(prefix: string): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

async function signUp(request: APIRequestContext) {
  const username = unique('author');
  const response = await request.post('/api/users', {
    data: { user: { username, email: `${username}@example.com`, password: 'password123' } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username, token: json.user.token as string };
}

function auth(token: string) {
  return { Authorization: `Token ${token}` };
}

function newArticleData() {
  return {
    title: unique('API test article '),
    description: 'Short description',
    body: 'The full article body.',
    tagList: ['testing', 'api'],
  };
}

async function createArticle(request: APIRequestContext, token: string) {
  const data = newArticleData();
  const response = await request.post('/api/articles', {
    headers: auth(token),
    data: { article: data },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { data, slug: json.article.slug as string };
}

async function countArticlesBy(request: APIRequestContext, username: string) {
  const response = await request.get(`/api/articles?author=${username}`);
  expect(response.status()).toBe(200);
  const json = await response.json();
  return json.articlesCount as number;
}

test.describe('Conduit articles API', () => {
  test('a signed-in user creates an article and gets it back with the sent data', async ({ request }) => {
    const { username, token } = await signUp(request);
    const data = newArticleData();

    const response = await request.post('/api/articles', {
      headers: auth(token),
      data: { article: data },
    });

    expect(response.status()).toBe(201);
    const { article } = await response.json();
    expect(article.title).toBe(data.title);
    expect(article.description).toBe(data.description);
    expect(article.body).toBe(data.body);
    expect(article.tagList).toEqual(['testing', 'api']);
    expect(typeof article.slug).toBe('string');
    expect(article.slug.length).toBeGreaterThan(0);
    expect(article.createdAt).toMatch(ISO_DATE);
    expect(article.updatedAt).toMatch(ISO_DATE);
    expect(article.favorited).toBe(false);
    expect(article.favoritesCount).toBe(0);
    expect(article.author.username).toBe(username);
    expect(article.author.following).toBe(false);
  });

  test('anyone can read a created article by its slug', async ({ request }) => {
    const { username, token } = await signUp(request);
    const { data, slug } = await createArticle(request, token);

    const response = await request.get(`/api/articles/${slug}`);

    expect(response.status()).toBe(200);
    const { article } = await response.json();
    expect(article.slug).toBe(slug);
    expect(article.title).toBe(data.title);
    expect(article.description).toBe(data.description);
    expect(article.body).toBe(data.body);
    expect(article.tagList).toEqual(data.tagList);
    expect(article.author.username).toBe(username);
  });

  test('the author changes the title and body, and the description stays as it was', async ({ request }) => {
    // The app removes existing tags when updating the article title and body, but API.md says the tags must remain unchanged.
    test.fail();
    const { token } = await signUp(request);
    const { data, slug } = await createArticle(request, token);
    const newTitle = unique('Changed title ');

    const response = await request.put(`/api/articles/${slug}`, {
      headers: auth(token),
      data: { article: { title: newTitle, body: 'The changed body.' } },
    });

    expect(response.status()).toBe(200);
    const { article } = await response.json();
    expect(article.title).toBe(newTitle);
    expect(article.body).toBe('The changed body.');
    expect(article.description).toBe(data.description);
    expect(article.tagList).toEqual(data.tagList);
    expect(article.slug).not.toBe(slug);

    const readBack = await request.get(`/api/articles/${article.slug}`);
    expect(readBack.status()).toBe(200);
    const saved = (await readBack.json()).article;
    expect(saved.title).toBe(newTitle);
    expect(saved.body).toBe('The changed body.');
    expect(saved.description).toBe(data.description);
  });

  test('the author deletes an article, and it can no longer be read', async ({ request }) => {
    const { token } = await signUp(request);
    const { slug } = await createArticle(request, token);

    const response = await request.delete(`/api/articles/${slug}`, { headers: auth(token) });

    expect(response.status()).toBe(204);
    expect(await response.text()).toBe('');

    const readBack = await request.get(`/api/articles/${slug}`);
    expect(readBack.status()).toBe(404);
    expect(await readBack.json()).toEqual({ errors: { article: ['not found'] } });
  });

  test('creating an article without a token gives 401 and saves nothing', async ({ request }) => {
    const { username } = await signUp(request);

    const response = await request.post('/api/articles', {
      data: { article: newArticleData() },
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });
    expect(await countArticlesBy(request, username)).toBe(0);
  });

  test('creating an article without a title gives 422 and saves nothing', async ({ request }) => {
    const { username, token } = await signUp(request);
    const { title, ...withoutTitle } = newArticleData();

    const response = await request.post('/api/articles', {
      headers: auth(token),
      data: { article: withoutTitle },
    });

    expect(response.status()).toBe(422);
    expect(await response.json()).toEqual({ errors: { title: ["can't be blank"] } });
    expect(await countArticlesBy(request, username)).toBe(0);
  });

  test("another user cannot change someone else's article", async ({ request }) => {
    const author = await signUp(request);
    const other = await signUp(request);
    const { data, slug } = await createArticle(request, author.token);

    const response = await request.put(`/api/articles/${slug}`, {
      headers: auth(other.token),
      data: { article: { title: unique('Hijacked title '), body: 'Hijacked body.' } },
    });

    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

    const readBack = await request.get(`/api/articles/${slug}`);
    expect(readBack.status()).toBe(200);
    const saved = (await readBack.json()).article;
    expect(saved.title).toBe(data.title);
    expect(saved.body).toBe(data.body);
  });

  test("another user cannot delete someone else's article", async ({ request }) => {
    const author = await signUp(request);
    const other = await signUp(request);
    const { data, slug } = await createArticle(request, author.token);

    const response = await request.delete(`/api/articles/${slug}`, { headers: auth(other.token) });

    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

    const readBack = await request.get(`/api/articles/${slug}`);
    expect(readBack.status()).toBe(200);
    expect((await readBack.json()).article.title).toBe(data.title);
  });

  test('reading an article that does not exist gives 404', async ({ request }) => {
    const response = await request.get(`/api/articles/${unique('no-such-article-')}`);

    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ errors: { article: ['not found'] } });
  });
});
