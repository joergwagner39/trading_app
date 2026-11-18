import type { Signal } from "@/lib/analysis";
import { SIGNAL_LABEL, signalTone } from "@/lib/format";

export default function SignalBadge({ signal, score }: { signal: Signal; score?: number }) {
  const tone = signalTone(signal);
  const arrow = tone === "up" ? "▲" : tone === "down" ? "▼" : "●";
  return (
    <span className={`badge ${tone}`} title={score != null ? `Score ${score}` : undefined}>
      <span aria-hidden>{arrow}</span> {SIGNAL_LABEL[signal]}
    </span>
  );
}
