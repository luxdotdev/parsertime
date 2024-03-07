/** @type {import("eslint").Linter.Config} */
const config = {
  extends: [
    "turbo",
    "next/core-web-vitals",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:react/recommended",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "jsx-a11y", "react"],
  root: true,
  ignorePatterns: ["**/components/ui", "**/test"],
  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "no-console": "warn",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react/jsx-curly-brace-presence": "warn",
    "react/jsx-no-useless-fragment": "warn",
    "react/no-array-index-key": "warn",
    "no-constant-binary-expression": "error",
    "object-shorthand": "warn",
    "prefer-template": "warn",
    "no-else-return": "warn",
  },
};
