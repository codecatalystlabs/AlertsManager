import { redirect } from "next/navigation";

/** EIDSR SMS actions live on 6767 Signals. */
export default function EidsrMessagesRedirectPage() {
	redirect("/dashboard/eidsr-alerts");
}
