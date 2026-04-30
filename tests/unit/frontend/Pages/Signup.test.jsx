jest.mock("../../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignUp from '../../../../src/pages/SignUp/SignUp'; // adjust path
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

const renderWithRouter = (ui) => {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  );
};
// mock fetch
global.fetch = jest.fn();

describe('SignUp Component', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all inputs and button', () => {
    renderWithRouter(<SignUp />);

    expect(screen.getByPlaceholderText('Jane')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('jane@example.com')).toBeInTheDocument();

    // password fields
    expect(screen.getAllByPlaceholderText('••••••••').length).toBe(2);

    // button
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  test('shows validation errors when submitting empty form', async () => {
    renderWithRouter(<SignUp />);

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
  });

  test('shows password mismatch error', async () => {
    renderWithRouter(<SignUp />);

    fireEvent.change(screen.getByPlaceholderText('Jane'), {
      target: { value: 'John' },
    });

    fireEvent.change(screen.getByPlaceholderText('Doe'), {
      target: { value: 'Doe' },
    });

    fireEvent.change(screen.getByPlaceholderText('jane@example.com'), {
      target: { value: 'test@test.com' },
    });

    const passwordInputs = screen.getAllByPlaceholderText('••••••••');

    fireEvent.change(passwordInputs[0], {
      target: { value: 'Password1' },
    });

    fireEvent.change(passwordInputs[1], {
      target: { value: 'Password2' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  test('successful signup shows success message', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        info: { message: 'Check your email!' },
      }),
    });

    renderWithRouter(<SignUp />);

    // fill form
    fireEvent.change(screen.getByPlaceholderText('Jane'), {
      target: { value: 'John' },
    });

    fireEvent.change(screen.getByPlaceholderText('Doe'), {
      target: { value: 'Doe' },
    });

    fireEvent.change(screen.getByPlaceholderText('jane@example.com'), {
      target: { value: 'test@test.com' },
    });

    const passwordInputs = screen.getAllByPlaceholderText('••••••••');

    fireEvent.change(passwordInputs[0], {
      target: { value: 'Password1' },
    });

    fireEvent.change(passwordInputs[1], {
      target: { value: 'Password1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  test('failed signup shows error message', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Signup failed',
      }),
    });

    renderWithRouter(<SignUp />);

    fireEvent.change(screen.getByPlaceholderText('Jane'), {
      target: { value: 'John' },
    });

    fireEvent.change(screen.getByPlaceholderText('Doe'), {
      target: { value: 'Doe' },
    });

    fireEvent.change(screen.getByPlaceholderText('jane@example.com'), {
      target: { value: 'test@test.com' },
    });

    const passwordInputs = screen.getAllByPlaceholderText('••••••••');

    fireEvent.change(passwordInputs[0], {
      target: { value: 'Password1' },
    });

    fireEvent.change(passwordInputs[1], {
      target: { value: 'Password1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/signup failed/i)).toBeInTheDocument();
    });
  });

});