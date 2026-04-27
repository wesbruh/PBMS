import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";

// mock supabaseClient to avoid import.meta parse error.
// this is different from backend tests since the actual file uses a supabase call
// and not a fetch(). jest intercepts the import and swaps in the fake object instead.
jest.mock("../../../../src/lib/supabaseClient.js", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// mock css import since this file uses its own css and not tailwind
jest.mock(
  "../../../../src/admin/pages/Galleries/UploadGalleryModal.css",
  () => {},
);

// mock AuthContext so the component receives a fake admin profile
// without needing a real auth provider wrapping the component
const mockProfile = { roleName: "Admin" };
jest.mock("../../../../src/context/AuthContext.jsx", () => ({
  useAuth: () => ({ profile: mockProfile }),
}));

// mock AdminNotificationToast so we can verify it gets called
// after a successful upload without rendering the real toast
const mockTriggerToast = jest.fn();
jest.mock("../../../../src/components/AdminNotificationToast.jsx", () => ({
  triggerAdminToast: (...args) => mockTriggerToast(...args),
}));

// mock all lucide-react icons used by the component with simple
// span elements that have test ids for easy querying
jest.mock("lucide-react", () => ({
  X: () => <span data-testid="icon-x" />,
  Upload: () => <span data-testid="icon-upload" />,
  ImagePlus: () => <span data-testid="icon-image-plus" />,
  Image: () => <span data-testid="icon-image" />,
  Trash2: () => <span data-testid="icon-trash" />,
  CheckCircle: () => <span data-testid="icon-check" />,
  FolderOpen: () => <span data-testid="icon-folder" />,
  Star: () => <span data-testid="icon-star" />,
}));

const { supabase } = require("../../../../src/lib/supabaseClient.js");

import UploadGalleryModal from "../../../../src/admin/pages/Galleries/UploadGalleryModal.jsx";

// default props passed to every test render unless overridden.
// simulates an open modal for a specific session with callbacks.
const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  session: {
    id: "session-uuid-123",
    clientName: "Test Man",
    type: "Testing Type",
    date: "2026-04-26",
  },
  onUploadSuccess: jest.fn(),
};

// creates a fake file object with a given name, size in bytes, and MIME type.
// used to simulate file selection without needing real image files.
function createMockFile(name, size, type) {
  const content = new ArrayBuffer(size);
  return new File([content], name, { type });
}

// replaces the global FileReader with a mock that synchronously triggers
// onloadend with fake base64 data. returns a cleanup function that
// restores the original FileReader when called.
function mockFileReader() {
  const original = global.FileReader;
  const mock = jest.fn().mockImplementation(() => ({
    readAsDataURL: jest.fn(function () {
      setTimeout(() => {
        this.result = "data:image/jpeg;base64,fakedata";
        this.onloadend();
      }, 0);
    }),
    onloadend: null,
  }));
  global.FileReader = mock;
  return () => {
    global.FileReader = original;
  };
}

// builds a fake supabase query builder for from() calls.
// each method returns the builder for chaining, and single/maybeSingle
// resolve with the provided data and error values.
function mockQueryBuilder(result = {}) {
  const builder = {
    select: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    single: jest.fn().mockResolvedValue({
      data: result.data ?? null,
      error: result.error ?? null,
    }),
    maybeSingle: jest.fn().mockResolvedValue({
      data: result.data ?? null,
      error: result.error ?? null,
    }),
  };
  return builder;
}

// reset all mocks before each test and enable fake timers.
// supabase.storage must be reinitialized because clearAllMocks wipes it.
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  supabase.storage = { from: jest.fn() };
});

// restore real timers after each test to avoid leaking into other suites
afterEach(() => {
  jest.useRealTimers();
});

// 56 TESTS //
describe("UploadGalleryModal Admin Component Tests", () => {
  // verifies the component returns nothing when the modal is closed
  test("1. returns null when isOpen is false", () => {
    const { container } = render(
      <UploadGalleryModal {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  // verifies the modal renders its header with the session client name and type
  test("2. renders modal with header and session info", () => {
    render(<UploadGalleryModal {...defaultProps} />);

    expect(screen.getByText("Upload Gallery")).toBeInTheDocument();
    expect(screen.getByText(/Test Man - Testing Type/)).toBeInTheDocument();
    expect(
      screen.getByText(/Client will be automatically notified/),
    ).toBeInTheDocument();
  });

  // verifies both upload option buttons are visible in the modal body
  test("3. shows select photos and select folder buttons", () => {
    render(<UploadGalleryModal {...defaultProps} />);

    expect(screen.getByText("Select Individual Photos")).toBeInTheDocument();
    expect(screen.getByText("Select Folder")).toBeInTheDocument();
  });

  // verifies the drag-and-drop zone renders with instructions and accepted formats
  test("4. shows drag and drop zone", () => {
    render(<UploadGalleryModal {...defaultProps} />);

    expect(
      screen.getByText("Or drag and drop images here"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Accepted formats: JPG, PNG, HEIC/),
    ).toBeInTheDocument();
  });

  // verifies the personalized message textarea renders with placeholder and initial count
  test("5. renders personalized message textarea", () => {
    render(<UploadGalleryModal {...defaultProps} />);

    expect(screen.getByText("Personalized Message")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Add a personal note for Test Man/),
    ).toBeInTheDocument();
    expect(screen.getByText("0 / 1000")).toBeInTheDocument();
  });

  // verifies the character counter updates as the user types in the message field
  test("6. updates character count when typing a message", () => {
    render(<UploadGalleryModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      /Add a personal note for Test Man/,
    );
    fireEvent.change(textarea, { target: { value: "Hello Jane!" } });

    expect(screen.getByText("11 / 1000")).toBeInTheDocument();
  });

  // verifies that exceeding the 1000 character limit shows a validation error
  test("7. shows error when message exceeds 1000 characters", () => {
    render(<UploadGalleryModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      /Add a personal note for Test Man/,
    );
    const longMessage = "a".repeat(1001);
    fireEvent.change(textarea, { target: { value: longMessage } });

    expect(
      screen.getByText(/cannot exceed 1000 characters/),
    ).toBeInTheDocument();
  });

  // verifies that selecting a non-image file (pdf) shows an invalid type error
  test("8. shows error for invalid file types", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const invalidFile = createMockFile("document.pdf", 1024, "application/pdf");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [invalidFile] } });
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          /Invalid file type. Only JPG, PNG, and HEIC are allowed./,
        ),
      ).toBeInTheDocument();
    });

    restoreReader();
  });

  // verifies that a single file larger than 50MB is rejected with an error
  test("9. shows error for files exceeding 50MB", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const largeFile = createMockFile(
      "huge.jpg",
      51 * 1024 * 1024,
      "image/jpeg",
    );
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [largeFile] } });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/File too large. Maximum size per image is 50MB./),
      ).toBeInTheDocument();
    });

    restoreReader();
  });

  // verifies that a valid image file generates a preview with filename visible
  test("10. shows preview for valid image files", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const validFile = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("Selected Images (1)")).toBeInTheDocument();
      expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    });

    restoreReader();
  });

  // verifies that clicking the trash icon on a preview removes the file from selection
  test("11. removes file when clicking the trash button", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const validFile = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    });

    // click the remove button on the preview card
    const removeBtn = document.querySelector(".preview-remove-btn");
    fireEvent.click(removeBtn);

    expect(screen.queryByText("photo.jpg")).not.toBeInTheDocument();
  });

  // verifies the upload button is disabled when no files have been selected
  test("12. upload button is disabled when no files are selected", () => {
    render(<UploadGalleryModal {...defaultProps} />);

    const uploadBtn = screen.getByText("Upload 0 Images");
    expect(uploadBtn).toBeDisabled();
  });

  // verifies the upload button becomes enabled after selecting a valid file
  test("13. upload button is enabled when files are selected", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const validFile = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      const uploadBtn = screen.getByText("Upload 1 Image");
      expect(uploadBtn).not.toBeDisabled();
    });

    restoreReader();
  });

  // verifies clicking the overlay background closes the modal and calls onClose
  test("14. calls onClose when clicking the overlay", () => {
    const onClose = jest.fn();
    render(<UploadGalleryModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(document.querySelector(".modal-overlay"));

    expect(onClose).toHaveBeenCalled();
  });

  // verifies clicking the X button in the header closes the modal
  test("15. calls onClose when clicking the X button", () => {
    const onClose = jest.fn();
    render(<UploadGalleryModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(document.querySelector(".modal-close-button"));

    expect(onClose).toHaveBeenCalled();
  });

  // verifies the drop zone gets the active class when a file is dragged over it
  test("16. activates drop zone on drag enter", () => {
    render(<UploadGalleryModal {...defaultProps} />);

    const dropZone = document.querySelector(".upload-zone");
    fireEvent.dragEnter(dropZone, { dataTransfer: { items: [] } });

    expect(dropZone.classList.contains("upload-zone--active")).toBe(true);
  });

  // verifies the drop zone loses the active class when the drag leaves
  test("17. deactivates drop zone on drag leave", () => {
    render(<UploadGalleryModal {...defaultProps} />);

    const dropZone = document.querySelector(".upload-zone");
    fireEvent.dragEnter(dropZone, { dataTransfer: { items: [] } });
    expect(dropZone.classList.contains("upload-zone--active")).toBe(true);

    fireEvent.dragLeave(dropZone, { dataTransfer: { items: [] } });
    expect(dropZone.classList.contains("upload-zone--active")).toBe(false);
  });

  // verifies clicking the star button on a preview card marks it as the cover photo
  test("18. sets cover photo when clicking star button", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const validFile = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    });

    // click the star to set as cover
    const starBtn = document.querySelector(".preview-cover-btn");
    fireEvent.click(starBtn);

    expect(screen.getByText("Cover Photo")).toBeInTheDocument();
  });

  // verifies clicking the star button again removes the cover photo selection
  test("19. deselects cover photo when clicking star button again", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const validFile = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    });

    const starBtn = document.querySelector(".preview-cover-btn");
    fireEvent.click(starBtn);
    expect(screen.getByText("Cover Photo")).toBeInTheDocument();

    // click again to toggle off
    fireEvent.click(starBtn);
    expect(screen.queryByText("Cover Photo")).not.toBeInTheDocument();

    restoreReader();
  });

  // verifies the button says "Image" (singular) when exactly one file is selected
  test("20. shows singular text for single file upload", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const validFile = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("Upload 1 Image")).toBeInTheDocument();
    });

    restoreReader();
  });

  // verifies the button says "Images" (plural) when multiple files are selected
  test("21. shows plural text for multiple file upload", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const files = [
      createMockFile("photo1.jpg", 1024 * 1024, "image/jpeg"),
      createMockFile("photo2.jpg", 1024 * 1024, "image/jpeg"),
    ];
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("Upload 2 Images")).toBeInTheDocument();
    });

    restoreReader();
  });

  // verifies the size indicator bar appears showing usage against the 300MB limit
  test("22. shows size indicator after selecting files", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const validFile = createMockFile(
      "photo.jpg",
      2 * 1024 * 1024,
      "image/jpeg",
    );
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText(/300 MB/)).toBeInTheDocument();
    });

    restoreReader();
  });

  // verifies that clicking upload with a null profile shows a login error.
  // temporarily overrides the useAuth mock to return null profile.
  test("23. shows error when profile is null during upload", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const restoreReader = mockFileReader();

    const origProfile = mockProfile.roleName;
    Object.defineProperty(mockProfile, "roleName", {
      value: "Admin",
      writable: true,
    });
    // remove profile entirely to simulate logged-out state
    const authMod = require("../../../../src/context/AuthContext.jsx");
    const origUseAuth = authMod.useAuth;
    authMod.useAuth = () => ({ profile: null });

    render(<UploadGalleryModal {...defaultProps} />);

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText(/Upload 1 Image/)).toBeInTheDocument();
    });

    const uploadBtn = screen.getByText(/Upload 1 Image/);
    await act(async () => {
      fireEvent.click(uploadBtn);
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText(/must be logged in/)).toBeInTheDocument();
    });

    // restore original auth mock
    authMod.useAuth = origUseAuth;
    mockProfile.roleName = origProfile;
    restoreReader();
    console.error.mockRestore();
  });

  // verifies that selecting files whose combined size exceeds 300MB shows an error.
  // uses 7 files at 45MB each = 315MB which is over the limit.
  test("24. shows error when total file size exceeds 300MB", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const files = Array.from({ length: 7 }, (_, i) =>
      createMockFile(`photo${i}.jpg`, 45 * 1024 * 1024, "image/jpeg"),
    );

    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Total file size exceeds the 300MB limit/),
      ).toBeInTheDocument();
    });

    restoreReader();
  });

  // verifies that removing the file marked as cover clears the cover selection
  test("25. clears cover photo selection when cover file is removed", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const files = [
      createMockFile("photo1.jpg", 1024 * 1024, "image/jpeg"),
      createMockFile("photo2.jpg", 1024 * 1024, "image/jpeg"),
    ];
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("photo1.jpg")).toBeInTheDocument();
    });

    // set first photo as cover then remove it
    const starBtns = document.querySelectorAll(".preview-cover-btn");
    fireEvent.click(starBtns[0]);
    expect(screen.getByText("Cover Photo")).toBeInTheDocument();

    const removeBtns = document.querySelectorAll(".preview-remove-btn");
    fireEvent.click(removeBtns[0]);

    expect(screen.queryByText("Cover Photo")).not.toBeInTheDocument();

    restoreReader();
  });

  // verifies that removing a file above the cover photo adjusts the cover index
  // so the badge stays on the correct photo after the array shifts
  test("26. adjusts cover photo index when a file above it is removed", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const files = [
      createMockFile("photo1.jpg", 1024 * 1024, "image/jpeg"),
      createMockFile("photo2.jpg", 1024 * 1024, "image/jpeg"),
      createMockFile("photo3.jpg", 1024 * 1024, "image/jpeg"),
    ];
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("photo3.jpg")).toBeInTheDocument();
    });

    // set third photo as cover (index 2), then remove first photo.
    // cover index should shift from 2 to 1 to stay on photo3.
    const starBtns = document.querySelectorAll(".preview-cover-btn");
    fireEvent.click(starBtns[2]);
    expect(screen.getByText("Cover Photo")).toBeInTheDocument();

    const removeBtns = document.querySelectorAll(".preview-remove-btn");
    fireEvent.click(removeBtns[0]);

    expect(screen.getByText("Cover Photo")).toBeInTheDocument();
    expect(screen.getByText("photo3.jpg")).toBeInTheDocument();

    restoreReader();
  });

  // verifies the cancel button shows "Cancel" text when no upload is in progress
  test("27. shows Cancel text when not uploading", () => {
    render(<UploadGalleryModal {...defaultProps} />);

    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  // verifies the cover photo hint text appears when files are selected and not uploading
  test("28. shows cover photo hint when files selected and not uploading", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const validFile = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Click the star on any image/),
      ).toBeInTheDocument();
    });

    restoreReader();
  });

  // verifies the full upload flow when a gallery already exists for the session.
  // mocks supabase storage upload, gallery lookup (returns existing), session
  // lookup, notification insert, and image dimension detection.
  test("29. uploads files successfully when gallery already exists", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    const restoreReader = mockFileReader();
    const onUploadSuccess = jest.fn();

    // mock storage upload and signed url generation
    supabase.storage.from.mockReturnValue({
      upload: jest
        .fn()
        .mockResolvedValue({ data: { path: "test-path" }, error: null }),
      createSignedUrl: jest
        .fn()
        .mockResolvedValue({ data: { signedUrl: "https://signed-url.com" } }),
    });

    // all from() calls return a builder with an existing gallery id
    // and a session with client email for the notification flow
    supabase.from.mockImplementation((table) => {
      const builder = {
        select: jest.fn(() => builder),
        insert: jest.fn(() => builder),
        update: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "gallery-uuid-existing" },
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: {
            client_id: "client-uuid-1",
            User: { email: "jane@test.com" },
          },
          error: null,
        }),
      };
      return builder;
    });

    render(
      <UploadGalleryModal
        {...defaultProps}
        onUploadSuccess={onUploadSuccess}
      />,
    );

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText(/Upload 1 Image/)).toBeInTheDocument();
    });

    // mock the Image constructor for dimension detection during upload
    const origImage = global.Image;
    global.Image = class {
      constructor() {
        setTimeout(() => this.onload && this.onload(), 0);
      }
      set src(_) {}
      get width() {
        return 800;
      }
      get height() {
        return 600;
      }
    };

    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
    });

    // flush all pending promises and timers to complete the async upload chain
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        jest.runAllTimers();
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(onUploadSuccess).toHaveBeenCalled();
    });

    global.Image = origImage;
    restoreReader();
    console.log.mockRestore();
    console.error.mockRestore();
  });

  // verifies the upload flow creates a new gallery when none exists.
  // the first maybeSingle returns null (no existing gallery), then
  // single returns a new gallery id for the insert path.
  test("30. creates new gallery when none exists for the session", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    const restoreReader = mockFileReader();
    const onUploadSuccess = jest.fn();

    supabase.storage.from.mockReturnValue({
      upload: jest
        .fn()
        .mockResolvedValue({ data: { path: "test-path" }, error: null }),
    });

    let fromCallCount = 0;
    supabase.from.mockImplementation((table) => {
      fromCallCount++;
      const builder = {
        select: jest.fn(() => builder),
        insert: jest.fn(() => builder),
        update: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        // no existing gallery found
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        // first single call returns new gallery id, later calls return session data
        single: jest.fn().mockResolvedValue({
          data:
            fromCallCount <= 2
              ? { id: "gallery-uuid-new" }
              : {
                  client_id: "client-uuid-1",
                  User: { email: "jane@test.com" },
                },
          error: null,
        }),
      };
      return builder;
    });

    render(
      <UploadGalleryModal
        {...defaultProps}
        onUploadSuccess={onUploadSuccess}
      />,
    );

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    const origImage = global.Image;
    global.Image = class {
      constructor() {
        setTimeout(() => this.onload && this.onload(), 0);
      }
      set src(_) {}
      get width() {
        return 800;
      }
      get height() {
        return 600;
      }
    };

    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
    });

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        jest.runAllTimers();
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(onUploadSuccess).toHaveBeenCalled();
    });

    global.Image = origImage;
    restoreReader();
    console.log.mockRestore();
    console.error.mockRestore();
  });

  // verifies that a non-admin user gets blocked from uploading.
  // temporarily sets the mock profile role to "Client".
  test("31. shows error when user is not admin", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const restoreReader = mockFileReader();

    mockProfile.roleName = "Client";

    render(<UploadGalleryModal {...defaultProps} />);

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Only admins can upload galleries/),
      ).toBeInTheDocument();
    });

    // restore admin role for subsequent tests
    mockProfile.roleName = "Admin";
    restoreReader();
    console.error.mockRestore();
  });

  // verifies that a supabase error when fetching the gallery shows an error message.
  // uses a non-PGRST116 error code so the error is thrown rather than ignored.
  test("32. shows error when gallery fetch fails during upload", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const restoreReader = mockFileReader();

    supabase.from.mockImplementation(() => {
      const builder = {
        select: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "SOME_ERROR", message: "Gallery fetch failed" },
        }),
      };
      return builder;
    });

    render(<UploadGalleryModal {...defaultProps} />);

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
      jest.runAllTimers();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText(/Gallery fetch failed/)).toBeInTheDocument();
    });

    restoreReader();
    console.error.mockRestore();
  });

  // verifies the drag-and-drop fallback path when dataTransfer.items is null.
  // falls back to using dataTransfer.files directly.
  test("33. handles file drop via drag and drop", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const dropZone = document.querySelector(".upload-zone");
    const validFile = createMockFile("dropped.jpg", 1024, "image/jpeg");

    await act(async () => {
      fireEvent.drop(dropZone, {
        dataTransfer: {
          items: null,
          files: [validFile],
        },
      });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("dropped.jpg")).toBeInTheDocument();
    });

    restoreReader();
  });

  // verifies that selecting files through the folder input works the same
  // as the regular file input by going through handleFolderSelect
  test("34. handles folder selection via folder input", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const folderInput = document.querySelector("input[webkitdirectory]");
    const validFile = createMockFile("folder-photo.jpg", 1024, "image/jpeg");

    await act(async () => {
      fireEvent.change(folderInput, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("folder-photo.jpg")).toBeInTheDocument();
    });

    restoreReader();
  });

  // verifies that clicking cancel during an active upload sets the cancelled state.
  // the upload mock never resolves so the upload stays in progress until cancelled.
  test("35. cancels upload when cancel button is clicked during upload", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
    const restoreReader = mockFileReader();

    // upload never resolves so we can test the cancel mid-upload
    supabase.storage.from.mockReturnValue({
      upload: jest.fn(() => new Promise(() => {})),
    });

    supabase.from.mockImplementation(() => {
      const builder = {
        select: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "gallery-uuid-1" },
          error: null,
        }),
      };
      return builder;
    });

    render(<UploadGalleryModal {...defaultProps} />);

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    // start upload then immediately click cancel
    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Cancel Upload"));
    });

    await waitFor(() => {
      expect(screen.getByText(/Upload cancelled/)).toBeInTheDocument();
    });

    restoreReader();
    console.error.mockRestore();
    console.log.mockRestore();
  });

  // verifies that a notification insert failure is logged but does not
  // prevent the upload from completing successfully
  test("36. logs error when notification insert fails but upload still succeeds", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    const restoreReader = mockFileReader();
    const onUploadSuccess = jest.fn();

    supabase.storage.from.mockReturnValue({
      upload: jest
        .fn()
        .mockResolvedValue({ data: { path: "test-path" }, error: null }),
    });

    supabase.from.mockImplementation((table) => {
      const builder = {
        select: jest.fn(() => builder),
        insert: jest.fn(() => builder),
        update: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "gallery-uuid-1" },
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: {
            client_id: "client-uuid-1",
            User: { email: "jane@test.com" },
          },
          error: null,
        }),
      };
      // when the Notification table is queried, return an error on insert
      if (table === "Notification") {
        builder.insert = jest.fn(() => ({
          ...builder,
          data: null,
          error: { message: "Notification failed" },
        }));
      }
      return builder;
    });

    const origImage = global.Image;
    global.Image = class {
      constructor() {
        setTimeout(() => this.onload && this.onload(), 0);
      }
      set src(_) {}
      get width() {
        return 800;
      }
      get height() {
        return 600;
      }
    };

    render(
      <UploadGalleryModal
        {...defaultProps}
        onUploadSuccess={onUploadSuccess}
      />,
    );

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
      jest.runAllTimers();
      await Promise.resolve();
      jest.runAllTimers();
      await Promise.resolve();
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Notification insert failed"),
        expect.anything(),
      );
    });

    global.Image = origImage;
    restoreReader();
    console.log.mockRestore();
    console.error.mockRestore();
  });

  // verifies that when the session has no client_id, the notification
  // insert is skipped and a warning is logged instead
  test("37. skips notification when client_id is missing", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    const restoreReader = mockFileReader();
    const onUploadSuccess = jest.fn();

    supabase.storage.from.mockReturnValue({
      upload: jest
        .fn()
        .mockResolvedValue({ data: { path: "test-path" }, error: null }),
    });

    supabase.from.mockImplementation(() => {
      const builder = {
        select: jest.fn(() => builder),
        insert: jest.fn(() => builder),
        update: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "gallery-uuid-1" },
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: { client_id: null, User: { email: "jane@test.com" } },
          error: null,
        }),
      };
      return builder;
    });

    const origImage = global.Image;
    global.Image = class {
      constructor() {
        setTimeout(() => this.onload && this.onload(), 0);
      }
      set src(_) {}
      get width() {
        return 800;
      }
      get height() {
        return 600;
      }
    };

    render(
      <UploadGalleryModal
        {...defaultProps}
        onUploadSuccess={onUploadSuccess}
      />,
    );

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
      jest.runAllTimers();
      await Promise.resolve();
      jest.runAllTimers();
      await Promise.resolve();
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Skipping notification"),
        expect.anything(),
      );
    });

    global.Image = origImage;
    restoreReader();
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  // verifies that clicking the "Select Individual Photos" button triggers a
  // click on the hidden file input element via the ref
  test("38. clicking Select Individual Photos triggers file input", () => {
    render(<UploadGalleryModal {...defaultProps} />);

    const fileInput = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );
    const clickSpy = jest.spyOn(fileInput, "click");

    fireEvent.click(screen.getByText("Select Individual Photos"));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  // verifies that clicking the "Select Folder" button triggers a click on
  // the hidden folder input element via the ref
  test("39. clicking Select Folder triggers folder input", () => {
    render(<UploadGalleryModal {...defaultProps} />);

    const folderInput = document.querySelector("input[webkitdirectory]");
    const clickSpy = jest.spyOn(folderInput, "click");

    fireEvent.click(screen.getByText("Select Folder"));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  // verifies drag-and-drop using the webkitGetAsEntry path for a single file.
  // simulates a dropped file entry that the traverseFileTree function processes.
  test("40. handles drag and drop with folder entries", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const dropZone = document.querySelector(".upload-zone");
    const mockFile = createMockFile("dragged.jpg", 1024, "image/jpeg");

    // simulate a dropped file with webkitGetAsEntry returning an isFile entry
    const mockEntry = {
      isFile: true,
      isDirectory: false,
      file: (cb) => cb(mockFile),
    };

    const mockItems = {
      length: 1,
      0: { webkitGetAsEntry: () => mockEntry },
    };

    await act(async () => {
      fireEvent.drop(dropZone, {
        dataTransfer: { items: mockItems },
      });
      jest.runAllTimers();
      await Promise.resolve();
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("dragged.jpg")).toBeInTheDocument();
    });

    restoreReader();
  });

  // verifies drag-and-drop with a directory entry that contains files.
  // the traverseFileTree function recursively reads the directory entries.
  test("41. handles drag and drop with directory containing files", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const dropZone = document.querySelector(".upload-zone");
    const mockFile = createMockFile("nested.jpg", 1024, "image/jpeg");

    // create a mock directory entry containing one file entry
    const mockFileEntry = {
      isFile: true,
      isDirectory: false,
      file: (cb) => cb(mockFile),
    };

    const mockDirEntry = {
      isFile: false,
      isDirectory: true,
      createReader: () => ({
        readEntries: (cb) => cb([mockFileEntry]),
      }),
    };

    const mockItems = {
      length: 1,
      0: { webkitGetAsEntry: () => mockDirEntry },
    };

    await act(async () => {
      fireEvent.drop(dropZone, {
        dataTransfer: { items: mockItems },
      });
      jest.runAllTimers();
      await Promise.resolve();
      jest.runAllTimers();
      await Promise.resolve();
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("nested.jpg")).toBeInTheDocument();
    });

    restoreReader();
  });

  // verifies that a failed upload retries and succeeds on the second attempt.
  // the first upload call returns an error, the second succeeds.
  test("42. retries upload on storage failure then succeeds", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    const restoreReader = mockFileReader();
    const onUploadSuccess = jest.fn();

    const uploadMock = jest
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Temporary failure" },
      })
      .mockResolvedValueOnce({ data: { path: "test-path" }, error: null });

    supabase.storage.from.mockReturnValue({
      upload: uploadMock,
    });

    supabase.from.mockImplementation(() => {
      const builder = {
        select: jest.fn(() => builder),
        insert: jest.fn(() => builder),
        update: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "gallery-uuid-1" },
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: {
            client_id: "client-uuid-1",
            User: { email: "jane@test.com" },
          },
          error: null,
        }),
      };
      return builder;
    });

    const origImage = global.Image;
    global.Image = class {
      constructor() {
        setTimeout(() => this.onload && this.onload(), 0);
      }
      set src(_) {}
      get width() {
        return 800;
      }
      get height() {
        return 600;
      }
    };

    render(
      <UploadGalleryModal
        {...defaultProps}
        onUploadSuccess={onUploadSuccess}
      />,
    );

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        jest.runAllTimers();
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(uploadMock).toHaveBeenCalledTimes(2);
      expect(onUploadSuccess).toHaveBeenCalled();
    });

    global.Image = origImage;
    restoreReader();
    console.log.mockRestore();
    console.error.mockRestore();
  });

  // verifies that when all 3 upload retries fail, the error is logged
  // and the file is added to the failedPhotos array
  test("43. logs failure when upload fails after all retries", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const restoreReader = mockFileReader();
    const onUploadSuccess = jest.fn();

    // all upload attempts return an error
    supabase.storage.from.mockReturnValue({
      upload: jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "Storage error" } }),
    });

    supabase.from.mockImplementation(() => {
      const builder = {
        select: jest.fn(() => builder),
        insert: jest.fn(() => builder),
        update: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "gallery-uuid-1" },
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: {
            client_id: "client-uuid-1",
            User: { email: "jane@test.com" },
          },
          error: null,
        }),
      };
      return builder;
    });

    render(
      <UploadGalleryModal
        {...defaultProps}
        onUploadSuccess={onUploadSuccess}
      />,
    );

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
    });

    for (let i = 0; i < 20; i++) {
      await act(async () => {
        jest.runAllTimers();
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    });

    restoreReader();
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
  });

  // verifies that when the Image onerror fires instead of onload during
  // dimension detection, the upload still completes without blocking
  test("44. handles image dimension detection failure gracefully", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    const restoreReader = mockFileReader();
    const onUploadSuccess = jest.fn();

    supabase.storage.from.mockReturnValue({
      upload: jest
        .fn()
        .mockResolvedValue({ data: { path: "test-path" }, error: null }),
    });

    supabase.from.mockImplementation(() => {
      const builder = {
        select: jest.fn(() => builder),
        insert: jest.fn(() => builder),
        update: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "gallery-uuid-1" },
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: {
            client_id: "client-uuid-1",
            User: { email: "jane@test.com" },
          },
          error: null,
        }),
      };
      return builder;
    });

    // mock Image to fire onerror instead of onload
    const origImage = global.Image;
    global.Image = class {
      constructor() {
        setTimeout(() => this.onerror && this.onerror(), 0);
      }
      set src(_) {}
    };

    render(
      <UploadGalleryModal
        {...defaultProps}
        onUploadSuccess={onUploadSuccess}
      />,
    );

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        jest.runAllTimers();
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(onUploadSuccess).toHaveBeenCalled();
    });

    global.Image = origImage;
    restoreReader();
    console.log.mockRestore();
    console.error.mockRestore();
  });

  // verifies that when a file is marked as cover photo before upload,
  // the upload flow generates a signed url for it via supabase storage
  test("45. saves cover photo signed URL during upload", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    const restoreReader = mockFileReader();
    const onUploadSuccess = jest.fn();

    supabase.storage.from.mockReturnValue({
      upload: jest
        .fn()
        .mockResolvedValue({ data: { path: "test-path" }, error: null }),
      createSignedUrl: jest
        .fn()
        .mockResolvedValue({ data: { signedUrl: "https://signed-cover.com" } }),
    });

    supabase.from.mockImplementation(() => {
      const builder = {
        select: jest.fn(() => builder),
        insert: jest.fn(() => builder),
        update: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "gallery-uuid-1" },
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: {
            client_id: "client-uuid-1",
            User: { email: "jane@test.com" },
          },
          error: null,
        }),
      };
      return builder;
    });

    const origImage = global.Image;
    global.Image = class {
      constructor() {
        setTimeout(() => this.onload && this.onload(), 0);
      }
      set src(_) {}
      get width() {
        return 800;
      }
      get height() {
        return 600;
      }
    };

    render(
      <UploadGalleryModal
        {...defaultProps}
        onUploadSuccess={onUploadSuccess}
      />,
    );

    const validFile = createMockFile("cover.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("cover.jpg")).toBeInTheDocument();
    });

    // mark the photo as cover before starting upload
    const starBtn = document.querySelector(".preview-cover-btn");
    fireEvent.click(starBtn);
    expect(screen.getByText("Cover Photo")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        jest.runAllTimers();
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(
        supabase.storage.from("photos").createSignedUrl,
      ).toHaveBeenCalled();
      expect(onUploadSuccess).toHaveBeenCalled();
    });

    global.Image = origImage;
    restoreReader();
    console.log.mockRestore();
    console.error.mockRestore();
  });

  // verifies that when supabase.storage.upload throws an exception (not just
  // returns an error), the per-file catch block handles it and logs the error
  test("46. handles per-file processing error gracefully", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const restoreReader = mockFileReader();
    const onUploadSuccess = jest.fn();

    // make upload throw instead of returning an error object
    supabase.storage.from.mockReturnValue({
      upload: jest.fn().mockRejectedValue(new Error("Network crash")),
    });

    supabase.from.mockImplementation(() => {
      const builder = {
        select: jest.fn(() => builder),
        insert: jest.fn(() => builder),
        update: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "gallery-uuid-1" },
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: {
            client_id: "client-uuid-1",
            User: { email: "jane@test.com" },
          },
          error: null,
        }),
      };
      return builder;
    });

    const origImage = global.Image;
    global.Image = class {
      constructor() {
        setTimeout(() => this.onload && this.onload(), 0);
      }
      set src(_) {}
      get width() {
        return 800;
      }
      get height() {
        return 600;
      }
    };

    render(
      <UploadGalleryModal
        {...defaultProps}
        onUploadSuccess={onUploadSuccess}
      />,
    );

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        jest.runAllTimers();
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Error processing:",
        expect.any(Error),
      );
    });

    global.Image = origImage;
    restoreReader();
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
  });

  // verifies that selecting more than 8 files still adds all files to the
  // selection but only generates previews for the first 8.
  // the remaining files get placeholder previews without image data.
  test("47. handles more than 8 files with placeholder previews", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const files = Array.from({ length: 10 }, (_, i) =>
      createMockFile(`photo${i}.jpg`, 1024, "image/jpeg"),
    );

    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("Selected Images (10)")).toBeInTheDocument();
    });

    restoreReader();
  });

  // verifies the retry delay setTimeout callback fires between failed attempts.
  // uses 2 failures followed by a success with manual timer advancement
  // matching the exponential backoff delays (1s, 2s).
  test("48. executes retry delay callback between attempts", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const restoreReader = mockFileReader();
    const onUploadSuccess = jest.fn();

    let uploadCallCount = 0;
    const uploadMock = jest.fn(() => {
      uploadCallCount++;
      if (uploadCallCount <= 2) {
        return Promise.resolve({ data: null, error: { message: "Fail" } });
      }
      return Promise.resolve({ data: { path: "ok" }, error: null });
    });

    supabase.storage.from.mockReturnValue({ upload: uploadMock });

    supabase.from.mockImplementation(() => {
      const builder = {
        select: jest.fn(() => builder),
        insert: jest.fn(() => builder),
        update: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "gallery-uuid-1" },
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: {
            client_id: "client-uuid-1",
            User: { email: "jane@test.com" },
          },
          error: null,
        }),
      };
      return builder;
    });

    const origImage = global.Image;
    global.Image = class {
      constructor() {
        setTimeout(() => this.onload && this.onload(), 0);
      }
      set src(_) {}
      get width() {
        return 800;
      }
      get height() {
        return 600;
      }
    };

    render(
      <UploadGalleryModal
        {...defaultProps}
        onUploadSuccess={onUploadSuccess}
      />,
    );

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
      await Promise.resolve();
    });

    // first retry delay: 1000ms (1000 * 2^0)
    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    // second retry delay: 2000ms (1000 * 2^1)
    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // third attempt succeeds, flush remaining async work
    await act(async () => {
      await Promise.resolve();
      jest.runAllTimers();
      await Promise.resolve();
    });

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        jest.runAllTimers();
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(uploadMock).toHaveBeenCalledTimes(3);
      expect(onUploadSuccess).toHaveBeenCalled();
    });

    global.Image = origImage;
    restoreReader();
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
  });

  // verifies the cancelUploadRef check at the start of the file loop (line 313).
  // selects two files, starts upload, cancels after first file begins, then
  // resolves the first upload so the loop hits the cancel check on the second file.
  test("49. cancel ref stops upload at start of file loop", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const restoreReader = mockFileReader();

    // upload hangs until manually resolved, giving time to cancel between files
    let resolveUpload;
    const uploadMock = jest.fn(
      () =>
        new Promise((res) => {
          resolveUpload = res;
        }),
    );

    supabase.storage.from.mockReturnValue({ upload: uploadMock });

    supabase.from.mockImplementation(() => {
      const builder = {
        select: jest.fn(() => builder),
        insert: jest.fn(() => builder),
        update: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "gallery-uuid-1" },
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: {
            client_id: "client-uuid-1",
            User: { email: "jane@test.com" },
          },
          error: null,
        }),
      };
      return builder;
    });

    const origImage = global.Image;
    global.Image = class {
      constructor() {
        setTimeout(() => this.onload && this.onload(), 0);
      }
      set src(_) {}
      get width() {
        return 800;
      }
      get height() {
        return 600;
      }
    };

    render(<UploadGalleryModal {...defaultProps} />);

    // select two files so the loop iterates twice
    const files = [
      createMockFile("photo1.jpg", 1024, "image/jpeg"),
      createMockFile("photo2.jpg", 1024, "image/jpeg"),
    ];
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files } });
      jest.runAllTimers();
    });

    // start upload, first file begins uploading
    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 2 Images/));
      await Promise.resolve();
    });

    // cancel while first file is still uploading
    await act(async () => {
      fireEvent.click(screen.getByText("Cancel Upload"));
    });

    // resolve the first upload so the loop moves to the second iteration
    // where it checks cancelUploadRef.current and exits
    await act(async () => {
      resolveUpload({ data: { path: "ok" }, error: null });
      jest.runAllTimers();
      await Promise.resolve();
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText(/Upload cancelled/)).toBeInTheDocument();
    });

    global.Image = origImage;
    restoreReader();
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
  });

  // verifies the cancelUploadRef check inside the retry loop (line 334).
  // makes the first upload fail (triggering retry), advances past the retry
  // delay, then cancels before the second attempt completes.
  test("50. cancel ref stops upload during retry loop", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    const restoreReader = mockFileReader();

    // first call fails to trigger retry, second call hangs for cancel window
    let resolveRetry;
    const uploadMock = jest
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "Fail" } })
      .mockImplementationOnce(
        () =>
          new Promise((res) => {
            resolveRetry = res;
          }),
      );

    supabase.storage.from.mockReturnValue({ upload: uploadMock });

    supabase.from.mockImplementation(() => {
      const builder = {
        select: jest.fn(() => builder),
        insert: jest.fn(() => builder),
        update: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "gallery-uuid-1" },
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: {
            client_id: "client-uuid-1",
            User: { email: "jane@test.com" },
          },
          error: null,
        }),
      };
      return builder;
    });

    render(<UploadGalleryModal {...defaultProps} />);

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    // start upload, first attempt fails
    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
      await Promise.resolve();
    });

    // advance past the retry delay timer
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    // cancel during the retry attempt
    await act(async () => {
      fireEvent.click(screen.getByText("Cancel Upload"));
    });

    // resolve the pending retry so the loop can check the cancel ref
    if (resolveRetry) {
      await act(async () => {
        resolveRetry({ data: { path: "ok" }, error: null });
        jest.runAllTimers();
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(screen.getByText(/Upload cancelled/)).toBeInTheDocument();
    });

    restoreReader();
    console.log.mockRestore();
    console.error.mockRestore();
  });

  // verifies that submitting more than 10 invalid files truncates the error
  // message and shows a count of the remaining errors not displayed
  test("51. truncates error message when more than 10 invalid files", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    // create 12 pdf files which are all invalid types
    const files = Array.from({ length: 12 }, (_, i) =>
      createMockFile(`doc${i}.pdf`, 1024, "application/pdf"),
    );

    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText(/and 2 more errors/)).toBeInTheDocument();
    });

    restoreReader();
  });

  // verifies that when no gallery exists and the insert to create one fails,
  // the error message from supabase is shown to the user
  test("52. shows error when gallery creation fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const restoreReader = mockFileReader();

    supabase.from.mockImplementation(() => {
      const builder = {
        select: jest.fn(() => builder),
        insert: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        // no existing gallery
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        // gallery creation fails
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Gallery creation failed" },
        }),
      };
      return builder;
    });

    render(<UploadGalleryModal {...defaultProps} />);

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
    });

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        jest.runAllTimers();
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(screen.getByText(/Gallery creation failed/)).toBeInTheDocument();
    });

    restoreReader();
    console.error.mockRestore();
  });

  // verifies that when the session client has no email address, the gallery
  // update with email details is skipped but the upload still completes
  test("53. skips gallery update when client has no email", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    const restoreReader = mockFileReader();
    const onUploadSuccess = jest.fn();

    supabase.storage.from.mockReturnValue({
      upload: jest
        .fn()
        .mockResolvedValue({ data: { path: "test-path" }, error: null }),
    });

    supabase.from.mockImplementation(() => {
      const builder = {
        select: jest.fn(() => builder),
        insert: jest.fn(() => builder),
        update: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "gallery-uuid-1" },
          error: null,
        }),
        // session has a client but the client has no email
        single: jest.fn().mockResolvedValue({
          data: { client_id: "client-uuid-1", User: { email: null } },
          error: null,
        }),
      };
      return builder;
    });

    const origImage = global.Image;
    global.Image = class {
      constructor() {
        setTimeout(() => this.onload && this.onload(), 0);
      }
      set src(_) {}
      get width() {
        return 800;
      }
      get height() {
        return 600;
      }
    };

    render(
      <UploadGalleryModal
        {...defaultProps}
        onUploadSuccess={onUploadSuccess}
      />,
    );

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Upload 1 Image/));
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        jest.runAllTimers();
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(onUploadSuccess).toHaveBeenCalled();
    });

    global.Image = origImage;
    restoreReader();
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  // verifies that when webkitGetAsEntry returns null for a dropped item,
  // the item is skipped and no files are added to the selection
  test("54. handles drag drop when webkitGetAsEntry returns null", async () => {
    render(<UploadGalleryModal {...defaultProps} />);

    const dropZone = document.querySelector(".upload-zone");

    const mockItems = {
      length: 1,
      0: { webkitGetAsEntry: () => null },
    };

    await act(async () => {
      fireEvent.drop(dropZone, {
        dataTransfer: { items: mockItems },
      });
      jest.runAllTimers();
      await Promise.resolve();
    });

    // no files should be added since the entry was null
    expect(screen.getByText("Upload 0 Images")).toBeInTheDocument();
  });

  // verifies that removing all files hides the size indicator since there
  // are no files to show size information for
  test("55. hides size indicator when all files are removed", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const validFile = createMockFile("photo.jpg", 1024, "image/jpeg");
    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [validFile] } });
      jest.runAllTimers();
    });

    // remove the file to get back to empty state
    const removeBtn = document.querySelector(".preview-remove-btn");
    fireEvent.click(removeBtn);

    // size indicator should not show when no files are selected
    expect(screen.queryByText(/0 Bytes/)).not.toBeInTheDocument();

    restoreReader();
  });

  // verifies that selecting files in two separate batches correctly calculates
  // the cumulative total size. this triggers the currentTotalSize reduce
  // callback on line 62 which only runs when selectedFiles already has items.
  test("56. calculates total size across multiple file selections", async () => {
    const restoreReader = mockFileReader();

    render(<UploadGalleryModal {...defaultProps} />);

    const input = document.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    // first selection adds one file
    const file1 = createMockFile("photo1.jpg", 1024 * 1024, "image/jpeg");
    await act(async () => {
      fireEvent.change(input, { target: { files: [file1] } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("Selected Images (1)")).toBeInTheDocument();
    });

    // second selection adds another file, triggering the cumulative size check
    const file2 = createMockFile("photo2.jpg", 1024 * 1024, "image/jpeg");
    await act(async () => {
      fireEvent.change(input, { target: { files: [file2] } });
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("Selected Images (2)")).toBeInTheDocument();
    });

    restoreReader();
  });
});
