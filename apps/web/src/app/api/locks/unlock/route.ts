import { NextResponse } from "next/server";
import { adminUnlockPeriod } from "../../../../../server/api/locks";
import { requireAdmin } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { response } = await requireAdmin();
    if (response) {
      return response;
    }

    const payload = await request.json();
    const result = await adminUnlockPeriod(payload);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError("Failed to unlock period", 500);
  }
}

