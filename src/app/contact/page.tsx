"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import Logger from "@/lib/logger";
import { EnvelopeIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { EnvelopeOpenIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  name: z
    .string({
      required_error: "A name is required.",
    })
    .min(1),
  email: z
    .string({
      required_error: "An email is required.",
    })
    .email({
      message: "Please enter a valid email address.",
    }),
  message: z
    .string({
      required_error: "A message is required.",
    })
    .min(1, {
      message: "Please enter a message.",
    }),
});

export default function ContactPage() {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  async function handleSubmit(data: z.infer<typeof formSchema>) {
    setLoading(true);

    try {
      const res = await fetch("/api/send-contact-form-email", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast({
          title: "Message sent",
          description: "Your message has been sent successfully.",
          duration: 5000,
        });
        form.reset();
      } else {
        Logger.error("Error sending email", res.statusText);
        toast({
          title: "Error",
          description: `An error occurred: ${res.statusText} (${res.status})`,
          duration: 5000,
          variant: "destructive",
        });
      }
    } catch (error) {
      Logger.error("Error sending email", error);
      toast({
        title: "An error occurred",
        description:
          "An error occurred while sending your message. Please try again later.",
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
    <div className="relative isolate bg-white dark:bg-black h-[90vh]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-2">
        <div className="relative px-6 pb-20 pt-24 sm:pt-32 lg:static lg:px-8 lg:py-48">
          <div className="mx-auto max-w-xl lg:mx-0 lg:max-w-lg">
            <div className="absolute inset-y-0 left-0 -z-10 w-full bg-gray-100 dark:bg-black overflow-hidden ring-1 ring-gray-900/10 dark:ring-white/5 lg:w-1/2">
              <svg
                className="hidden dark:flex absolute inset-0 h-full w-full stroke-gray-200 dark:stroke-gray-700 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
                aria-hidden="true"
              >
                <defs>
                  <pattern
                    id="54f88622-e7f8-4f1d-aaf9-c2f5e46dd1f2"
                    width={200}
                    height={200}
                    x="100%"
                    y={-1}
                    patternUnits="userSpaceOnUse"
                  >
                    <path d="M130 200V.5M.5 .5H200" fill="none" />
                  </pattern>
                </defs>
                <svg
                  x="100%"
                  y={-1}
                  className="overflow-visible fill-gray-200/20 dark:fill-gray-800/20"
                >
                  <path d="M-470.5 0h201v201h-201Z" strokeWidth={0} />
                </svg>
                <rect
                  width="100%"
                  height="100%"
                  strokeWidth={0}
                  fill="url(#54f88622-e7f8-4f1d-aaf9-c2f5e46dd1f2)"
                />
              </svg>
              <svg
                className="dark:hidden absolute inset-0 h-full w-full stroke-gray-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
                aria-hidden="true"
              >
                <defs>
                  <pattern
                    id="83fd4e5a-9d52-42fc-97b6-718e5d7ee527"
                    width={200}
                    height={200}
                    x="100%"
                    y={-1}
                    patternUnits="userSpaceOnUse"
                  >
                    <path d="M130 200V.5M.5 .5H200" fill="none" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" strokeWidth={0} fill="white" />
                <svg x="100%" y={-1} className="overflow-visible fill-gray-50">
                  <path d="M-470.5 0h201v201h-201Z" strokeWidth={0} />
                </svg>
                <rect
                  width="100%"
                  height="100%"
                  strokeWidth={0}
                  fill="url(#83fd4e5a-9d52-42fc-97b6-718e5d7ee527)"
                />
              </svg>
              <div
                className="hidden dark:flex absolute -left-56 top-[calc(100%-13rem)] transform-gpu blur-3xl lg:left-[max(-14rem,calc(100%-59rem))] lg:top-[calc(50%-7rem)]"
                aria-hidden="true"
              >
                <div
                  className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-br from-[#80caff] to-[#4f46e5] opacity-20"
                  style={{
                    clipPath:
                      "polygon(74.1% 56.1%, 100% 38.6%, 97.5% 73.3%, 85.5% 100%, 80.7% 98.2%, 72.5% 67.7%, 60.2% 37.8%, 52.4% 32.2%, 47.5% 41.9%, 45.2% 65.8%, 27.5% 23.5%, 0.1% 35.4%, 17.9% 0.1%, 27.6% 23.5%, 76.1% 2.6%, 74.1% 56.1%)",
                  }}
                />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Get in touch
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-700 dark:text-gray-300">
              Having issues with the app? Want to request a feature? We&apos;d
              love to hear from you! Send us a message and we&apos;ll get back
              to you as soon as we can.
            </p>
            <dl className="mt-10 space-y-4 text-base leading-7 text-gray-700 dark:text-gray-300">
              <div className="flex gap-x-4">
                <dt className="flex-none">
                  <span className="sr-only">Discord</span>
                  <UserGroupIcon
                    className="h-7 w-6 text-gray-800 dark:text-gray-400"
                    aria-hidden="true"
                  />
                </dt>
                <dd>
                  <Link
                    className="hover:text-black dark:hover:text-white"
                    href="https://discord.gg/svz3qhVDXM"
                  >
                    <span className="inline-flex items-center gap-1">
                      Community Discord <ExternalLinkIcon />
                    </span>
                  </Link>
                </dd>
              </div>
              <div className="flex gap-x-4">
                <dt className="flex-none">
                  <span className="sr-only">Email</span>
                  <EnvelopeIcon
                    className="h-7 w-6 text-gray-800 dark:text-gray-400"
                    aria-hidden="true"
                  />
                </dt>
                <dd>
                  <Link
                    className="hover:text-black dark:hover:text-white"
                    href="mailto:help@parsertime.app"
                  >
                    help@parsertime.app
                  </Link>
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="px-6 pb-24 pt-20 sm:pb-32 lg:px-8 lg:py-48"
          >
            <div className="mx-auto max-w-xl lg:mr-0 lg:max-w-lg">
              <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                          Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            name="name"
                            id="name"
                            autoComplete="given-name"
                            value={field.value}
                            className="block w-full rounded-md border-0 dark:bg-white/5 px-3.5 py-2 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-sky-600 dark:focus:ring-sky-500 sm:text-sm sm:leading-6"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            name="email"
                            id="email"
                            autoComplete="email"
                            value={field.value}
                            className="block w-full rounded-md border-0 dark:bg-white/5 px-3.5 py-2 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-sky-600 dark:focus:ring-sky-500 sm:text-sm sm:leading-6"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                          Message
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            name="message"
                            id="message"
                            autoComplete="message"
                            value={field.value}
                            className="block w-full rounded-md border-0 dark:bg-white/5 px-3.5 py-2 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-sky-600 dark:focus:ring-sky-500 sm:text-sm sm:leading-6"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <Button
                  type="submit"
                  className="rounded-md bg-sky-500 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <EnvelopeOpenIcon className="mr-2 h-4 w-4" />
                      Send message
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
