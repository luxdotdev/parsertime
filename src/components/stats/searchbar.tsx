"use client";

import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormDescription,
  FormField,
  FormMessage,
} from "@/components/ui/form";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  username: z.string().min(3).max(20),
});

export function Searchbar() {
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    if (data.username.includes("#")) {
      // Remove the battle tag number
      data.username = data.username.split("#")[0];
    }

    router.push(`/stats/${data.username}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <Input
              {...field}
              placeholder="Enter a player name..."
              className="h-12 text-lg"
            />
          )}
        />
        <FormDescription>
          Search for a player to view their stats. You can search by username or
          their battle tag. Example:{" "}
          <span className="font-semibold">Spingar</span> or{" "}
          <span className="font-semibold">Spingar#1000</span>.
        </FormDescription>
        <FormMessage />
      </form>
      <Separator />
    </Form>
  );
}
