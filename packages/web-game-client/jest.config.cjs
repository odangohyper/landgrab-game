// packages/web-game-client/jest.config.js

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/game/**/*.ts',
    '!src/game/scenes/**/*.ts', // Exclude Phaser scenes for now
    '!src/game/PhaserGame.ts', // Exclude Phaser game entry point
  ],
};
