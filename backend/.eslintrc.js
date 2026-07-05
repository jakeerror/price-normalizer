module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { sourceType: "module", ecmaVersion: 2022 },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  env: { node: true, jest: true },
  ignorePatterns: [".eslintrc.js", "dist", "node_modules", "coverage"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
};
