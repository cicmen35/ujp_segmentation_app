import { create } from "zustand";

export type SegmentationModel = 'sam' | 'in-house';
export type PromptMode = "box" | "points" | "box + points";

export type BoundingBox = [number, number, number, number]; // [x1, y1, x2, y2] in image pixels
export type PromptPoint = { x: number; y: number; label: 0 | 1 }; // 0 = negative, 1 = positive

type SessionState = {
  // data
  file: File | null;
  imageUrl: string | null;
  maskUrl: string | null;

  // prompts
  boundingBox: BoundingBox | null;
  promptPoints: PromptPoint[];

  // UI/config
  model: SegmentationModel;
  promptMode: PromptMode;

  // setters
  setFile: (file: File | null) => void;
  setMaskUrl: (url: string | null) => void;
  setBoundingBox: (box: BoundingBox | null) => void;
  addPromptPoint: (point: PromptPoint) => void;
  removeLastPoint: () => void;
  clearPromptPoints: () => void;
  setModel: (model: SegmentationModel) => void;
  setPromptMode: (mode: PromptMode) => void;

  // utils
  clear: () => void;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  file: null,
  imageUrl: null,
  maskUrl: null,
  boundingBox: null,
  promptPoints: [],
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
  setBoundingBox: (box) => set({ boundingBox: box }),
  addPromptPoint: (point) => set((s) => ({ promptPoints: [...s.promptPoints, point] })),
  removeLastPoint: () => set((s) => ({ promptPoints: s.promptPoints.slice(0, -1) })),
  clearPromptPoints: () => set({ promptPoints: [] }),
  setModel: (model) => set({ model }),
  setPromptMode: (mode) => set({ promptMode: mode }),

  clear: () => {
    const { imageUrl, maskUrl } = get();
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (maskUrl) URL.revokeObjectURL(maskUrl);
    set({ file: null, imageUrl: null, maskUrl: null, boundingBox: null, promptPoints: [], model: 'sam', promptMode: 'box' });
  },
}));
