import { redirect } from "next/navigation";

/**
 * The page moved to /dashboard/signal-logs.
 *
 * "Call log" was never accurate — signals arrive by SMS 6767, the web form,
 * eCHIS and points of entry as well as by phone — and the EBS guideline (§2)
 * names the object a SIGNAL until verification turns it into an event. This
 * redirect keeps bookmarks and any pasted links working.
 */
export default function CallLogsRedirect() {
	redirect("/dashboard/signal-logs");
}
