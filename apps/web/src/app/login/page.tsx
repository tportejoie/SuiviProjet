import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }

  return <LoginForm />;
}
