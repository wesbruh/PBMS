export default {
  projects: [
    {
      displayName: "frontend",
      rootDir: ".",
      testEnvironment: "jsdom",
      roots: ["<rootDir>/src", "<rootDir>/tests"],
      collectCoverageFrom: [
        "<rootDir>/src/admin/pages/Payments/Payments.jsx",
        "<rootDir>/src/admin/pages/Payments/SubtractBalanceModal.jsx",
        "<rootDir>/src/admin/pages/Settings/Settings.jsx",
        "<rootDir>/src/components/AuthHashRouter.jsx",
        "<rootDir>/src/components/IdleLogout.jsx",
        "<rootDir>/src/components/ProtectedRoute.jsx",
        "<rootDir>/src/context/AuthContext.jsx",
        "<rootDir>/src/pages/Auth/AuthCallback.jsx",
      ],
      testMatch: [
        "<rootDir>/tests/unit/frontend/**/*.test.[jt]s?(x)",
        "<rootDir>/tests/unit/frontend/**/*.spec.[jt]s?(x)",
        "<rootDir>/tests/e2e/frontend/**/*.test.[jt]s?(x)",
        "<rootDir>/tests/e2e/frontend/**/*.spec.[jt]s?(x)",
      ],
      setupFilesAfterEnv: ["<rootDir>/tests/setup/frontend.setup.js"],
      transform: {
        "^.+\\.[jt]sx?$": ["babel-jest", { configFile: "./babel.config.js" }],
      },
      coveragePathIgnorePatterns: [
        "/node_modules/",
        "/backend/",
        "/src/admin/pages/Settings/settings\\.utils\\.js$",
        "/src/context/authContext\\.utils\\.js$",
        "/src/pages/Auth/authCallback\\.utils\\.js$",
      ],
      moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "\\.(gif|ttf|eot|svg|png|jpg|jpeg|webp)$": "<rootDir>/tests/mocks/fileMock.js",
        // "react-day-picker/dist/style.css": "<rootDir>/tests/mocks/fileMock.js",
      },
      testPathIgnorePatterns: ["/node_modules/", "<rootDir>/backend/"],
      coverageReporters: ["html", "text"],
    },
    "<rootDir>/backend/jest.config.cjs",
  ],
};
