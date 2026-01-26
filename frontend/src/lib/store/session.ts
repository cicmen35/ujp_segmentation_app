import { create } from "zustand";

export type SegmentationModel = 'sam' | 'in-house';
export type PromptMode = "box" | "points" | "box + points";

type SessionState = {
  // data
  file: File | null;
  imageUrl: string | null;
  maskUrl: string | null;

  // UI/config
  model: SegmentationModel;
  promptMode: PromptMode;

  // setters
  setFile: (file: File | null) => void;
  setMaskUrl: (url: string | null) => void;
  setModel: (model: SegmentationModel) => void;
  setPromptMode: (mode: PromptMode) => void;

  // utils
  clear: () => void;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  file: null,
  imageUrl: null,
  maskUrl: null,
  model: 'sam',
  promptMode: 'box',

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
  setModel: (model) => set({ model }),
  setPromptMode: (mode) => set({ promptMode: mode }),

  clear: () => {
    const { imageUrl, maskUrl } = get();
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (maskUrl) URL.revokeObjectURL(maskUrl);
    set({ file: null, imageUrl: null, maskUrl: null, model: 'sam', promptMode: 'box' });
  },
}));
