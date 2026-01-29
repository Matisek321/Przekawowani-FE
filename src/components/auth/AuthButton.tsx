import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, LogOut, User, ChevronDown, Settings } from "lucide-react";

interface AuthButtonProps {
  /** User information if logged in, null otherwise */
  user: {
    id: string;
    email: string;
  } | null;
  /** Optional display name to show instead of email */
  displayName?: string | null;
}

/**
 * Authentication button component for the navigation.
 * Shows "Zaloguj się" for unauthenticated users.
 * Shows a dropdown with user info and logout option for authenticated users.
 */
export function AuthButton({ user, displayName }: AuthButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Redirect to home page after logout
        window.location.assign("/");
      } else {
        // Still redirect on error - user probably wants to be logged out
        console.error("Logout failed, redirecting anyway");
        window.location.assign("/");
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Still redirect on error
      window.location.assign("/");
    }
  }, []);

  // Unauthenticated - show login button
  if (!user) {
    return (
      <Button asChild variant="default" size="sm" data-test-id="auth-login-button">
        <a href="/login">Zaloguj się</a>
      </Button>
    );
  }

  // Authenticated - show dropdown
  const displayText = displayName || user.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          disabled={isLoggingOut}
          data-test-id="auth-user-menu-trigger"
        >
          {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
          <span className="max-w-32 truncate" data-test-id="auth-user-display-name">
            {displayText}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" data-test-id="auth-user-menu">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium" data-test-id="auth-menu-display-name">
            {displayName || "Użytkownik"}
          </p>
          <p className="text-xs text-muted-foreground truncate" data-test-id="auth-menu-email">
            {user.email}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild data-test-id="auth-account-settings-link">
          <a href="/account" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Ustawienia konta
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-destructive focus:text-destructive cursor-pointer"
          data-test-id="auth-logout-button"
        >
          {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
          Wyloguj się
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
