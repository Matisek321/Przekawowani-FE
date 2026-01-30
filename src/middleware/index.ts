import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance, type SupabaseEnv } from "../db/supabase.client";
import { jsonUnauthorized } from "../lib/http";

const PUBLIC_PATHS = [
  "/login",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/callback",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/logout",
  "/api/auth/me",
];

function buildReturnTo(url: URL) {
  return `${url.pathname}${url.search}`;
}

function getSupabaseEnv(context: { locals: App.Locals }): SupabaseEnv {
  // In Cloudflare Workers/Pages, env vars are available through runtime.env
  // In dev mode, they're available through import.meta.env
  const runtimeEnv = context.locals.runtime?.env;

  return {
    SUPABASE_URL: runtimeEnv?.SUPABASE_URL ?? import.meta.env.SUPABASE_URL,
    SUPABASE_KEY: runtimeEnv?.SUPABASE_KEY ?? import.meta.env.SUPABASE_KEY,
    SUPABASE_SERVICE_ROLE_KEY:
      runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, url, redirect } = context;

  const supabaseEnv = getSupabaseEnv(context);
  context.locals.supabaseEnv = supabaseEnv;

  const supabase = createSupabaseServerInstance({
    headers: request.headers,
    cookies,
    env: supabaseEnv,
  });

  context.locals.supabase = supabase;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  context.locals.user = user ?? null;
  context.locals.session = session ?? null;

  if (PUBLIC_PATHS.includes(url.pathname)) {
    return next();
  }

  if (url.pathname.startsWith("/api/")) {
    if (url.pathname.startsWith("/api/auth/")) {
      return next();
    }
    if (!user) {
      return jsonUnauthorized("unauthorized", "Authentication required");
    }
    return next();
  }

  if (!user) {
    return redirect(`/login?returnTo=${encodeURIComponent(buildReturnTo(url))}`);
  }

  return next();
});
