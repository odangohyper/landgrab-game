// src/setupTests.ts

// This file is run before each test file.

// Mock console methods to prevent logging during tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
