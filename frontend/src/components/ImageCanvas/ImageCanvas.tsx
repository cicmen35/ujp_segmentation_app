import { useState } from "react";
import { useSessionStore } from "../../lib/store/session";
import { ImageModal } from "../ImageModal";

export function ImageCanvas() {
  const imageUrl = useSessionStore((s) => s.imageUrl);
  const maskUrl = useSessionStore((s) => s.maskUrl);
  const [modalSrc, setModalSrc] = useState<{ src: string; alt: string } | null>(null);

  if (!imageUrl) return <div className="text-slate-400">No image selected</div>;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Original image */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-slate-700">Original image</p>
          <button
            type="button"
            onClick={() => setModalSrc({ src: imageUrl, alt: "Original image" })}
            className="group relative block w-full overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <img
              src={imageUrl}
              alt="original"
              className="block w-full rounded-xl transition duration-200 group-hover:brightness-95"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 text-white/0 transition duration-200 group-hover:bg-black/20 group-hover:text-white/90">
              <svg viewBox="0 0 24 24" className="h-8 w-8 drop-shadow" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
          <p className="mt-1.5 text-center text-[11px] text-slate-400">Click to enlarge</p>
        </div>

        {/* Mask */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-slate-700">Image mask</p>
          {maskUrl ? (
            <>
              <button
                type="button"
                onClick={() => setModalSrc({ src: maskUrl, alt: "Segmentation mask" })}
                className="group relative block w-full overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <img
                  src={maskUrl}
                  alt="mask"
                  className="block w-full rounded-xl transition duration-200 group-hover:brightness-95"
                />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 text-white/0 transition duration-200 group-hover:bg-black/20 group-hover:text-white/90">
                  <svg viewBox="0 0 24 24" className="h-8 w-8 drop-shadow" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
              <p className="mt-1.5 text-center text-[11px] text-slate-400">Click to enlarge</p>
            </>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">
              No mask yet
            </div>
          )}
        </div>
      </div>

      {/* Lightbox modal */}
      {modalSrc && (
        <ImageModal
          src={modalSrc.src}
          alt={modalSrc.alt}
          onClose={() => setModalSrc(null)}
        />
      )}
    </>
  );
}
