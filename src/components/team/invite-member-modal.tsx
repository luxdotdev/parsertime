"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  email: z.string().email().min(1, "Email is required"),
});

export default function InviteMemberModal({
  showInviteMemberModal,
  setShowInviteMemberModal,
}: {
  showInviteMemberModal: boolean;
  setShowInviteMemberModal: (show: boolean) => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const params = useParams<{ teamId: string }>();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const getToken = await fetch(
      `/api/team/create-team-invite?id=${params.teamId}`,
      {
        method: "POST",
      }
    );
    if (!getToken.ok) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `An error occurred: ${await getToken.text()} (${getToken.status})`,
      });
      setLoading(false);
      return;
    }

    const token = (await getToken.json()) as { token: string };

    const res = await fetch(
      `/api/send-team-invite?email=${values.email}&token=${token.token}`,
      {
        method: "POST",
      }
    );

    if (res.ok) {
      setShowInviteMemberModal(false);
      toast({
        title: "Invite sent!",
        description: "Your invitation has been sent successfully.",
      });
      setLoading(false);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: `An error occurred: ${await res.text()} (${res.status})${res.status === 404 ? ". Have you ensured the user is signed up?" : ""}`,
      });
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={showInviteMemberModal}
      onOpenChange={setShowInviteMemberModal}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Invite a new member to allow them to see your team&apos;s scrims.
            The user must be signed up to receive the invite.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <div className="space-y-4 py-2 pb-4">
                  <div className="space-y-2">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="lucas@lux.dev" {...field} />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowInviteMemberModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    Sending invite...
                  </>
                ) : (
                  "Send Invite"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
