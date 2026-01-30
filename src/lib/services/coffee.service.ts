import type { SupabaseClient } from "../../db/supabase.client";
import type { CoffeeDetailDto, CoffeeDto, CreateCoffeeCommand } from "../../types";

/**
 * Custom error class for domain-specific coffee service errors.
 */
export class CoffeeServiceError extends Error {
  constructor(
    public readonly code: "roastery_not_found" | "coffee_duplicate" | "coffee_not_found" | "forbidden" | "server_error",
    message: string
  ) {
    super(message);
    this.name = "CoffeeServiceError";
  }
}

/**
 * Fetches a single coffee detail from the `coffees` table.
 * Returns null when the coffee doesn't exist.
 *
 * @param supabase - The Supabase client instance
 * @param id - Coffee UUID
 */
export async function getCoffeeById(supabase: SupabaseClient, id: string): Promise<CoffeeDetailDto | null> {
  const { data, error } = await supabase
    .from("coffees")
    .select("id, roastery_id, name, avg_main, ratings_count, created_at, created_by")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[coffee.service] Error fetching coffee by id", { id, error });
    throw new CoffeeServiceError("server_error", "Failed to fetch coffee");
  }

  if (!data) return null;

  const dto: CoffeeDetailDto = {
    id: data.id,
    roasteryId: data.roastery_id,
    name: data.name,
    avgMain: data.avg_main,
    ratingsCount: data.ratings_count,
    createdAt: data.created_at,
    createdBy: data.created_by,
  };

  return dto;
}

/**
 * Creates a new coffee for a given roastery.
 *
 * @param supabase - The Supabase client instance
 * @param roasteryId - The UUID of the roastery
 * @param userId - The UUID of the user creating the coffee
 * @param cmd - The command containing the coffee name
 * @returns The created coffee as CoffeeDto
 * @throws CoffeeServiceError with code:
 *   - 'roastery_not_found' if the roastery doesn't exist
 *   - 'coffee_duplicate' if a coffee with the same normalized name exists in the roastery
 *   - 'server_error' for unexpected errors
 */
export async function createCoffee(
  supabase: SupabaseClient,
  roasteryId: string,
  userId: string,
  cmd: CreateCoffeeCommand
): Promise<CoffeeDto> {
  // 1) Verify roastery exists
  const { data: roastery, error: roasteryError } = await supabase
    .from("roasteries")
    .select("id")
    .eq("id", roasteryId)
    .maybeSingle();

  if (roasteryError) {
    console.error("[coffee.service] Error checking roastery existence", { roasteryId, error: roasteryError });
    throw new CoffeeServiceError("server_error", "Failed to verify roastery");
  }

  if (!roastery) {
    throw new CoffeeServiceError("roastery_not_found", `Roastery with id ${roasteryId} not found`);
  }

  // 2) Insert coffee
  const { data: coffee, error: insertError } = await supabase
    .from("coffees")
    .insert({
      roastery_id: roasteryId,
      name: cmd.name,
      created_by: userId,
    })
    .select("id, roastery_id, name, avg_main, ratings_count, created_at")
    .single();

  if (insertError) {
    // Handle unique constraint violation (PostgreSQL error code 23505)
    if (insertError.code === "23505") {
      throw new CoffeeServiceError(
        "coffee_duplicate",
        `Coffee with name "${cmd.name}" already exists in this roastery`
      );
    }

    console.error("[coffee.service] Error inserting coffee", { roasteryId, cmd, error: insertError });
    throw new CoffeeServiceError("server_error", "Failed to create coffee");
  }

  // 3) Map to CoffeeDto
  const dto: CoffeeDto = {
    id: coffee.id,
    roasteryId: coffee.roastery_id,
    name: coffee.name,
    avgMain: coffee.avg_main,
    ratingsCount: coffee.ratings_count,
    createdAt: coffee.created_at,
  };

  return dto;
}

/**
 * Deletes a coffee by id.
 * Only the user who created the coffee can delete it.
 * All associated ratings are deleted via cascade.
 *
 * @param supabase - The Supabase client instance
 * @param coffeeId - Coffee UUID
 * @param userId - The UUID of the user attempting to delete
 * @throws CoffeeServiceError with code:
 *   - 'coffee_not_found' if the coffee doesn't exist
 *   - 'forbidden' if the user is not the owner of the coffee
 *   - 'server_error' for unexpected errors
 */
export async function deleteCoffee(supabase: SupabaseClient, coffeeId: string, userId: string): Promise<void> {
  // 1) Check if coffee exists and verify ownership
  const { data: coffee, error: fetchError } = await supabase
    .from("coffees")
    .select("id, created_by")
    .eq("id", coffeeId)
    .maybeSingle();

  if (fetchError) {
    console.error("[coffee.service] Error fetching coffee for deletion", { coffeeId, error: fetchError });
    throw new CoffeeServiceError("server_error", "Failed to fetch coffee");
  }

  if (!coffee) {
    throw new CoffeeServiceError("coffee_not_found", "Coffee not found");
  }

  // 2) Verify ownership
  if (coffee.created_by !== userId) {
    throw new CoffeeServiceError("forbidden", "You can only delete coffees you created");
  }

  // 3) Delete coffee (cascade will delete ratings)
  const { error: deleteError } = await supabase.from("coffees").delete().eq("id", coffeeId);

  if (deleteError) {
    console.error("[coffee.service] Error deleting coffee", { coffeeId, error: deleteError });
    throw new CoffeeServiceError("server_error", "Failed to delete coffee");
  }
}
