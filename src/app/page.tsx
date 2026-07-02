import { redirect } from "next/navigation";

/**
 * Root Page
 * ---------
 * The middleware handles session checking and redirects users:
 * - Authenticated users going to "/" → redirected to "/rooms" by middleware
 * - Unauthenticated users → we redirect to "/login" here
 *
 * This keeps the root route clean and purposeful.
 */
export default function RootPage() {
  redirect("/login");
}
