import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import Link from "next/link";

export default function NoAuthCard() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <Card className="h-48 max-w-md">
        <CardHeader>Not Authorized</CardHeader>
        <CardContent>
          <p>
            You are not authorized to view this page. Please log in first or
            check your account.
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/sign-in" className="underline">
            <Button>Sign in</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
