"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { ClientOnly } from "@/lib/client-only";
import { Scrim } from "@prisma/client";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useState } from "react";

const profileFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(30, {
      message: "Name must not be longer than 30 characters.",
    }),
  guestMode: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function EditScrimForm({ scrim }: { scrim: Scrim }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: scrim.name ?? "",
      guestMode: scrim.guestMode,
    },
    mode: "onChange",
  });

  async function onSubmit(data: ProfileFormValues) {
    setLoading(true);
    const reqBody = {
      name: data.name.trim(),
      scrimId: scrim.id,
      guestMode: data.guestMode,
    };

    const res = await fetch("/api/scrim/update-scrim-options", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reqBody),
    });

    if (res.ok) {
      toast({
        title: "Scrim updated",
        description: "Your scrim has been successfully updated.",
        duration: 5000,
      });
      router.refresh();
    } else {
      toast({
        title: "An error occurred",
        description: `An error occurred: ${await res.text()} (${res.status})`,
        variant: "destructive",
        duration: 5000,
      });
    }
    setLoading(false);
  }

  return (
    <ClientOnly>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="FIU Panthers vs UF Gators"
                    defaultValue={scrim.name ?? ""}
                    className="max-w-lg"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  This is your scrim&apos;s name. This will show on your
                  dashboard.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="guestMode"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md  shadow">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Enable Guest Mode</FormLabel>
                  <FormDescription className="max-w-[450px]">
                    If enabled, the scrim will be accessible to any logged in
                    user. If disabled, only your team members will be able to
                    access the scrim.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> Updating...
              </>
            ) : (
              "Update scrim"
            )}
          </Button>
        </form>
      </Form>
    </ClientOnly>
  );
}
