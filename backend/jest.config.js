/** @type {import("jest").Config} **/
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/"],
  moduleNameMapper: {
    "^@enums$": "<rootDir>/src/enums/index.ts",
    "^@entities$": "<rootDir>/src/entities/index.ts",
    "^@interfaces$": "<rootDir>/src/interfaces/index.ts",
    "^@models$": "<rootDir>/src/models/index.ts",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/index.ts",
    "!src/data_source.ts",
    "!src/seed.ts",
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
  },
};
