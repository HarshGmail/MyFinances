import tseslint from 'typescript-eslint';

export default tseslint.config(...tseslint.configs.recommended, {
  linterOptions: { reportUnusedDisableDirectives: 'off' },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  },
});
