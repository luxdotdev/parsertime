"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@lux/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lux/ui/form";
import { Input } from "@lux/ui/input";
import { toast } from "@lux/ui/use-toast";
import { useEffect, useState } from "react";
import { Switch } from "@lux/ui/switch";

const adminFormSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  isProd: z.boolean().default(true),
});

type AdminFormValues = z.infer<typeof adminFormSchema>;

export function ImpersonateUserForm() {
  const form = useForm<AdminFormValues>({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      isProd: true,
    },
  });

  async function onSubmit(data: AdminFormValues) {
    try {
      const res = await fetch("/api/admin/impersonate-user", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("An error occurred while impersonating the user.");
      }

      const { url } = (await res.json()) as { url: string };

      await navigator.clipboard.writeText(url);

      toast({
        title: "User Impersonated",
        description: `The impersonation URL has been copied to your clipboard.`,
        duration: 5000,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "An error occurred while impersonating the user.",
        variant: "destructive",
      });
    }
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="lucas@lux.dev" defaultValue="" {...field} />
              </FormControl>
              <FormDescription>
                This is the email of the user you want to impersonate.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isProd"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Use Production Environment URL</FormLabel>
                <FormDescription>
                  If enabled, the impersonation URL will be generated for the
                  production environment. If disabled, the impersonation URL
                  will be generated for the development environment.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit">Impersonate User</Button>
      </form>
    </Form>
  );
}
