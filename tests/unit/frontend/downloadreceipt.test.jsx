jest.mock("../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

const mockUseAuth = jest.fn();

jest.mock("../../../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import DownloadReceipt from "../../../src/components/InvoiceButton/DownloadReceipt";

global.fetch = jest.fn();
global.URL.createObjectURL = jest.fn(() => "blob:url");
global.URL.revokeObjectURL = jest.fn();
window.alert = jest.fn();

beforeAll(() => {
  jest
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
});

describe("DownloadReceipt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders download button when session exists", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "fake-token" },
    });

    render(<DownloadReceipt invoiceId={123} />);

    expect(
      await screen.findByLabelText(/download receipt/i)
    ).toBeInTheDocument();
  });

  test("creates download link and triggers click on success", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "fake-token" },
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
    });

    const createElementSpy = jest.spyOn(document, "createElement");

    render(<DownloadReceipt invoiceId={123} />);
    const downloadBtn = await screen.findByLabelText(/download receipt/i);

    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/receipt/123"),
        expect.objectContaining({
            method: "GET",
            headers: expect.objectContaining({
                Authorization: "Bearer fake-token",
    }),
  })
);

      expect(createElementSpy).toHaveBeenCalledWith("a");
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  test("shows alert on download failure", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "fake-token" },
    });

    fetch.mockResolvedValueOnce({ ok: false });

    render(<DownloadReceipt invoiceId={123} />);
    const downloadBtn = await screen.findByLabelText(/download receipt/i);

    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining("Error downloading receipt")
      );
    });
  });

  test("shows alert on fetch exception", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "fake-token" },
    });

    fetch.mockRejectedValueOnce(new Error("network error"));

    render(<DownloadReceipt invoiceId={123} />);
    const downloadBtn = await screen.findByLabelText(/download receipt/i);

    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining("network error")
      );
    });
  });

  test("does not render when no session", () => {
    mockUseAuth.mockReturnValue({
      session: null,
    });

    render(<DownloadReceipt invoiceId={123} />);

    expect(
      screen.queryByLabelText(/download receipt/i)
    ).toBeNull();
  });
});