import { redirect } from "next/navigation";
import { isAuthenticated } from "../lib/auth";
import Planner from "./Planner";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await isAuthenticated())) redirect("/login");
  return <Planner />;
}
