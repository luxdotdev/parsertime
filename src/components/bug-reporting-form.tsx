"use client";

import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User } from "@prisma/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { usePathname } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";
import { ReloadIcon } from "@radix-ui/react-icons";

const formSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  email: z.string(),
  url: z.string(),
});

export function BugReportForm({
  user,
  setReportDialogOpen,
}: {
  user: User | null;
  setReportDialogOpen: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: user?.email ?? "unknown",
      url: `${process.env.NEXT_PUBLIC_VERCEL_URL ?? ""}${pathname}`,
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setLoading(true);

    const res = await fetch("/api/reporting/submit-bug-report", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast({
        title: "Bug report submitted",
        description: "Thank you for your help!",
        duration: 5000,
      });
      setReportDialogOpen(false);
    } else {
      toast({
        title: "Error",
        description: "An error occurred while submitting your bug report.",
        duration: 5000,
        variant: "destructive",
      });
    }

    setLoading(false);
  }

  return (
    <DialogHeader>
      <DialogTitle>Report a Bug</DialogTitle>
      <DialogDescription className="pb-2">
        If you&apos;ve found a bug, please report it to us. We appreciate your
        help in making Parsertime better.
      </DialogDescription>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Cannot remove scrim..." {...field} />
                </FormControl>
                <FormDescription>
                  The title of the bug report. Be concise and descriptive.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Type your message here." {...field} />
                </FormControl>
                <FormDescription>
                  Describe the bug you found. Include as much detail as
                  possible.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="user@example.com"
                    defaultValue={field.value}
                    disabled={!!user}
                  />
                </FormControl>
                <FormDescription>
                  The email address for the currently logged in user.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="path/to/page"
                    defaultValue={`${process.env.NEXT_PUBLIC_VERCEL_URL ?? ""}${pathname}`}
                    disabled
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The URL of the page where the bug was found.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading} className="float-right">
            {loading ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                Submitting...
              </>
            ) : (
              "Submit Bug Report"
            )}
          </Button>
        </form>
      </Form>
    </DialogHeader>
  );
}
