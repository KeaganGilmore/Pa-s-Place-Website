import { defineMiddleware } from 'astro:middleware';

// HTTP Basic Auth over the CMS admin and its API. Public pages are
// prerendered and never hit this at runtime. Override the defaults with
// CMS_USER / CMS_PASSWORD env vars in production.
const PROTECTED = /^\/(keystatic|api\/keystatic)(\/|$)/;

export const onRequest = defineMiddleware((context, next) => {
  if (!PROTECTED.test(context.url.pathname)) return next();

  const user = process.env.CMS_USER || 'admin';
  const pass = process.env.CMS_PASSWORD || 'rootpass';
  const expected = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');

  const auth = context.request.headers.get('authorization');
  if (auth === expected) return next();

  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Pa\'s Place CMS", charset="UTF-8"' },
  });
});
