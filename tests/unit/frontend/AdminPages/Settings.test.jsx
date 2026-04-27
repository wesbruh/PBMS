import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockUseAuth = jest.fn();
const mockStorageFrom = jest.fn();

jest.mock("../../../../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../../src/lib/supabaseClient", () => ({
  supabase: {
    storage: {
      from: (...args) => mockStorageFrom(...args),
    },
  },
}));

jest.mock("../../../../src/admin/components/shared/Sidebar/Sidebar", () => () => (
  <aside data-testid="sidebar" />
));

jest.mock("../../../../src/admin/components/shared/Frame/Frame", () => ({ children }) => (
  <div data-testid="frame">{children}</div>
));

import AdminSettings from "../../../../src/admin/pages/Settings/Settings.jsx";

function createStorageMocks() {
  const storageApi = {
    list: jest.fn(),
    download: jest.fn(),
    upload: jest.fn(),
    remove: jest.fn(),
  };

  mockStorageFrom.mockImplementation(() => storageApi);
  return storageApi;
}

describe("AdminSettings", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseAuth.mockReturnValue({
      user: null,
      profile: {
        first_name: "Casey",
        last_name: "Photographer",
      },
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    mockStorageFrom.mockReset();
  });

  test("falls back to profile data when logged out and blocks saving", async () => {
    const storage = createStorageMocks();

    render(<AdminSettings />);

    await screen.findByRole("heading", { name: /personal settings/i });
    expect(screen.getByLabelText(/display name/i)).toHaveValue("Casey Photographer");
    expect(storage.list).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(
      await screen.findByText(/you must be logged in to save settings/i)
    ).toBeInTheDocument();
  });

  test("falls back to the generic admin label when profile names are missing", async () => {
    createStorageMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      profile: {},
    });

    render(<AdminSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue("Admin");
    });
  });

  test("loads saved settings, validates photo selection, toggles preferences, and saves updates", async () => {
    const storage = createStorageMocks();
    const revokeSpy = jest.spyOn(URL, "revokeObjectURL");
    jest.spyOn(URL, "createObjectURL")
      .mockReturnValueOnce("blob:saved-photo")
      .mockReturnValueOnce("blob:new-photo");
    jest.spyOn(Date, "now")
      .mockReturnValueOnce(1710000000000)
      .mockReturnValueOnce(1710000005000);

    mockUseAuth.mockReturnValue({
      user: { id: "admin-1" },
      profile: {
        first_name: "Casey",
        last_name: "Photographer",
      },
    });

    storage.list.mockResolvedValue({
      data: [
        { name: "settings-1600000000000.json" },
        { name: "settings-1700000000000.json" },
      ],
      error: null,
    });
    storage.download.mockImplementation((path) => {
      if (path.includes("settings-1700000000000.json")) {
        return Promise.resolve({
          data: {
            text: async () =>
              JSON.stringify({
                displayName: "Saved Admin",
                emailNotifications: false,
                dashboardAlerts: true,
                photoPath: "admins/admin-1/profile-old.jpg",
                photoName: "profile-old.jpg",
                updatedAt: "2026-04-25T11:00:00.000Z",
              }),
          },
          error: null,
        });
      }

      if (path === "admins/admin-1/profile-old.jpg") {
        return Promise.resolve({
          data: new Blob(["old photo"], { type: "image/jpeg" }),
          error: null,
        });
      }

      return Promise.resolve({
        data: new Blob(["new photo"], { type: "image/jpeg" }),
        error: null,
      });
    });
    storage.upload.mockResolvedValue({ error: null });
    storage.remove.mockResolvedValue({ error: null });

    const { container, unmount } = render(<AdminSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue("Saved Admin");
    });
    expect(screen.getByText("profile-old.jpg")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "x".repeat(60) },
    });
    expect(
      screen.getByText(/display name must be 50 characters or fewer/i)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Updated Admin" },
    });
    fireEvent.click(screen.getByTitle(/turn on\/off emails/i));
    fireEvent.click(screen.getByTitle(/turn on\/off dashboard alerts/i));
    fireEvent.click(screen.getByRole("button", { name: /choose photo/i }));

    const fileInput = container.querySelector('input[type="file"]');

    fireEvent.change(fileInput, {
      target: {
        files: [new File(["bad"], "bad.gif", { type: "image/gif" })],
      },
    });
    expect(screen.getByText(/profile photo must be a jpg or png/i)).toBeInTheDocument();

    const bigFile = new File(["big"], "big.jpg", { type: "image/jpeg" });
    Object.defineProperty(bigFile, "size", { value: 6 * 1024 * 1024 });
    fireEvent.change(fileInput, {
      target: { files: [bigFile] },
    });
    expect(screen.getByText(/profile photo must be 5mb or smaller/i)).toBeInTheDocument();

    const validFile = new File(["small"], "portrait.png", { type: "image/png" });
    Object.defineProperty(validFile, "size", { value: 1024 });
    fireEvent.change(fileInput, {
      target: { files: [validFile] },
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(storage.upload).toHaveBeenCalledTimes(2);
    });
    expect(storage.upload).toHaveBeenCalledWith(
      "admins/admin-1/profile-1710000000000.png",
      validFile,
      expect.objectContaining({
        upsert: false,
        contentType: "image/png",
      })
    );
    expect(storage.upload).toHaveBeenCalledWith(
      "admins/admin-1/settings-1710000005000.json",
      expect.any(Blob),
      expect.objectContaining({
        contentType: "application/json",
      })
    );
    expect(storage.remove).toHaveBeenCalledWith(["admins/admin-1/profile-old.jpg"]);
    expect(storage.remove).toHaveBeenCalledWith([
      "admins/admin-1/settings-1700000000000.json",
    ]);
    expect(
      await screen.findByText(/personal settings saved successfully/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("portrait.png")).toBeInTheDocument();
    });

    unmount();
    expect(revokeSpy).toHaveBeenCalled();
  });

  test("surfaces load and parse failures", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockUseAuth.mockReturnValue({
      user: { id: "admin-2" },
      profile: {
        first_name: "Jamie",
        last_name: "Editor",
      },
    });

    let storage = createStorageMocks();
    storage.list.mockResolvedValue({
      data: null,
      error: { message: "unexpected failure" },
    });

    const { unmount } = render(<AdminSettings />);
    expect(
      await screen.findByText(/could not load your saved settings/i)
    ).toBeInTheDocument();
    unmount();

    storage = createStorageMocks();
    storage.list.mockResolvedValue({
      data: [{ name: "settings-1700000000000.json" }],
      error: null,
    });
    storage.download.mockResolvedValueOnce({
      data: {
        text: async () => "not-json",
      },
      error: null,
    });

    render(<AdminSettings />);
    expect(
      await screen.findByText(/could not parse your saved settings/i)
    ).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalledWith(
      "Could not parse saved settings:",
      expect.any(Error)
    );
  });

  test("falls back cleanly when no saved settings file exists and when the settings file cannot be downloaded", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "admin-3" },
      profile: {
        first_name: "Morgan",
        last_name: "Studio",
      },
    });

    let storage = createStorageMocks();
    storage.list.mockResolvedValue({
      data: [{ name: "notes.txt" }],
      error: null,
    });

    const { unmount } = render(<AdminSettings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue("Morgan Studio");
    });
    expect(screen.getByText(/jpg\/png, maximum 5mb/i)).toBeInTheDocument();
    unmount();

    storage = createStorageMocks();
    storage.list.mockResolvedValue({
      data: [{ name: "settings-1700000000000.json" }],
      error: null,
    });
    storage.download.mockResolvedValue({
      data: null,
      error: { message: "broken download" },
    });

    render(<AdminSettings />);
    expect(
      await screen.findByText(/could not load your saved settings/i)
    ).toBeInTheDocument();
  });

  test("treats ignorable storage load failures as empty settings and handles blank saved payloads", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "admin-7" },
      profile: {
        first_name: "",
        last_name: "",
      },
    });

    let storage = createStorageMocks();
    storage.list.mockResolvedValue({
      data: null,
      error: { status: 404, message: "not found" },
    });

    const firstRender = render(<AdminSettings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue("Admin");
    });
    expect(screen.queryByText(/could not load your saved settings/i)).not.toBeInTheDocument();
    firstRender.unmount();

    storage = createStorageMocks();
    storage.list.mockResolvedValue({
      data: null,
      error: null,
    });
    storage.download.mockResolvedValue({
      data: {
        text: async () => "",
      },
      error: null,
    });

    render(<AdminSettings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue("Admin");
    });
  });

  test("treats ignorable settings download failures as empty settings", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "admin-8" },
      profile: {
        first_name: "Sky",
        last_name: "",
      },
    });

    const storage = createStorageMocks();
    storage.list.mockResolvedValue({
      data: [{ name: "settings-1700000000000.json" }],
      error: null,
    });
    storage.download.mockResolvedValue({
      data: null,
      error: { statusCode: 404, message: "missing settings" },
    });

    render(<AdminSettings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue("Sky");
    });
    expect(screen.queryByText(/could not load your saved settings/i)).not.toBeInTheDocument();
  });

  test("loads settings without a saved photo and validates blank or oversized display names before saving", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "admin-4" },
      profile: {
        first_name: "Robin",
        last_name: "Manager",
      },
    });

    const storage = createStorageMocks();
    storage.list.mockResolvedValue({
      data: [{ name: "settings-1700000000000.json" }],
      error: null,
    });
    storage.download.mockResolvedValue({
      data: {
        text: async () =>
          JSON.stringify({
            displayName: "",
            emailNotifications: undefined,
            dashboardAlerts: undefined,
            photoPath: "",
            photoName: "",
          }),
      },
      error: null,
    });

    render(<AdminSettings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue("Robin Manager");
    });

    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(screen.getByText(/display name is required/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Robin Manager" },
    });
    fireEvent.click(screen.getByTitle(/turn on\/off emails/i));
    expect(screen.getByTitle(/turn on\/off emails/i)).toHaveAttribute("aria-pressed", "false");
  });

  test("surfaces save-time upload errors and warns when old files cannot be removed", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(URL, "createObjectURL")
      .mockReturnValueOnce("blob:saved-photo")
      .mockReturnValueOnce("blob:preview-photo")
      .mockReturnValueOnce("blob:persisted-photo");
    jest.spyOn(Date, "now")
      .mockReturnValueOnce(1710000010000)
      .mockReturnValueOnce(1710000015000);

    mockUseAuth.mockReturnValue({
      user: { id: "admin-5" },
      profile: {
        first_name: "Taylor",
        last_name: "Admin",
      },
    });

    let storage = createStorageMocks();
    storage.list.mockResolvedValue({
      data: [{ name: "settings-1700000000000.json" }],
      error: null,
    });
    storage.download.mockImplementation((path) => {
      if (path.includes("settings-1700000000000.json")) {
        return Promise.resolve({
          data: {
            text: async () =>
              JSON.stringify({
                displayName: "Taylor Admin",
                emailNotifications: true,
                dashboardAlerts: true,
                photoPath: "admins/admin-5/profile-old.jpg",
                photoName: "profile-old.jpg",
              }),
          },
          error: null,
        });
      }

      return Promise.resolve({
        data: new Blob(["photo"], { type: "image/jpeg" }),
        error: null,
      });
    });
    storage.upload.mockResolvedValueOnce({
      error: { message: "upload exploded" },
    });

    const { container, unmount } = render(<AdminSettings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue("Taylor Admin");
    });

    const fileInput = container.querySelector('input[type="file"]');
    const firstFile = new File(["one"], "first.jpg", { type: "image/jpeg" });
    Object.defineProperty(firstFile, "size", { value: 1024 });
    const secondFile = new File(["two"], "second.jpg", { type: "image/jpeg" });
    Object.defineProperty(secondFile, "size", { value: 1024 });

    fireEvent.change(fileInput, { target: { files: [firstFile] } });
    fireEvent.change(fileInput, { target: { files: [secondFile] } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/upload exploded/i)).toBeInTheDocument();
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "Error saving admin settings:",
      expect.any(Error)
    );
    unmount();

    storage = createStorageMocks();
    storage.list.mockResolvedValue({
      data: [{ name: "settings-1700000000000.json" }],
      error: null,
    });
    storage.download.mockImplementation((path) => {
      if (path.includes("settings-1700000000000.json")) {
        return Promise.resolve({
          data: {
            text: async () =>
              JSON.stringify({
                displayName: "Taylor Admin",
                emailNotifications: true,
                dashboardAlerts: true,
                photoPath: "admins/admin-5/profile-old.jpg",
                photoName: "profile-old.jpg",
              }),
          },
          error: null,
        });
      }

      return Promise.resolve({
        data: new Blob(["photo"], { type: "image/jpeg" }),
        error: null,
      });
    });
    storage.upload.mockResolvedValue({ error: null });
    storage.remove
      .mockResolvedValueOnce({ error: { message: "old photo locked" } })
      .mockResolvedValueOnce({ error: { message: "old settings locked" } });

    render(<AdminSettings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue("Taylor Admin");
    });

    const retryFileInput = document.querySelector('input[type="file"]');
    const retryFile = new File(["retry"], "retry.jpg", { type: "image/jpeg" });
    Object.defineProperty(retryFile, "size", { value: 1024 });
    fireEvent.change(retryFileInput, { target: { files: [retryFile] } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/personal settings saved successfully/i)).toBeInTheDocument();
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "Could not remove previous profile photo:",
      "old photo locked"
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "Could not remove previous settings file:",
      "old settings locked"
    );
  });

  test("prevents saving an oversized persisted display name and reports downstream save failures", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(URL, "createObjectURL").mockReturnValue("blob:persisted-photo");
    jest.spyOn(Date, "now")
      .mockReturnValueOnce(1710000020000)
      .mockReturnValueOnce(1710000025000);

    mockUseAuth.mockReturnValue({
      user: { id: "admin-6" },
      profile: {
        first_name: "Jordan",
        last_name: "Director",
      },
    });

    let storage = createStorageMocks();
    storage.list.mockResolvedValue({
      data: [{ name: "settings-1700000000000.json" }],
      error: null,
    });
    storage.download.mockResolvedValue({
      data: {
        text: async () =>
          JSON.stringify({
            displayName: "x".repeat(55),
            emailNotifications: true,
            dashboardAlerts: true,
            photoPath: "",
            photoName: "",
          }),
      },
      error: null,
    });

    let rendered = render(<AdminSettings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue("x".repeat(55));
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(
      screen.getByText(/display name must be 50 characters or fewer/i)
    ).toBeInTheDocument();
    rendered.unmount();

    storage = createStorageMocks();
    storage.list.mockResolvedValue({
      data: [{ name: "settings-1700000000000.json" }],
      error: null,
    });
    storage.download.mockImplementation((path) => {
      if (path.includes("settings-1700000000000.json")) {
        return Promise.resolve({
          data: {
            text: async () =>
              JSON.stringify({
                displayName: "Jordan Director",
                emailNotifications: true,
                dashboardAlerts: true,
                photoPath: "",
                photoName: "",
              }),
          },
          error: null,
        });
      }

      return Promise.resolve({
        data: null,
        error: { message: "photo missing" },
      });
    });
    storage.upload.mockResolvedValue({ error: null });

    rendered = render(<AdminSettings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue("Jordan Director");
    });
    const fileInput = rendered.container.querySelector('input[type="file"]');
    const validFile = new File(["small"], "portrait.jpg", { type: "image/jpeg" });
    Object.defineProperty(validFile, "size", { value: 1024 });
    fireEvent.change(fileInput, {
      target: { files: [validFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => {
      expect(screen.getByText(/photo missing/i)).toBeInTheDocument();
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "Error saving admin settings:",
      expect.any(Error)
    );

    rendered.unmount();
    storage = createStorageMocks();
    storage.list.mockResolvedValue({
      data: [{ name: "settings-1700000000000.json" }],
      error: null,
    });
    storage.download.mockResolvedValue({
      data: {
        text: async () =>
          JSON.stringify({
            displayName: "Jordan Director",
            emailNotifications: true,
            dashboardAlerts: true,
            photoPath: "",
            photoName: "",
          }),
      },
      error: null,
    });
    storage.upload.mockResolvedValueOnce({ error: { message: "settings write failed" } });

    render(<AdminSettings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue("Jordan Director");
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => {
      expect(screen.getByText(/settings write failed/i)).toBeInTheDocument();
    });
  });

  test("uses fallback save error messages when storage failures omit a message", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(Date, "now")
      .mockReturnValueOnce(1710000030000)
      .mockReturnValueOnce(1710000035000);

    mockUseAuth.mockReturnValue({
      user: { id: "admin-9" },
      profile: {
        first_name: "Quinn",
        last_name: "Ops",
      },
    });

    let storage = createStorageMocks();
    storage.list.mockResolvedValue({
      data: [{ name: "settings-1700000000000.json" }],
      error: null,
    });
    storage.download.mockResolvedValue({
      data: {
        text: async () =>
          JSON.stringify({
            displayName: "Quinn Ops",
            emailNotifications: true,
            dashboardAlerts: true,
            photoPath: "",
            photoName: "",
          }),
      },
      error: null,
    });
    storage.upload.mockResolvedValueOnce({ error: {} });

    let rendered = render(<AdminSettings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue("Quinn Ops");
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByText(/could not save settings/i)).toBeInTheDocument();
    rendered.unmount();

    storage = createStorageMocks();
    storage.list.mockResolvedValue({
      data: [{ name: "settings-1700000000000.json" }],
      error: null,
    });
    storage.download.mockImplementation((path) => {
      if (path.includes("settings-1700000000000.json")) {
        return Promise.resolve({
          data: {
            text: async () =>
              JSON.stringify({
                displayName: "Quinn Ops",
                emailNotifications: true,
                dashboardAlerts: true,
                photoPath: "",
                photoName: "",
              }),
          },
          error: null,
        });
      }

      return Promise.resolve({
        data: new Blob(["saved photo"], { type: "image/jpeg" }),
        error: {},
      });
    });
    storage.upload.mockResolvedValue({ error: null });

    rendered = render(<AdminSettings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue("Quinn Ops");
    });

    const fileInput = rendered.container.querySelector('input[type="file"]');
    const validFile = new File(["small"], "portrait.jpg", { type: "image/jpeg" });
    Object.defineProperty(validFile, "size", { value: 1024 });
    fireEvent.change(fileInput, {
      target: { files: [validFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      await screen.findByText(/could not load uploaded profile photo/i)
    ).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalled();
  });
});
