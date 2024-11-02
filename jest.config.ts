import type { JestConfigWithTsJest } from 'ts-jest';

/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

const config: JestConfigWithTsJest = {
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  preset: 'ts-jest',
  coverageDirectory: './coverage',
  collectCoverage: true,
  clearMocks: true,
  coveragePathIgnorePatterns: ['/node_modules/', '/dist'],
  coverageProvider: 'v8',
};

export default config;
