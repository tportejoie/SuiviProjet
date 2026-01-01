import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import AppShell from "../components/AppShell";
import { UserRole } from "@/types";

export default async function Page() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      currentUser={{
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        active: user.active
      }}
    />
  );
}
