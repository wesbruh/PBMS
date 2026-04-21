const path = require("path");

module.exports = {
  displayName: "backend",
  rootDir: "..",
  testEnvironment: "node",
  roots: ["<rootDir>/backend", "<rootDir>/tests"],
  testMatch: [
    "<rootDir>/tests/unit/backend/**/*.test.js",
    "<rootDir>/tests/unit/backend/**/*.spec.js",
    "<rootDir>/tests/integration/backend/**/*.test.js",
    "<rootDir>/tests/integration/backend/**/*.spec.js",
  ],
  setupFilesAfterEnv: ["<rootDir>/tests/setup/backend.setup.js"],
  transform: {
    "^.+\\.js$": ["babel-jest", { configFile: path.join(__dirname, "../babel.config.js") }],
  },
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/src/"],
};