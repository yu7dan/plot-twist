import { redirect } from "next/navigation";

/** "My gifts" grew into the Dashboard. */
export default function GiftsPage() {
  redirect("/dashboard");
}
