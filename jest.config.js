module.exports = {
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // A preset that is used as a base for Jest's configuration
  preset: 'ts-jest',
  // The test environment that will be used for testing
  testEnvironment: 'node',
  // An array of regexp pattern strings that are matched against all test paths,
  // matched tests are skipped
  testPathIgnorePatterns: ['/build/', '/node_modules/'],
  // An array of file extensions your modules use
  moduleFileExtensions: ['js', 'json', 'ts', 'node'],
  testMatch: ["**/tests/**/*.ts"],
  modulePathIgnorePatterns: ["mocks"],
};
