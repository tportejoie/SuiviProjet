import { NextResponse } from "next/server";
import { User } from "@prisma/client";
import { prisma } from "../../server/prisma";
import { getSessionUser } from "./auth";
import { jsonError } from "./http";

type AuthResult = {
  user: User | null;
  response?: NextResponse;
};

export const requireUser = async (): Promise<AuthResult> => {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      response: jsonError("Unauthorized", 401),
    };
  }
  return { user };
};

export const requireAdmin = async (): Promise<AuthResult> => {
  const { user, response } = await requireUser();
  if (response || !user) {
    return { user: null, response };
  }
  if (user.role !== "ADMIN") {
    return {
      user: null,
      response: jsonError("Forbidden", 403),
    };
  }
  return { user };
};

export const ensureProjectAccess = async (
  projectId: string,
  user: User
): Promise<NextResponse | null> => {
  if (user.role === "ADMIN") {
    return null;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { projectManagerEmail: true },
  });

  if (!project || project.projectManagerEmail !== user.email) {
    return jsonError("Forbidden", 403);
  }

  return null;
};
