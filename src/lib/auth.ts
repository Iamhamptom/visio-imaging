import { NextRequest, NextResponse } from "next/server";

/**
 * Validates API key from Authorization header.
 * Pattern: Bearer $VISIO_IMAGING_KEY
 */
export function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const key = authHeader.slice(7);
  const validKey = process.env.VISIO_IMAGING_KEY;

  if (!validKey || validKey.length === 0) return false;
  return key === validKey;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Unauthorized", message: "Invalid or missing API key" },
    { status: 401 }
  );
}
