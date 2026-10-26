import type { Metadata } from "next";
import { StartRedirect } from "./start-redirect";

export const metadata: Metadata = { title: "Opening SpazaLink" };

/** Landing spot after sign in or sign up: admins go to the admin portal, everyone else to their shop. */
export default function StartPage() {
  return <StartRedirect />;
}
