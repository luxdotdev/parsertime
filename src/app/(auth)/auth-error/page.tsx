import { Button } from "@/components/ui/button";
import { SearchParams } from "@/types/next";
import Link from "next/link";

type Props = { searchParams: SearchParams };

type Error =
  | "Configuration"
  | "AccessDenied"
  | "Verification"
  | "AuthorizedCallbackError"
  | "Default";

export default function AuthErrorPage({ searchParams }: Props) {
  const error = searchParams.error as Error;

  const errorMessages = {
    Configuration:
      "There was an error with the server configuration. Please contact support.",
    AccessDenied:
      "Access was denied. The app may be in private beta. Please contact support if you believe this to be in error.",
    AuthorizedCallbackError:
      "Access was denied. The app may be in private beta. Please contact support if you believe this to be in error.",
    Verification:
      "The token has expired or has already been used. Please try again.",
    Default: "There was an unknown error signing in. Please contact support.",
  };

  return (
    <div className="flex flex-col items-center justify-center h-[90vh] p-6 space-y-6 text-center">
      <h1 className="text-3xl font-bold">There was an error signing in</h1>
      <p className="max-w-[600px] text-gray-500 dark:text-gray-400">
        <span className="font-bold">Error:</span>{" "}
        {errorMessages[error] ?? errorMessages.Default}
      </p>
      <p className="max-w-[600px] text-gray-500 dark:text-gray-400">
        Please try again. If the problem persists, please contact support at{" "}
        <Link href="mailto:help@parsertime.app" className="underline">
          help@parsertime.app.
        </Link>
      </p>
      <div className="flex space-x-4">
        <Button className="mx-auto" variant="outline" asChild>
          <Link href="/">Back to Home</Link>
        </Button>
        <Button className="mx-auto" asChild>
          <Link href="/sign-in">Sign In</Link>
        </Button>
      </div>
    </div>
  );
}
