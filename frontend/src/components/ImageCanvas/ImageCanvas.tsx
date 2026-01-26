import { useSessionStore } from "../../lib/store/session";

export function ImageCanvas() {
  const imageUrl = useSessionStore((s) => s.imageUrl);
  const maskUrl = useSessionStore((s) => s.maskUrl);

  if (!imageUrl) return <div className="text-slate-400">No image selected</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="mb-2 text-xs font-semibold text-slate-700">Original image</p>
        <img src={imageUrl} alt="original" className="block w-full rounded-xl" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="mb-2 text-xs font-semibold text-slate-700">Image mask</p>
        {maskUrl ? (
          <img src={maskUrl} alt="mask" className="block w-full rounded-xl" />
        ) : (
          <div className="text-slate-400">No mask yet</div>
        )}
      </div>
    </div>
  );
}
