/* eslint-disable @typescript-eslint/no-misused-promises */
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";

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
      <button className="w-full p-0" type="submit" {...props}>
        Sign Out
      </button>
    </form>
  );
}
