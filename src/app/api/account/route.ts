import { NextRequest, NextResponse } from "next/server";
import { createAccount, getAccount, getAccountByEmail } from "@/lib/credits";

// POST /api/account — Create or get account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, companyName, accountType } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Return existing account if email exists
    const existing = getAccountByEmail(email);
    if (existing) {
      return NextResponse.json(existing);
    }

    const account = createAccount({
      email,
      name: name || "",
      companyName: companyName || "",
      accountType: accountType || "practice",
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create account";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/account?email=... — Get account by email
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const id = searchParams.get("id");

  if (!email && !id) {
    return NextResponse.json({ error: "Provide email or id" }, { status: 400 });
  }

  const account = email ? getAccountByEmail(email) : getAccount(id!);
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json(account);
}
