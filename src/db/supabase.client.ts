import type { AstroCookies } from "astro";
import { createServerClient, createBrowserClient, type CookieOptionsWithName } from "@supabase/ssr";

import type { Database } from "./database.types";

export type SupabaseClient = ReturnType<typeof createServerClient<Database>>;

export interface SupabaseEnv {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: import.meta.env.PROD,
  httpOnly: true,
  sameSite: "lax",
};

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
  env: SupabaseEnv;
}) => {
  const { env } = context;
  return createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_KEY, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });
};

export const createSupabaseBrowserClient = () => {
  return createBrowserClient<Database>(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
};
