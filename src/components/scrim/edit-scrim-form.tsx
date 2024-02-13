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
import { toast } from "@/components/ui/use-toast";
import { Scrim } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DangerZone } from "@/components/scrim/danger-zone";

const profileFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(30, {
      message: "Name must not be longer than 30 characters.",
    }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function EditScrimForm({ scrim }: { scrim: Scrim }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: scrim.name ?? "",
    },
    mode: "onChange",
  });

  async function onSubmit(data: ProfileFormValues) {
    setLoading(true);
    const reqBody = {
      name: data.name,
      scrimId: scrim.id,
    };

    const res = await fetch("/api/update-scrim-name", {
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
        description: `An error occurred: ${res.statusText} (${res.status})`,
        variant: "destructive",
        duration: 5000,
      });
    }
    setLoading(false);
  }

  // fix LastPass hydration issue
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
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
                  placeholder={"FIU Panthers vs UF Gators"}
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

        <DangerZone scrim={scrim} />

        <Button type="submit" disabled={loading}>
          Update scrim
        </Button>
      </form>
    </Form>
  );
}
