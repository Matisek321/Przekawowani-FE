import { useState, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export interface UseCoffeeDeleteState {
  isDeleting: boolean;
  error: string | null;
}

export interface UseCoffeeDeleteResult extends UseCoffeeDeleteState {
  deleteCoffee: () => Promise<boolean>;
  clearError: () => void;
}

// ============================================================================
// Custom Hook
// ============================================================================

/**
 * Hook to delete a coffee by id.
 * Returns the deletion state and a function to trigger the deletion.
 *
 * @param coffeeId - The UUID of the coffee to delete
 * @param accessToken - The user's access token for authentication
 */
export function useCoffeeDelete(
  coffeeId: string,
  accessToken: string | null
): UseCoffeeDeleteResult {
  const [state, setState] = useState<UseCoffeeDeleteState>({
    isDeleting: false,
    error: null,
  });

  const deleteCoffee = useCallback(async (): Promise<boolean> => {
    if (!accessToken) {
      setState({ isDeleting: false, error: "Wymagane jest zalogowanie" });
      return false;
    }

    setState({ isDeleting: true, error: null });

    try {
      const response = await fetch(`/api/coffees/${coffeeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 204) {
        // Successful deletion
        return true;
      }

      // Handle error responses
      const errorData = await response.json().catch(() => ({}));

      let errorMessage: string;
      switch (response.status) {
        case 401:
          errorMessage = "Musisz być zalogowany, aby usunąć kawę";
          break;
        case 403:
          errorMessage = "Nie masz uprawnień do usunięcia tej kawy";
          break;
        case 404:
          errorMessage = "Kawa nie została znaleziona";
          break;
        default:
          errorMessage = errorData.message || "Nie udało się usunąć kawy";
      }

      setState({ isDeleting: false, error: errorMessage });
      return false;
    } catch (error) {
      console.error("[useCoffeeDelete] Error:", error);
      setState({
        isDeleting: false,
        error: "Problem z połączeniem. Spróbuj ponownie.",
      });
      return false;
    }
  }, [coffeeId, accessToken]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    deleteCoffee,
    clearError,
  };
}
