import { Button } from "@/components/ui/button";
import { signIn, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export function SignInButton({
  provider,
  ...props
}: { provider?: string } & React.ComponentPropsWithRef<typeof Button>) {
  return (
    <form
      action={async () => {
        "use server";
        const url = await signIn(provider, { redirect: false });
        // TODO: fix in next-auth
        redirect(url.replace("signin", "api/auth/signin"));
      }}
    >
      <Button {...props}>Sign In</Button>
    </form>
  );
}

export function SignOutButton(
  props: React.ComponentPropsWithRef<typeof Button>
) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
      className="w-full"
    >
      <button className="w-full p-0" {...props}>
        Sign Out
      </button>
    </form>
  );
}
