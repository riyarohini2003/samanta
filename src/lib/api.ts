import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiError = {
  error: string;
  code?: string;
  details?: unknown;
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json<ApiError>(
    { error: message, code: "BAD_REQUEST", details },
    { status: 400 }
  );
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json<ApiError>(
    { error: message, code: "UNAUTHORIZED" },
    { status: 401 }
  );
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json<ApiError>(
    { error: message, code: "FORBIDDEN" },
    { status: 403 }
  );
}

export function notFound(message = "Not Found") {
  return NextResponse.json<ApiError>(
    { error: message, code: "NOT_FOUND" },
    { status: 404 }
  );
}

export function conflict(message: string) {
  return NextResponse.json<ApiError>(
    { error: message, code: "CONFLICT" },
    { status: 409 }
  );
}

export function serverError(e: unknown) {
  console.error("API error:", e);
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : e instanceof Error
        ? e.message
        : "Internal server error";
  return NextResponse.json<ApiError>(
    { error: message, code: "SERVER_ERROR" },
    { status: 500 }
  );
}

export function handleError(e: unknown) {
  if (e instanceof ZodError) {
    const first = e.issues[0];
    const path = first?.path?.join(".");
    const message = first
      ? path
        ? `${path}: ${first.message}`
        : first.message
      : "Validation failed";
    return badRequest(message, e.flatten());
  }
  if (e instanceof Error && "code" in e) {
    const code = (e as any).code;
    if (code === "P2002")
      return conflict("A record with that unique value already exists");
    if (code === "P2025") return notFound("Record not found");
  }
  return serverError(e);
}
