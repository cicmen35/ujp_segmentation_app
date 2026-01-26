import { samSegment } from "../../lib/api/client";
import { useSessionStore } from "../../lib/store/session";
import { useState } from "react";

export function SegmentPanel() {
  const file = useSessionStore((s) => s.file);
  const setMaskUrl = useSessionStore((s) => s.setMaskUrl);
  const [loading, setLoading] = useState(false);

  const onSegment = async () => {
    console.log("SEGMENT CLICK", file); // debugger
    if (!file) return;
    setLoading(true);
    try {
      const maskUrl = await samSegment(file, {
        // ImageCanvas doplní box/points
        box: [200, 50, 1150, 1200],
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
      disabled={!file || loading}
      className="rounded-2xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {loading ? "Segmentuji..." : "Segmentovat (SAM)"}
    </button>
  );
}
