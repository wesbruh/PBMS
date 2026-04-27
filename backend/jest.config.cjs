const path = require("path");

module.exports = {
  displayName: "backend",
  rootDir: "..",
  testEnvironment: "node",
  roots: ["<rootDir>/backend", "<rootDir>/tests"],
  collectCoverageFrom: [
    "<rootDir>/backend/app.js",
    "<rootDir>/backend/server.js",
    "<rootDir>/backend/routes/profileRoutes.js",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/",
    "/backend/authmiddle/",
    "/backend/controllers/",
    "/backend/routes/(?!profileRoutes\\.js$)",
    "/tests/utils/backend/",
  ],
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
