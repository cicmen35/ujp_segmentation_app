import { useSessionStore } from "../../lib/store/session";

export function ImageCanvas() {
  const imageUrl = useSessionStore((s) => s.imageUrl);
  const maskUrl = useSessionStore((s) => s.maskUrl);

  if (!imageUrl) return <div className="text-slate-400">No image selected</div>;

  return (
    <div className="relative inline-block">
      <img src={imageUrl} alt="input" className="block max-w-full rounded-2xl" />
      {maskUrl && (
        <img
          src={maskUrl}
          alt="mask"
          className="absolute left-0 top-0 block max-w-full rounded-2xl opacity-40"
          style={{ mixBlendMode: "multiply" }}
        />
      )}
    </div>
  );
}
