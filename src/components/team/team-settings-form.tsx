"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AvatarUpdateDialog } from "@/components/team/avatar-update-dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import { ClientOnly } from "@/lib/client-only";
import { Team } from "@prisma/client";
import { ClipboardCopyIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useRef, useState } from "react";

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

export function TeamSettingsForm({ team }: { team: Team }) {
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: team.name ?? "",
    },
    mode: "onChange",
  });

  async function onSubmit(data: ProfileFormValues) {
    const reqBody = {
      name: data.name,
      teamId: team.id
    };

    const res = await fetch("/api/team/update-name", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reqBody),
    });

    if (res.ok) {
      toast({
        title: "Team profile updated",
        description: "Your team profile has been successfully updated.",
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
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
      setAvatarDialogOpen(true); // Open the dialog upon file selection
    }
  };

  return (
    <ClientOnly>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormItem>
            <FormLabel>Team Invite Link</FormLabel>
            <FormControl>
              <div className="items-center">
                <p>Your permanent team invite link (hover to reveal):</p>
                <code className="rounded bg-zinc-800 p-1 text-zinc-800 transition-colors hover:text-white">
                  https://parsertime.app/team/join/
                  {btoa(team.createdAt.toISOString())}
                </code>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ClipboardCopyIcon
                        className="ml-2 inline-block h-5 w-5 cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `https://parsertime.app/team/join/${btoa(
                              team.createdAt.toISOString()
                            )}`
                          );
                          toast({
                            title: "Copied to clipboard",
                            description:
                              "The team invite link has been copied to your clipboard.",
                            duration: 5000,
                          });
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>Click to copy</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </FormControl>
            <FormDescription>
              Please note that inviting a user via the &quot;Invite User&quot;
              button is much more secure. We suggest avoiding sharing this link
              whenever possible.
            </FormDescription>
          </FormItem>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Esports at Cornell"
                    defaultValue={team.name ?? ""}
                    className="max-w-lg"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  This is your team&apos;s public display name.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormItem>
            <FormLabel>Avatar</FormLabel>
            <FormControl aria-readonly>
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                  aria-label="File upload"
                />
                <Image
                  src={
                    team.image || `https://avatar.vercel.sh/${team.name}.png`
                  }
                  width={800}
                  height={800}
                  alt="User avatar"
                  className="h-16 w-16 cursor-pointer rounded-full"
                  onClick={handleAvatarClick}
                />
                <AvatarUpdateDialog
                  team={team}
                  isOpen={avatarDialogOpen}
                  setIsOpen={setAvatarDialogOpen}
                  selectedFile={selectedFile}
                />
              </>
            </FormControl>
            <FormDescription>
              This is your team&apos;s public avatar. Click on the avatar to
              upload a custom one from your files.
            </FormDescription>
            <FormMessage />
          </FormItem>
          <Button type="submit">Update team profile</Button>
        </form>
      </Form>
    </ClientOnly>
  );
}
