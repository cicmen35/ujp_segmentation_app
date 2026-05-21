export type UserRole = "admin" | "user";

export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
};

export type UserListItem = {
  username: string;
  role: UserRole;
};

export type StorageScope = "shared" | "private";

export type SamPreprocessingMode = "none" | "contrast_change";
export type PromptMode = "box" | "points" | "box + points";
export type SegmentationModel = "sam" | "in-house";
export type PromptPoint = {
  x: number;
  y: number;
  label: 0 | 1;
};
export type BoundingBox = [number, number, number, number];

export type FolderFile = {
  name: string;
  path: string;
};

export type StorageItemKind = "folder" | "file";

export type FolderNode = {
  name: string;
  path: string;
  children: FolderNode[];
  files: FolderFile[];
};

export type FolderTreeResponse = {
  shared: FolderNode[];
  private: FolderNode[];
};

export type SaveSessionResponse = {
  scope: StorageScope;
  session_folder: string;
  path: string;
  original_image: string;
  mask_image: string;
};

export type PromptPreset = {
  model: SegmentationModel;
  prompt_mode: PromptMode;
  preprocessing_mode: SamPreprocessingMode;
  bounding_box: BoundingBox | null;
  prompt_points: PromptPoint[];
};

export type SaveSessionPromptMetadata = PromptPreset & {
  created_at: string;
};
