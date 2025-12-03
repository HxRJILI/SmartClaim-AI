"use client";

import Link from "next/link";
import { Button } from "@kit/ui/button";
import { AlertTriangle } from "lucide-react";

/**
 * Simple Global Error Page for SmartClaim
 * - Client Component (uses "use client")
 * - Provides retry, links to dashboard / sign-in, and technical details
 *
 * Replace apps/web/app/global-error.tsx with this content.
 */

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  // Log server-side via console (visible in server logs)
  // eslint-disable-next-line no-console
  console.error("Unhandled global error (GlobalErrorPage):", error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-xl w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center rounded-full bg-red-100 w-16 h-16 mx-auto">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold">Something went wrong</h1>

        <p className="text-sm text-muted-foreground">
          An unexpected error occurred while loading the application. You can try to
          reload the current page, or go back to the dashboard / sign in.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => reset()}>Retry</Button>

          <Button asChild variant="outline">
            <Link href="/smartclaim/dashboard">Go to Dashboard</Link>
          </Button>

          <Button asChild variant="ghost">
            <Link href="/auth/sign-in">Sign In</Link>
          </Button>
        </div>

        <details className="text-left text-xs text-muted-foreground mt-4 p-3 bg-muted/10 rounded-md">
          <summary className="cursor-pointer">Technical details (expand)</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-xs">
            {error?.message}
            {error?.stack ? "\n\n" + error.stack : ""}
          </pre>
        </details>
      </div>
    </div>
  );
}