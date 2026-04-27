import {
  getFileExtension,
  getProfilePhotoPath,
  getSettingsPath,
  isIgnorableSettingsLoadError,
} from "../../../../src/admin/pages/Settings/settings.utils.js";

describe("Admin settings helpers", () => {
  test("builds storage paths with the expected naming convention", () => {
    expect(getSettingsPath("user-123", 1700000000000)).toBe(
      "admins/user-123/settings-1700000000000.json"
    );
    expect(getProfilePhotoPath("user-123", "headshot.PNG")).toMatch(
      /^admins\/user-123\/profile-\d+\.png$/
    );
  });

  test("normalizes supported file extensions and falls back to jpg", () => {
    expect(getFileExtension("brand-photo.jpeg")).toBe("jpg");
    expect(getFileExtension("brand-photo.png")).toBe("png");
    expect(getFileExtension("brand-photo")).toBe("jpg");
  });

  test("identifies storage errors that should not hard-fail the UI", () => {
    expect(isIgnorableSettingsLoadError({ status: 404 })).toBe(true);
    expect(isIgnorableSettingsLoadError({ message: "row-level security policy violation" })).toBe(
      true
    );
    expect(isIgnorableSettingsLoadError({ message: "unexpected failure" })).toBe(false);
  });
});
