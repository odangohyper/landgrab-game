// packages/web-game-client/jest.config.js

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testEnvironmentOptions: {
    url: 'http://localhost/?charset=utf-8',
  },
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/game/**/*.ts',
    '!src/game/scenes/**/*.ts', // Exclude Phaser scenes for now
    '!src/game/PhaserGame.ts', // Exclude Phaser game entry point
  ],
  coverageThreshold: {
    global: {
      branches: 58,
      functions: 80,
      lines: 75,
      statements: 72,
    },
  },
};