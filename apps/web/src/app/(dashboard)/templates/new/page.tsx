import { redirect } from "next/navigation";

// New templates are made in the visual builder; this address stays for the
// dashboard shortcut and old links.
export default function NewTemplatePage() {
  redirect("/templates/builder");
}
