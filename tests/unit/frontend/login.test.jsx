let mockAuth = { session: null, profile: null, loading: false };
const mockNavigate = jest.fn();

jest.mock('../../../src/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      resetPasswordForEmail: jest.fn()
    }
  }
}));

jest.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => mockAuth
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(() => mockNavigate),
  useLocation: () => ({ state: null }),
  Link: ({ children }) => <>{children}</>
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from '../../../src/pages/Login/Login';
import { supabase } from '../../../src/lib/supabaseClient';

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = { session: null, profile: null, loading: false };
  });

  test('renders login form', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText(/jane@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/login-button/i)).toBeInTheDocument();
  });

  test('shows validation errors when submitting empty form', async () => {
    render(<Login />);
    fireEvent.click(screen.getByLabelText(/login-button/i));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  test('clears field error on input change', async () => {
    render(<Login />);
    fireEvent.click(screen.getByLabelText(/login-button/i));
    await screen.findByText(/email is required/i);
    fireEvent.change(screen.getByPlaceholderText(/jane@example.com/i), {
      target: { name: 'email', value: 'test@test.com' }
    });
    expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
  });

  test('shows error on failed login', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' }
    });

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText(/jane@example.com/i), {
      target: { name: 'email', value: 'test@test.com' }
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { name: 'password', value: 'wrongpassword' }
    });
    fireEvent.click(screen.getByLabelText(/login-button/i));

    await waitFor(() => {
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
    });
  });

  test('shows email not confirmed error', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Email not confirmed' }
    });

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText(/jane@example.com/i), {
      target: { name: 'email', value: 'test@test.com' }
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { name: 'password', value: 'password123' }
    });
    fireEvent.click(screen.getByLabelText(/login-button/i));

    await waitFor(() => {
      expect(screen.getByText(/please confirm your email first/i)).toBeInTheDocument();
    });
  });

  test('successful login with no error', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText(/jane@example.com/i), {
      target: { name: 'email', value: 'test@test.com' }
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { name: 'password', value: 'password123' }
    });
    fireEvent.click(screen.getByLabelText(/login-button/i));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123'
      });
    });
  });

  test('opens forgot password modal', () => {
    render(<Login />);
    fireEvent.click(screen.getByText(/forgot password/i));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
  });

  test('closes modal on cancel', () => {
    render(<Login />);
    fireEvent.click(screen.getByText(/forgot password/i));
    fireEvent.click(screen.getByText(/cancel/i));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('closes modal on backdrop click', () => {
    render(<Login />);
    fireEvent.click(screen.getByText(/forgot password/i));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('sends reset email successfully', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    render(<Login />);
    fireEvent.click(screen.getByText(/forgot password/i));
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: 'test@test.com' }
    });
    fireEvent.click(screen.getByText(/send reset link/i));

    await waitFor(() => {
      expect(screen.getByText(/reset link has been sent/i)).toBeInTheDocument();
    });
  });

  test('shows error if reset email fails', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({
      error: { message: 'Could not send reset email.' }
    });

    render(<Login />);
    fireEvent.click(screen.getByText(/forgot password/i));
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: 'test@test.com' }
    });
    fireEvent.click(screen.getByText(/send reset link/i));

    await waitFor(() => {
      expect(screen.getByText(/could not send reset email/i)).toBeInTheDocument();
    });
  });

  test('clears reset message when typing new email', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    render(<Login />);
    fireEvent.click(screen.getByText(/forgot password/i));
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: 'test@test.com' }
    });
    fireEvent.click(screen.getByText(/send reset link/i));

    await waitFor(() => {
      expect(screen.getByText(/reset link has been sent/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: 'new@test.com' }
    });
    expect(screen.queryByText(/reset link has been sent/i)).not.toBeInTheDocument();
  });

  test('navigates to /admin when profile is Admin', () => {
    mockAuth = { session: { access_token: 'token' }, profile: { roleName: 'Admin' }, loading: false };
    render(<Login />);
    expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
  });

  test('navigates to /dashboard when profile is User', () => {
    mockAuth = { session: { access_token: 'token' }, profile: { roleName: 'User' }, loading: false };
    render(<Login />);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  test('patches user profile after successful login', async () => {
    mockAuth = { session: { access_token: 'fake-token' }, profile: { id: '123', roleName: 'User' }, loading: false };
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText(/jane@example.com/i), {
      target: { name: 'email', value: 'test@test.com' }
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { name: 'password', value: 'password123' }
    });
    fireEvent.click(screen.getByLabelText(/login-button/i));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  test('logs error when PATCH response is not ok', async () => {
    mockAuth = { session: { access_token: 'fake-token' }, profile: { id: '123', roleName: 'User' }, loading: false };
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Update failed' })
    });
    console.error = jest.fn();
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText(/jane@example.com/i), {
      target: { name: 'email', value: 'test@test.com' }
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { name: 'password', value: 'password123' }
    });
    fireEvent.click(screen.getByLabelText(/login-button/i));

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('User update failed:', 'Update failed');
    });
  });
});
test('logs error when PATCH response is not ok', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ error: 'Update failed' })
  });
  console.error = jest.fn();
  supabase.auth.signInWithPassword.mockResolvedValue({ error: null });

  // Start with no session so useEffect doesn't navigate away
  mockAuth = { session: null, profile: null, loading: false };
  render(<Login />);

  // Now set session so the onSubmit PATCH block runs
  mockAuth = { 
    session: { access_token: 'fake-token' }, 
    profile: { id: '123', roleName: 'User' }, 
    loading: false 
  };

  fireEvent.change(screen.getByPlaceholderText(/jane@example.com/i), {
    target: { name: 'email', value: 'test@test.com' }
  });
  fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
    target: { name: 'password', value: 'password123' }
  });
  fireEvent.click(screen.getByLabelText(/login-button/i));

  await waitFor(() => {
    expect(console.error).toHaveBeenCalledWith('User update failed:', 'Update failed');
  });
});