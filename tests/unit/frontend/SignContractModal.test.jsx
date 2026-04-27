import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SignContractModal from "../../../src/components/contracts/SignContractModal.jsx";

const mockUseAuth = jest.fn();

const mockSigInstance = {
  clear: jest.fn(),
  isEmpty: jest.fn(),
  toDataURL: jest.fn(),
};

jest.mock("../../../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("react-signature-canvas", () => {
  const React = require("react");
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => mockSigInstance);
    return <div data-testid="signature-canvas" />;
  });
});

describe("SignContractModal", () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSigned: jest.fn(),
    contract: { id: 123 },
    contractTemplate: { name: "Wedding Contract" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      session: { access_token: "test-token" },
    });
    global.fetch = jest.fn();
    global.alert = jest.fn();
  });

  test("renders nothing when there is no session", () => {
    mockUseAuth.mockReturnValue({ session: null });

    const { container } = render(<SignContractModal {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders nothing when open is false", () => {
    const { container } = render(
      <SignContractModal {...defaultProps} open={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  test("renders nothing when contract is missing", () => {
    const { container } = render(
      <SignContractModal {...defaultProps} contract={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  test("renders nothing when contractTemplate is missing", () => {
    const { container } = render(
      <SignContractModal {...defaultProps} contractTemplate={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  test("renders modal content when all required props are present", () => {
    render(<SignContractModal {...defaultProps} />);

    expect(
      screen.getByText(/sign “wedding contract”/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId("signature-canvas")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save signature/i })
    ).toBeInTheDocument();
  });

  test("calls onClose when Close button is clicked", () => {
    render(<SignContractModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  test("calls onClose when backdrop is clicked", () => {
    const { container } = render(<SignContractModal {...defaultProps} />);

    const backdrop = container.querySelector(".absolute.inset-0");
    fireEvent.click(backdrop);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  test("clears the signature canvas when Clear is clicked", () => {
    render(<SignContractModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(mockSigInstance.clear).toHaveBeenCalled();
  });

  test("alerts when trying to save an empty signature", async () => {
    mockSigInstance.isEmpty.mockReturnValue(true);

    render(<SignContractModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /save signature/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "Please add your signature first."
      );
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("saves signature successfully and calls onSigned and onClose", async () => {
    const signedContract = { id: 123, status: "Signed" };

    mockSigInstance.isEmpty.mockReturnValue(false);
    mockSigInstance.toDataURL.mockReturnValue("data:image/png;base64,mock");

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ publicUrl: "https://example.com/signed.png" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => signedContract,
      });

    render(<SignContractModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /save signature/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(defaultProps.onSigned).toHaveBeenCalledWith(signedContract);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  test("sends the expected first fetch request", async () => {
    mockSigInstance.isEmpty.mockReturnValue(false);
    mockSigInstance.toDataURL.mockReturnValue("data:image/png;base64,mock");

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ publicUrl: "https://example.com/signed.png" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, status: "Signed" }),
      });

    render(<SignContractModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /save signature/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("/api/contract/123/sign"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          }),
        })
      );
    });
  });

  test("sends the expected second fetch request", async () => {
    mockSigInstance.isEmpty.mockReturnValue(false);
    mockSigInstance.toDataURL.mockReturnValue("data:image/png;base64,mock");

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ publicUrl: "https://example.com/signed.png" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, status: "Signed" }),
      });

    render(<SignContractModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /save signature/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("/api/contract/123"),
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          }),
        })
      );
    });
  });

  test("shows saving state while request is in progress", async () => {
    mockSigInstance.isEmpty.mockReturnValue(false);
    mockSigInstance.toDataURL.mockReturnValue("data:image/png;base64,mock");

    let resolveFirstFetch;
    const firstFetchPromise = new Promise((resolve) => {
      resolveFirstFetch = resolve;
    });

    global.fetch
      .mockReturnValueOnce(firstFetchPromise)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, status: "Signed" }),
      });

    render(<SignContractModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /save signature/i }));

    expect(
      screen.getByRole("button", { name: /saving/i })
    ).toBeDisabled();

    resolveFirstFetch({
      ok: true,
      json: async () => ({ publicUrl: "https://example.com/signed.png" }),
    });

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  test("alerts when signing upload request fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockSigInstance.isEmpty.mockReturnValue(false);
    mockSigInstance.toDataURL.mockReturnValue("data:image/png;base64,mock");

    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "upload failed" } }),
    });

    render(<SignContractModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /save signature/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "Could not save signature: upload failed"
      );
    });

    expect(defaultProps.onSigned).not.toHaveBeenCalled();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test("alerts when contract update request fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockSigInstance.isEmpty.mockReturnValue(false);
    mockSigInstance.toDataURL.mockReturnValue("data:image/png;base64,mock");

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ publicUrl: "https://example.com/signed.png" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: "update failed" } }),
      });

    render(<SignContractModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /save signature/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "Could not save signature: update failed"
      );
    });

    expect(defaultProps.onSigned).not.toHaveBeenCalled();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
