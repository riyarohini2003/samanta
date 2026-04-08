"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 overflow-hidden">
      {/* Background orbs */}
      <div className="orb -top-32 left-1/3 h-[300px] w-[300px] bg-destructive/10 animate-float" aria-hidden />
      <div className="orb -bottom-20 right-1/3 h-[250px] w-[250px] bg-orange-400/10 animate-float-slow" aria-hidden />

      <div className="relative flex flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/10">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Something went wrong
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs font-mono text-muted-foreground/60">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.97]"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
