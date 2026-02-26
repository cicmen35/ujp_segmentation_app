import { samSegment } from "../../lib/api/client";
import { useSessionStore } from "../../lib/store/session";
import { useState } from "react";

export function SegmentPanel() {
  const file = useSessionStore((s) => s.file);
  const promptMode = useSessionStore((s) => s.promptMode);
  const boundingBox = useSessionStore((s) => s.boundingBox);
  const promptPoints = useSessionStore((s) => s.promptPoints);
  const setMaskUrl = useSessionStore((s) => s.setMaskUrl);
  const [loading, setLoading] = useState(false);

  // Determine if we have enough prompt data
  const hasBox = !!boundingBox;
  const hasPoints = promptPoints.length > 0;

  const canSegment = !!file && (
    (promptMode === 'box' && hasBox) ||
    (promptMode === 'points' && hasPoints) ||
    (promptMode === 'box + points' && hasBox && hasPoints)
  );

  const onSegment = async () => {
    if (!file || !canSegment) return;
    setLoading(true);
    try {
      // Build prompt based on mode
      const prompt: Record<string, unknown> = { multimask: true };

      if ((promptMode === 'box' || promptMode === 'box + points') && boundingBox) {
        prompt.box = boundingBox;
      }

      if ((promptMode === 'points' || promptMode === 'box + points') && hasPoints) {
        prompt.point_coords = promptPoints.map((p) => [p.x, p.y]);
        prompt.point_labels = promptPoints.map((p) => p.label);
      }

      const maskUrl = await samSegment(file, prompt);
      setMaskUrl(maskUrl);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onSegment}
      disabled={!canSegment || loading}
      className="rounded-2xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {loading ? "Segmenting..." : "Segment image"}
    </button>
  );
}
