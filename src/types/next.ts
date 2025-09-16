import { AppRoutes } from "../../.next/types/routes";

export type SearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

export type PagePropsWithLocale<T extends AppRoutes> = PageProps<T> & {
  params: Promise<{ locale: string }>;
};
