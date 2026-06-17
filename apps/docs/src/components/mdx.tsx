import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Callout } from "./callout";

// R3F augments JSX.IntrinsicElements globally with strict-typed three.js
// primitives, which breaks the `satisfies MDXComponents` check. The
// resulting record is still valid at runtime; cast through `unknown`.
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Callout,
    ...components,
  } as unknown as MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
