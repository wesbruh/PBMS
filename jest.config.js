export default {
  projects: [
    {
      displayName: "frontend",
      rootDir: ".",
      testEnvironment: "jsdom",
      roots: ["<rootDir>/src", "<rootDir>/tests"],
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
      moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "\\.(gif|ttf|eot|svg|png|jpg|jpeg|webp)$": "<rootDir>/tests/mocks/fileMock.js",
      },
      testPathIgnorePatterns: ["/node_modules/", "<rootDir>/backend/"],
    },
    "<rootDir>/backend/jest.config.cjs",
  ],
};
