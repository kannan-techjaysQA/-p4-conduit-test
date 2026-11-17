import { test, expect, APIRequestContext } from '@playwright/test';

async function signUp(request: APIRequestContext, prefix: string) {
  const id = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const response = await request.post('/api/users', {
    data: { user: { username: id, email: `${id}@example.com`, password: 'password123' } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username: id as string, token: json.user.token as string };
}

async function createArticle(request: APIRequestContext, token: string) {
  const response = await request.post('/api/articles', {
    headers: { Authorization: `Token ${token}` },
    data: {
      article: {
        title: `Contract article ${Date.now()}`,
        description: 'Contract description',
        body: 'Contract body',
        tagList: ['testing', 'api'],
      },
    },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.article as { slug: string; title: string };
}

test.describe('schema', () => {
  test('GET /api/articles/:slug answers with the Article shape', async ({ request }) => {
    const author = await signUp(request, 'schema-author');
    const created = await createArticle(request, author.token);

    const response = await request.get(`/api/articles/${created.slug}`);

    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(Object.keys(json.article).sort()).toEqual(
      [
        'slug',
        'title',
        'description',
        'body',
        'tagList',
        'createdAt',
        'updatedAt',
        'favorited',
        'favoritesCount',
        'author',
      ].sort(),
    );
    expect(json).toMatchObject({
      article: {
        slug: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        body: expect.any(String),
        tagList: expect.any(Array),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        favorited: expect.any(Boolean),
        favoritesCount: expect.any(Number),
        author: {
          username: expect.any(String),
          bio: null,
          image: null,
          following: expect.any(Boolean),
        },
      },
    });
  });

  test('GET /api/user answers with the User shape', async ({ request }) => {
    const user = await signUp(request, 'schema-user');

    const response = await request.get('/api/user', {
      headers: { Authorization: `Token ${user.token}` },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      user: {
        email: expect.any(String),
        token: expect.any(String),
        username: expect.any(String),
        bio: null,
        image: null,
      },
    });
  });
});

test.describe('auth', () => {
  test('GET /api/user without a token gives 401 "is missing"', async ({ request }) => {
    const response = await request.get('/api/user');

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });
  });

  test('GET /api/user with a wrong token gives 401 "is invalid"', async ({ request }) => {
    const response = await request.get('/api/user', {
      headers: { Authorization: 'Token not-a-real-token' },
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ errors: { token: ['is invalid'] } });
  });

  test("PUT on someone else's article gives 403 and leaves it unchanged", async ({ request }) => {
    const author = await signUp(request, 'auth-author');
    const other = await signUp(request, 'auth-other');
    const created = await createArticle(request, author.token);

    const response = await request.put(`/api/articles/${created.slug}`, {
      headers: { Authorization: `Token ${other.token}` },
      data: { article: { title: 'Changed by someone else' } },
    });

    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

    const after = await request.get(`/api/articles/${created.slug}`);
    expect(after.status()).toBe(200);
    expect((await after.json()).article.title).toBe(created.title);
  });
});
