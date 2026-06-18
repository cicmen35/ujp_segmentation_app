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

export type StorageItemKind = "folder" | "file";

export type CopiedStorageItem = {
  sourceScope: StorageScope;
  path: string;
  kind: StorageItemKind;
  name: string;
  isSession?: boolean;
};

export type FolderNode = {
  name: string;
  path: string;
  is_session: boolean;
  children: FolderNode[];
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

export type SavedSessionResponse = {
  scope: StorageScope;
  name: string;
  path: string;
  original_image_name: string;
  original_image_path: string;
  mask_image_name: string;
  mask_image_path: string;
  prompt_metadata: SaveSessionPromptMetadata | null;
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
