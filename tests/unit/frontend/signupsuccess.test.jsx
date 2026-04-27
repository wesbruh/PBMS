import { render, screen, fireEvent, act } from '@testing-library/react';
import SignUpSuccess from '../../../src/pages/SignUp/SignUpSuccess'; // adjust path
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';


const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderWithRouter = (ui) => {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  );
};

describe('SignUpSuccess Component', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  
  test('renders success message and buttons', () => {
    renderWithRouter(<SignUpSuccess />);

    expect(screen.getByText(/you’re all set/i)).toBeInTheDocument();
    expect(screen.getByText(/let’s book your session/i)).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /continue to booking/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: /back to home/i })
    ).toBeInTheDocument();
  });

 
  test('clicking continue navigates to inquiry', () => {
    renderWithRouter(<SignUpSuccess />);

    fireEvent.click(
      screen.getByRole('button', { name: /continue to booking/i })
    );

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/inquiry');
  });

  
  test('countdown decreases over time', () => {
    renderWithRouter(<SignUpSuccess />);

    expect(screen.getByText(/10/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/9/i)).toBeInTheDocument();
  });


  test('auto redirects after countdown reaches zero', () => {
    renderWithRouter(<SignUpSuccess />);

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/inquiry', {
      replace: true,
    });
  });

});
