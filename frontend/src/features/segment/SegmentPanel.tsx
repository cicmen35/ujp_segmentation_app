import { samSegment } from "../../lib/api/client";
import { useSessionStore } from "../../lib/store/session";
import { useState } from "react";

export function SegmentPanel() {
  const file = useSessionStore((s) => s.file);
  const boundingBox = useSessionStore((s) => s.boundingBox);
  const setMaskUrl = useSessionStore((s) => s.setMaskUrl);
  const [loading, setLoading] = useState(false);

  const canSegment = !!file && !!boundingBox;

  const onSegment = async () => {
    if (!file || !boundingBox) return;
    setLoading(true);
    try {
      const maskUrl = await samSegment(file, {
        box: boundingBox,
        multimask: true,
      });
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

