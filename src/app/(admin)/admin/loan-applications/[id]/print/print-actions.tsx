"use client";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";

export function PrintActions({ backHref }: { backHref: string }) {
  return (
    <div className="no-print sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 p-3 backdrop-blur">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Printer className="h-4 w-4" /> Print / Save as PDF
      </button>
    </div>
  );
}
