import { render } from "@testing-library/react";
import App from "../../../src/App";

// Mock createRoot
jest.mock("react-dom/client", () => ({
  createRoot: jest.fn(() => ({
    render: jest.fn(),
  })),
}));

// Mock AuthProvider
jest.mock("../../../src/context/AuthContext", () => ({
  AuthProvider: ({ children }) => <div>AuthProvider Mock {children}</div>,
}));

// Mock App
jest.mock("../../../src/App.jsx", () => () => <div>App Mock</div>);

describe("main.jsx", () => {
  test("renders app with providers without crashing", () => {
    document.body.innerHTML = `<div id="root"></div>`;

    require("../../../src/main.jsx");

    // If no crash → pass
    expect(true).toBe(true);
  });
});
