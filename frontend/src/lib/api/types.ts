export type UserRole = "admin" | "user";
export type SamPreprocessingMode = "none" | "contrast_normalization";

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

export type FolderNode = {
  name: string;
  path: string;
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

export type SegmentationPrompt = {
  multimask: boolean;
  box?: [number, number, number, number];
  point_coords?: Array<[number, number]>;
  point_labels?: Array<0 | 1>;
};
