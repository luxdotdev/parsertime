import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function VerifyRequestPage() {
  return (
    <div className="flex h-[90vh] flex-col items-center justify-center space-y-6 p-6 text-center">
      <h1 className="text-3xl font-bold">
        Check your email for a sign-in link
      </h1>
      <p className="max-w-[600px] text-gray-500 dark:text-gray-400">
        We&apos;ve sent an email to you with a link to sign in. Click the link
        in the email to complete the sign-in process.
      </p>
      <Button className="mx-auto" asChild>
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
