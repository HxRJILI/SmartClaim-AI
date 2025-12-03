"use client";

import Link from "next/link";
import { Button } from "@kit/ui/button";
import { AlertTriangle } from "lucide-react";

/**
 * Simple Error Page for SmartClaim
 * - Client Component (uses "use client")
 * - Basic message and links to dashboard / sign-in
 */

export default function ErrorPage({ error }: { error: Error }) {
  // Log server-side via console (visible in server logs)
  // eslint-disable-next-line no-console
  console.error("Unhandled error (ErrorPage):", error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-xl w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center rounded-full bg-red-100 w-16 h-16 mx-auto">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold">Something went wrong</h1>

        <p className="text-sm text-muted-foreground">
          An unexpected error occurred while loading this page.
          If the problem persists, try signing out and signing back in, or contact your administrator.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/smartclaim/dashboard">Go to Dashboard</Link>
          </Button>

          <Button asChild variant="outline">
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