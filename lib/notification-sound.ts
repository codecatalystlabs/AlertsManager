// A small, dependency-free notification chime via the Web Audio API (no audio
// asset to ship/host). Best-effort: silently no-ops if audio is unavailable or
// blocked by the browser's autoplay policy (which it isn't once the user has
// interacted with the page, e.g. after logging in).

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
	if (typeof window === "undefined") return null;
	const Ctx =
		window.AudioContext ||
		(window as unknown as { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext;
	if (!Ctx) return null;
	if (!audioCtx) audioCtx = new Ctx();
	return audioCtx;
}

/** Play a short two-tone "ding-dong" chime. Safe to call from anywhere. */
export function playNotificationSound(): void {
	try {
		const ctx = getCtx();
		if (!ctx) return;
		if (ctx.state === "suspended") void ctx.resume();

		const now = ctx.currentTime;
		const notes = [880, 1174.66]; // A5 → D6
		notes.forEach((freq, i) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			osc.frequency.value = freq;

			const start = now + i * 0.13;
			const end = start + 0.13;
			// Quick attack, gentle decay — keeps it soft, not jarring.
			gain.gain.setValueAtTime(0.0001, start);
			gain.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, end);

			osc.connect(gain).connect(ctx.destination);
			osc.start(start);
			osc.stop(end + 0.02);
		});
	} catch {
		/* audio unavailable / blocked — ignore */
	}
}
