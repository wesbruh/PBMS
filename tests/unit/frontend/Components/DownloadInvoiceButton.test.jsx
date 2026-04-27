jest.mock("../../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

jest.mock('../../../../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: { access_token: 'fake-token' }
  })
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DownloadInvoiceButton from '../../../../src/components/InvoiceButton/DownloadInvoiceButton';

global.fetch = jest.fn();
global.URL.createObjectURL = jest.fn(() => 'blob:url');
global.URL.revokeObjectURL = jest.fn();
window.open = jest.fn();
window.alert = jest.fn();

describe('DownloadInvoiceButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  test('renders preview and download buttons when session exists', async () => {
    render(<DownloadInvoiceButton invoiceId={123} />);

    expect(await screen.findByLabelText(/preview invoice/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/download invoice/i)).toBeInTheDocument();
  });


  test('creates download link and triggers click', async () => {
    fetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob())
    });

    const createElementSpy = jest.spyOn(document, 'createElement');

    render(<DownloadInvoiceButton invoiceId={123} />);

    const downloadBtn = await screen.findByLabelText(/download invoice/i);
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  test('opens preview in new tab', async () => {
    fetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob())
    });

    render(<DownloadInvoiceButton invoiceId={123} />);

    const previewBtn = await screen.findByLabelText(/preview invoice/i);
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith('blob:url', '_blank');
    });
  });

  test('handles download API failure', async () => {
    fetch.mockResolvedValue({ ok: false });

    render(<DownloadInvoiceButton invoiceId={123} />);

    const downloadBtn = await screen.findByLabelText(/download invoice/i);
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('Error downloading invoice')
      );
    });
  });

  test('handles preview API failure', async () => {
    fetch.mockResolvedValue({ ok: false });

    render(<DownloadInvoiceButton invoiceId={123} />);

    const previewBtn = await screen.findByLabelText(/preview invoice/i);
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('Error previewing invoice')
      );
    });
  });
});
