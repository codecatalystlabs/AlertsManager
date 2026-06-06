import { redirect } from "next/navigation";

export default function HomePage() {
	// Server-side redirect: avoids shipping/compiling a client spinner page and
	// the extra client-side navigation hop on first load.
	redirect("/add-alert");
}
