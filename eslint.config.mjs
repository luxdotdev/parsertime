/* eslint-disable */
import eslintReact from "@eslint-react/eslint-plugin";
import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ignoredFiles = ["**/components/ui/**", "**/hooks/**"];

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: {
    ignorePatterns: ignoredFiles,
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
  },
});

const eslintConfig = [
  ...compat.extends(
    "eslint:recommended",
    // "next/core-web-vitals",
    // "next/typescript",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:react/jsx-runtime"
  ),
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.jsx", "**/*.js"],
    ...eslintReact.configs["recommended-type-checked"],
    ignores: ignoredFiles,
    rules: {
      "@eslint-react/hooks-extra/no-direct-set-state-in-use-effect": "off",
    },
  },
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    rules: {
      "no-undef": "off", // this causes issues with the React global
      "no-console": "error", // use an explicit logger instead
      "no-constant-binary-expression": "error",
      "object-shorthand": "warn",
      "prefer-template": "warn",
      "no-else-return": "warn",
      "func-style": [
        "error",
        "declaration",
        { overrides: { namedExports: "ignore" } },
      ],
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-curly-brace-presence": "warn",
      "react/jsx-no-useless-fragment": "warn",
      "react/no-array-index-key": "error",
      "react/jsx-no-literals": "error",
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            arguments: false,
            attributes: false,
          },
        },
      ],
      "@typescript-eslint/adjacent-overload-signatures": "error",
      "@typescript-eslint/array-type": "error",
      "@typescript-eslint/consistent-generic-constructors": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "as",
          objectLiteralTypeAssertions: "allow-as-parameter",
          arrayLiteralTypeAssertions: "allow-as-parameter",
        },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-confusing-non-null-assertion": "error",
      "no-empty-function": "off",
      "@typescript-eslint/no-empty-function": "error",
      "@typescript-eslint/no-inferrable-types": "error",
      "@typescript-eslint/non-nullable-type-assertion-style": "error",
      "@typescript-eslint/prefer-find": "error",
      "@typescript-eslint/prefer-for-of": "error",
      "@typescript-eslint/prefer-function-type": "error",
      "@typescript-eslint/prefer-includes": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/prefer-string-starts-ends-with": "error",
      "@typescript-eslint/consistent-type-exports": [
        "warn",
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          fixStyle: "inline-type-imports",
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": "warn",
    },
  },
];

export default eslintConfig;
