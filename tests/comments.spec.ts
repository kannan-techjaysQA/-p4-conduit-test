import { test, expect, APIRequestContext } from '@playwright/test';

const unique = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

type User = { username: string; token: string };

async function createUser(request: APIRequestContext) {
  const id = unique();
  const response = await request.post('/api/users', {
    data: { user: { username: `comment-user-${id}`, email: `comment-${id}@example.com`, password: 'password123' } },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).user as User;
}

async function createArticle(request: APIRequestContext, owner: User) {
  const response = await request.post('/api/articles', {
    headers: { Authorization: `Token ${owner.token}` },
    data: { article: { title: `Comment target ${unique()}`, description: 'For the comments tests', body: 'Article body.' } },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).article.slug as string;
}

async function getComments(request: APIRequestContext, slug: string) {
  const response = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
  expect(response.status()).toBe(200);
  return (await response.json()).comments as { id: number; body: string; author: { username: string } }[];
}

let user: User | undefined;

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

test.describe('Comments API', () => {
  test('a new user posts a comment and GET returns it as saved', async ({ request }) => {
    user = await createUser(request);
    const slug = await createArticle(request, user);
    const commentText = `API comment ${unique()}`;

    const posted = await request.post(`/api/articles/${encodeURIComponent(slug)}/comments`, {
      headers: { Authorization: `Token ${user.token}` },
      data: { comment: { body: commentText } },
    });
    expect(posted.status()).toBe(201);
    const { comment } = await posted.json();
    expect(comment.body).toBe(commentText);
    expect(comment.author.username).toBe(user.username);
    expect(comment.id).toBeDefined();

    const comments = await getComments(request, slug);
    expect(comments).toHaveLength(1);
    expect(comments[0].id).toBe(comment.id);
    expect(comments[0].body).toBe(commentText);
    expect(comments[0].author.username).toBe(user.username);
  });

  test('a comment with a blank or missing body is rejected and not saved', async ({ request }) => {
    // API.md says an empty comment body should return 422, but the app currently returns 201.
    test.fail();
    user = await createUser(request);
    const slug = await createArticle(request, user);
    const url = `/api/articles/${encodeURIComponent(slug)}/comments`;
    const auth = { Authorization: `Token ${user.token}` };

    const blank = await request.post(url, { headers: auth, data: { comment: { body: '' } } });
    expect(blank.status()).toBe(422);
    expect(await blank.json()).toEqual({ errors: { body: ["can't be blank"] } });

    const missing = await request.post(url, { headers: auth, data: { comment: {} } });
    expect(missing.status()).toBe(422);
    expect((await missing.json()).errors.body).toBeDefined();

    expect(await getComments(request, slug)).toHaveLength(0);

    // A valid comment on the same article is saved, so the empty list above was not vacuous.
    const valid = await request.post(url, { headers: auth, data: { comment: { body: 'Valid comment' } } });
    expect(valid.status()).toBe(201);
    const comments = await getComments(request, slug);
    expect(comments).toHaveLength(1);
    expect(comments[0].body).toBe('Valid comment');
  });

  test('a comment without a valid token is rejected and not saved', async ({ request }) => {
    user = await createUser(request);
    const slug = await createArticle(request, user);
    const url = `/api/articles/${encodeURIComponent(slug)}/comments`;
    const data = { comment: { body: `Unauthorised comment ${unique()}` } };

    const noToken = await request.post(url, { data });
    expect(noToken.status()).toBe(401);
    expect(await noToken.json()).toEqual({ errors: { token: ['is missing'] } });

    const wrongToken = await request.post(url, { headers: { Authorization: 'Token not-a-real-token' }, data });
    expect(wrongToken.status()).toBe(401);
    expect(await wrongToken.json()).toEqual({ errors: { token: ['is invalid'] } });

    expect(await getComments(request, slug)).toHaveLength(0);

    // A valid comment on the same article is saved, so the empty list above was not vacuous.
    const valid = await request.post(url, {
      headers: { Authorization: `Token ${user.token}` },
      data: { comment: { body: 'Valid comment' } },
    });
    expect(valid.status()).toBe(201);
    const comments = await getComments(request, slug);
    expect(comments).toHaveLength(1);
    expect(comments[0].body).toBe('Valid comment');
  });
});
