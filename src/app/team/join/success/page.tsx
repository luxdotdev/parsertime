"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TeamJoinSuccessPage() {
  const { toast } = useToast();
  const router = useRouter();

  // Show a success message if the user has successfully joined the team
  toast({
    title: "Joined team",
    description:
      "You have successfully joined the team. Redirecting you to your dashboard.",
    duration: 5000,
  });

  // Redirect the user to the dashboard after 5 seconds
  setTimeout(() => {
    router.push("/dashboard");
  }, 4900);

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <Card className="h-48 max-w-md">
        <CardHeader className="scroll-m-20 text-xl font-semibold tracking-tight">
          Success!
        </CardHeader>
        <CardContent>
          <p>You have successfully joined the team.</p>
          <p>
            Redirecting you to your dashboard. If you are not redirected,{" "}
            <Link href="/dashboard" className="underline">
              click here
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
