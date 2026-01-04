import { NextResponse } from "next/server";
import { closeMonth } from "@/server/api/closures";
import { ensureProjectAccess, requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) {
      return response;
    }
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const payload = await request.json();
    const accessResponse = await ensureProjectAccess(payload.projectId, user);
    if (accessResponse) {
      return accessResponse;
    }
    const snapshot = await closeMonth({
      ...payload,
      actorName: payload.actorName || user.name || user.email
    });
    return NextResponse.json(snapshot);
  } catch (error) {
    return jsonError("Failed to close month", 500);
  }
}


