const path = require("path");

module.exports = {
  displayName: "backend",
  rootDir: "..",
  testEnvironment: "node",
  roots: ["<rootDir>/backend", "<rootDir>/tests"],
  collectCoverageFrom: [
    "<rootDir>/backend/routes/*.js",
    "<rootDir>/backend/app.js",
    "<rootDir>/backend/server.js",
    "<rootDir>/backend/controllers/*.js",
    "<rootDir>/backend/authmiddle/authUsers.js",
    // "<rootDir>/backend/routes/profileRoutes.js",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/",
    //"/backend/authmiddle/",
    //"/backend/controllers/",
    //"/backend/app\\.js$",
    // "/backend/routes/availabilityRoutes.js",
    // "/backend/routes/invoiceRoutes.js",
    // "/backend/routes/questionnaireRoutes.js",
    // "/backend/routes/receiptRoutes.js",
    "/tests/utils/backend/",
  ],
  testMatch: [
    "<rootDir>/tests/unit/backend/**/*.test.js",
    "<rootDir>/tests/unit/backend/**/*.spec.js",
    "<rootDir>/tests/integration/backend/**/*.test.js",
    // // "<rootDir>/tests/integration/backend/**/*.integration.test.js",
    // "<rootDir>/tests/integration/backend/**/*.spec.js",
  ],
  setupFilesAfterEnv: ["<rootDir>/tests/setup/backend.setup.js"],
  transform: {
    "^.+\\.js$": ["babel-jest", { configFile: path.join(__dirname, "../babel.config.cjs") }],
  },
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/src/"],
};
