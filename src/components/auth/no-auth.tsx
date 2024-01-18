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
    <div className="flex flex-col items-center justify-center h-screen">
      <Card className="max-w-md h-48">
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
