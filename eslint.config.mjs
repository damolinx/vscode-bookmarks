/**
 * ESLint configuration for the project.
 *
 * See https://eslint.style and https://typescript-eslint.io for additional linting options.
 */
// @ts-check
import js from '@eslint/js';
import eslintImport from 'eslint-plugin-import';
import eslintPrettier from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
  {
    ignores: [
      '.vscode-test',
      'out',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    plugins: {
      '@stylistic': stylistic,
      '@eslint/import': eslintImport,
      '@eslint/prettier': eslintPrettier,
    },
    rules: {
      'arrow-parens': ['error', 'always'],
      'curly': 'warn',
      'no-trailing-spaces': 'error',
      '@eslint/import/order': [
        'error',
        {
          alphabetize: { order: 'asc', caseInsensitive: true },
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'never',
          pathGroups: [
            {
              pattern: 'vscode',
              group: 'builtin',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],
      '@eslint/prettier/prettier': [
        'error',
        {
          'semi': true,
          'singleQuote': true,
          'printWidth': 100,
          'tabWidth': 2,
        }
      ],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          'selector': 'import',
          'format': ['camelCase', 'PascalCase']
        }
      ],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'argsIgnorePattern': '^_.*',
          'varsIgnorePattern': '^_.*'
        }
      ],
    }
  }
);