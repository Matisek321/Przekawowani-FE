import type { APIRoute } from "astro";
import { jsonBadRequest, jsonError, jsonOk, jsonTooManyRequests } from "../../../lib/http";
import { ForgotPasswordBodySchema } from "../../../lib/validation/auth";
import { sendPasswordResetEmail } from "../../../lib/services/auth.service";

export const prerender = false;

function buildRedirectUrl(siteUrl: string) {
  return `${siteUrl}/auth/callback`;
}

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json().catch(() => null);
    const parsed = ForgotPasswordBodySchema.safeParse(body);
    if (!parsed.success) {
      return jsonBadRequest("validation_failed", "Invalid payload");
    }

    const siteUrl = import.meta.env.SITE_URL || new URL(context.request.url).origin;

    try {
      await sendPasswordResetEmail(context.locals.supabase, parsed.data.email, buildRedirectUrl(siteUrl));
      return jsonOk({ ok: true }, { "Cache-Control": "no-store" });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || (err as Error)?.message;
      if (code === "too_many_requests") {
        return jsonTooManyRequests("too_many_requests", "Too many requests");
      }
      return jsonError("internal_error", "Unexpected server error");
    }
  } catch (err) {
    console.error("[POST /api/auth/forgot-password] error", { err });
    return jsonError("internal_error", "Unexpected server error");
  }
};
