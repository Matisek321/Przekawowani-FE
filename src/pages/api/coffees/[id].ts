import type { APIRoute } from "astro";
import { jsonBadRequest, jsonError, jsonForbidden, jsonNotFound, jsonOk, jsonUnauthorized } from "../../../lib/http";
import { coffeePathParamsSchema } from "../../../lib/validation/coffees";
import { getCoffeeById, deleteCoffee, CoffeeServiceError } from "../../../lib/services/coffee.service";
import type { CoffeeDetailDto } from "../../../types";

export const prerender = false;

/**
 * GET /api/coffees/{id}
 *
 * Returns coffee details with aggregated metrics sourced from `public.coffee_aggregates`.
 *
 * Responses:
 * - 200: CoffeeDetailDto
 * - 400: Invalid id (non-UUID)
 * - 404: Coffee not found
 * - 500: Internal server error
 */
export const GET: APIRoute = async (context) => {
  const requestId = context.request.headers.get("x-request-id") ?? undefined;

  try {
    const parsedParams = coffeePathParamsSchema.safeParse(context.params);
    if (!parsedParams.success) {
      return jsonBadRequest("validation_failed", "Invalid id");
    }

    const { id } = parsedParams.data;
    const coffee: CoffeeDetailDto | null = await getCoffeeById(context.locals.supabase, id);

    if (!coffee) {
      return jsonNotFound("coffee_not_found", "Coffee not found");
    }

    return jsonOk(coffee, {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
    });
  } catch (err) {
    console.error("[GET /api/coffees/{id}] error", { err, requestId });
    return jsonError("internal_error", "Unexpected error");
  }
};

/**
 * DELETE /api/coffees/{id}
 *
 * Deletes a coffee by id. Only the user who created the coffee can delete it.
 * All associated ratings are deleted (cascade).
 *
 * Responses:
 * - 204: Successful deletion (no content)
 * - 400: Invalid id (non-UUID)
 * - 401: Unauthorized (not authenticated)
 * - 403: Forbidden (user is not the owner)
 * - 404: Coffee not found
 * - 500: Internal server error
 */
export const DELETE: APIRoute = async (context) => {
  const requestId = context.request.headers.get("x-request-id") ?? undefined;

  try {
    // 1) Check authentication
    const user = context.locals.user;
    if (!user) {
      return jsonUnauthorized("unauthorized", "Authentication required");
    }

    // 2) Validate path params
    const parsedParams = coffeePathParamsSchema.safeParse(context.params);
    if (!parsedParams.success) {
      return jsonBadRequest("validation_failed", "Invalid id");
    }

    const { id } = parsedParams.data;

    // 3) Delete coffee via service (includes ownership check)
    await deleteCoffee(context.locals.supabase, id, user.id);

    // 4) Return 204 No Content
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof CoffeeServiceError) {
      if (err.code === "coffee_not_found") {
        return jsonNotFound("coffee_not_found", err.message);
      }
      if (err.code === "forbidden") {
        return jsonForbidden("forbidden", err.message);
      }
      console.error("[DELETE /api/coffees/{id}] service error", { err, requestId });
      return jsonError("internal_error", "Unexpected error");
    }

    console.error("[DELETE /api/coffees/{id}] error", { err, requestId });
    return jsonError("internal_error", "Unexpected error");
  }
};
