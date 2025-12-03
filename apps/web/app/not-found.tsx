"use client";

import Link from "next/link";
import { Button } from "@kit/ui/button";
import { AlertCircle } from "lucide-react";

/**
 * SmartClaim not-found page
 * - Replaces the marketing SiteHeader dependency with a small, self-contained view
 * - Client component because it uses UI primitives (next/link / kit UI)
 *
 * Paste this content into apps/web/app/not-found.tsx
 */

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-xl w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center rounded-full bg-yellow-100 w-16 h-16 mx-auto">
          <AlertCircle className="h-8 w-8 text-yellow-700" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold">Page not found</h1>

        <p className="text-sm text-muted-foreground">
          The page you are looking for doesn't exist or has been moved. Use the links below to continue.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/smartclaim/dashboard">Go to Dashboard</Link>
          </Button>

          <Button asChild variant="outline">
            <Link href="/smartclaim/tickets">My Tickets</Link>
          </Button>

          <Button asChild variant="ghost">
            <Link href="/auth/sign-in">Sign In</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          If you believe this is an error, contact your administrator.
        </p>
      </div>
    </div>
  );
}