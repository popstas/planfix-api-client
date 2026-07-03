module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/lib/', '/dist/'],
  globals: {
    'ts-jest': { tsconfig: './tsconfig.json', diagnostics: false }
  }
};
