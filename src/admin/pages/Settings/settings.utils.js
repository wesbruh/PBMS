export const SETTINGS_BUCKET = "adminSettingsBucket";
export const MAX_NAME_LENGTH = 50;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];

export const getSettingsPath = (userId, version = Date.now()) =>
  `admins/${userId}/settings-${version}.json`;

export const getFileExtension = (fileName = "") => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".jpeg") || lower.endsWith(".jpg")) return "jpg";
  return "jpg";
};

export const getProfilePhotoPath = (userId, fileName) => {
  const ext = getFileExtension(fileName);
  return `admins/${userId}/profile-${Date.now()}.${ext}`;
};

export const clearObjectUrl = (current) => {
  if (current) URL.revokeObjectURL(current);
  return "";
};

export const replaceObjectUrl = (current, nextUrl) => {
  if (current) URL.revokeObjectURL(current);
  return nextUrl;
};

export const replaceSavedObjectUrl = (current, nextUrl) => {
  if (current && current !== nextUrl) URL.revokeObjectURL(current);
  return nextUrl;
};

export const isIgnorableSettingsLoadError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.status === 404 ||
    error?.statusCode === 404 ||
    message.includes("not found") ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  );
};
