import { create } from "zustand";

type SessionState = {
  file: File | null;
  imageUrl: string | null;
  maskUrl: string | null;
  setFile: (file: File | null) => void;
  setMaskUrl: (url: string | null) => void;
  clear: () => void;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  file: null,
  imageUrl: null,
  maskUrl: null,
  setFile: (file) => {
    // cleanup starých URL
    const { imageUrl, maskUrl } = get();
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (maskUrl) URL.revokeObjectURL(maskUrl);

    set({
      file,
      imageUrl: file ? URL.createObjectURL(file) : null,
      maskUrl: null,
    });
  },
  setMaskUrl: (url) => {
    const { maskUrl } = get();
    if (maskUrl) URL.revokeObjectURL(maskUrl);
    set({ maskUrl: url });
  },
  clear: () => {
    const { imageUrl, maskUrl } = get();
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (maskUrl) URL.revokeObjectURL(maskUrl);
    set({ file: null, imageUrl: null, maskUrl: null });
  },
}));
