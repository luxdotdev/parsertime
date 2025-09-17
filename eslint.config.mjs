// @ts-check
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import eslintReact from "@eslint-react/eslint-plugin";
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ignores = [
  // Generated / heavy
  ".next/**",
  ".turbo/**",
  "dist/**",
  "out/**",
  "build/**",
  "coverage/**",
  "storybook-static/**",
  "playwright-report/**",
  // Project specifics you had
  "**/components/ui/**",
  "**/hooks/**",
  "eslint.config.mjs",
  "next.config.*",
  "postcss.config.*",
  "next-env.d.ts",
  "test/**",
  "vitest.config.*",
];

/** Normalize 'off'|'warn'|'error' → 0|1|2; leave arrays/objects as-is. */
function normalizeRuleEntry(value) {
  if (typeof value === "string")
    return value === "off" ? 0 : value === "warn" ? 1 : 2;
  return value;
}

/** Merge Next presets and normalize to satisfy strict RuleEntry typing. */
const nextRulesNormalized = (() => {
  const merged = {
    ...(nextPlugin.configs.recommended?.rules ?? {}),
    ...(nextPlugin.configs["core-web-vitals"]?.rules ?? {}),
  };
  // App Router projects: this rule is pages-router-only and can be slow.
  merged["@next/next/no-html-link-for-pages"] = "off";
  return Object.fromEntries(
    Object.entries(merged).map(([k, v]) => [k, normalizeRuleEntry(v)])
  );
})();

export default tseslint.config(
  // 0) Global ignores
  { ignores },

  // 1) Core JS (applies to all files unless later narrowed)
  js.configs.recommended,

  // 2) React & a11y (flat)
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs["recommended-latest"],
  jsxA11y.flatConfigs.recommended,

  // 3) Non-typed TS rules (fast baseline for TS)
  ...tseslint.configs.recommended,

  // 4) Project-specific + Next rules for *all* TS/JS files (no type service yet)
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "@next/next": nextPlugin },
    rules: {
      // Next (normalized)
      ...nextRulesNormalized,

      // JS
      "no-undef": "off", // TS handles this
      "no-console": "error",
      "no-constant-binary-expression": "error",
      "object-shorthand": "warn",
      "prefer-template": "warn",
      "no-else-return": "warn",
      "func-style": ["error", "declaration", { allowArrowFunctions: true }],

      // React
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-curly-brace-presence": "warn",
      "react/jsx-no-useless-fragment": "warn",
      "react/no-array-index-key": "error",
      "react/jsx-no-literals": "off",

      // Hooks
      "react-hooks/exhaustive-deps": "error",
    },
    settings: {
      react: { version: "detect" },
      next: { rootDir: ["."] }, // prevents plugin from walking the whole repo
    },
  },

  // 5) Typed TS pass — *only* for your source TS
  //    (this is where the heavy work happens; keep the glob tight)
  ...tseslint.configs.recommendedTypeChecked,
  eslintReact.configs["recommended-type-checked"],
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        // Using explicit project avoids projectService scanning everything
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { arguments: false, attributes: false } },
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
        { fixStyle: "inline-type-imports", prefer: "type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "warn",
      "@eslint-react/hooks-extra/no-direct-set-state-in-use-effect": "off",
      "@eslint-react/no-array-index-key": "off",
    },
  },

  // 6) Make tests/config/scripts *not* run the typed pass (keeps runs snappy)
  {
    files: [
      "**/*.{test,spec}.{ts,tsx,js,jsx}",
      "**/*.config.{ts,tsx,js,jsx}",
      "scripts/**/*.{ts,tsx,js,jsx}",
      "e2e/**/*.{ts,tsx,js,jsx}",
    ],
    // Drop back to the non-typed baseline where possible
    rules: {
      "@typescript-eslint/no-misused-promises": "off",
    },
  }
);
