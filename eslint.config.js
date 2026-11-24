import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
export default tseslint.config({ ignores: ['dist/**', 'node_modules/**'] }, js.configs.recommended, ...tseslint.configs.recommended, { files: ['**/*.{ts,tsx}'], languageOptions: { globals: globals.browser }, rules: { '@typescript-eslint/no-explicit-any': 'error' } }, { files: ['**/*.{js,mjs}'], languageOptions: { globals: globals.node } }, { files: ['**/*.cjs'], languageOptions: { globals: globals.node, sourceType: 'commonjs' }, rules: { '@typescript-eslint/no-require-imports': 'off' } });
