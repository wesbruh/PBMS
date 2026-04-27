jest.mock("../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

jest.mock('../../../src/components/HomePageComps/CarouselPhotos', () => () => (
  <div data-testid="carousel-section" />
));

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../../../src/pages/Home/Home';

describe('Home', () => {
  beforeEach(() => {
    render(<Home />);
  });

  test('renders background image', () => {
    expect(screen.getByAltText(/home background image/i)).toBeInTheDocument();
  });

  test('renders hero heading', () => {
    expect(screen.getByText(/preserve your emotions and connections/i)).toBeInTheDocument();
  });

  test('renders photographer tagline', () => {
    expect(screen.getByText(/candid & romance photographer/i)).toBeInTheDocument();
  });

  test('renders documentary photography heading', () => {
    expect(screen.getByText(/documentary photography that tells your story/i)).toBeInTheDocument();
  });

  test('renders Life is Unique heading', () => {
    expect(screen.getByRole('heading', { name: /life is unique/i })).toBeInTheDocument();
  }); 

  test('renders second home image', () => {
    expect(screen.getByAltText(/second home image/i)).toBeInTheDocument();
  });

  test('renders about section', () => {
    expect(screen.getByText(/welcome friend/i)).toBeInTheDocument();
  });

  test('renders quote', () => {
    expect(screen.getByText(/we never leave our roots/i)).toBeInTheDocument();
  });

  test('renders quote attribution', () => {
    expect(screen.getByText(/aubrey meadows/i)).toBeInTheDocument();
  });

  test('renders carousel section', () => {
    expect(screen.getByTestId('carousel-section')).toBeInTheDocument();
  });
});
