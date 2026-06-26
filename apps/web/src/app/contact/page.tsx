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
import { ClientOnly } from "@/lib/client-only";
import { Logger } from "@/lib/logger";
import { EnvelopeIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { EnvelopeOpenIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

export default function ContactPage() {
  const t = useTranslations("contactPage");

  const [loading, setLoading] = useState(false);

  const formSchema = z.object({
    name: z
      .string({
        error: t("contactForm.nameRequiredError"),
      })
      .min(1),
    email: z.email({
      message: t("contactForm.emailMessage"),
    }),
    message: z
      .string({
        error: t("contactForm.messageRequiredError"),
      })
      .min(1, {
        message: t("contactForm.messageMessage"),
      }),
  });

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
        toast.success(t("contactForm.handleSubmit.title"), {
          description: t("contactForm.handleSubmit.description"),
          duration: 5000,
        });
        form.reset();
      } else {
        Logger.error("Error sending email", res.statusText);
        toast.error(t("contactForm.handleSubmit.errorTitle1"), {
          description: t("contactForm.handleSubmit.errorDescription1", {
            res: `${await res.text()} (${res.status})`,
          }),
          duration: 5000,
        });
      }
    } catch (error) {
      Logger.error("Error sending email", error);
      toast.error(t("contactForm.handleSubmit.errorTitle2"), {
        description: t("contactForm.handleSubmit.errorDescription2"),
        duration: 5000,
      });
    }

    setLoading(false);
  }
  return (
    <div className="relative isolate bg-white xl:h-[90vh] dark:bg-black">
      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-2">
        <div className="relative px-6 pt-24 pb-20 sm:pt-32 lg:static lg:px-8 lg:py-48">
          <div className="mx-auto max-w-xl lg:mx-0 lg:max-w-lg">
            <div className="absolute inset-y-0 left-0 -z-10 w-full overflow-hidden bg-gray-100 ring-1 ring-gray-900/10 lg:w-1/2 dark:bg-black dark:ring-white/5">
              <svg
                className="absolute inset-0 hidden h-full w-full [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-gray-200 dark:flex dark:stroke-gray-700"
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
                className="absolute inset-0 h-full w-full [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-gray-200 dark:hidden"
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
                className="absolute top-[calc(100%-13rem)] -left-56 hidden transform-gpu blur-3xl lg:top-[calc(50%-7rem)] lg:left-[max(-14rem,calc(100%-59rem))] dark:flex"
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
              {t("contactForm.title")}
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-700 dark:text-gray-300">
              {t("contactForm.description")}
            </p>
            <dl className="mt-10 space-y-4 text-base leading-7 text-gray-700 dark:text-gray-300">
              <div className="flex gap-x-4">
                <dt className="flex-none">
                  <span className="sr-only">{t("contactForm.discord")}</span>
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
                      {t("contactForm.discord")} <ExternalLinkIcon />
                    </span>
                  </Link>
                </dd>
              </div>
              <div className="flex gap-x-4">
                <dt className="flex-none">
                  <span className="sr-only">{t("contactForm.email")}</span>
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
        <ClientOnly>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="px-6 pt-20 pb-24 sm:pb-32 lg:px-8 lg:py-48"
            >
              <div className="mx-auto max-w-xl lg:mr-0 lg:max-w-lg">
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="block text-sm leading-6 font-semibold text-gray-900 dark:text-white">
                            {t("contactForm.name")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              name="name"
                              id="name"
                              autoComplete="given-name"
                              value={field.value}
                              className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset focus:ring-2 focus:ring-sky-600 focus:ring-inset sm:text-sm sm:leading-6 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:focus:ring-sky-500"
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
                          <FormLabel className="block text-sm leading-6 font-semibold text-gray-900 dark:text-white">
                            {t("contactForm.email")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              name="email"
                              id="email"
                              autoComplete="email"
                              value={field.value}
                              className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset focus:ring-2 focus:ring-sky-600 focus:ring-inset sm:text-sm sm:leading-6 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:focus:ring-sky-500"
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
                          <FormLabel className="block text-sm leading-6 font-semibold text-gray-900 dark:text-white">
                            {t("contactForm.message")}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              name="message"
                              id="message"
                              autoComplete="message"
                              value={field.value}
                              className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset focus:ring-2 focus:ring-sky-600 focus:ring-inset sm:text-sm sm:leading-6 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:focus:ring-sky-500"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button
                    type="submit"
                    className="rounded-md bg-sky-500 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-sky-400 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        {t("contactForm.sending")}
                      </>
                    ) : (
                      <>
                        <EnvelopeOpenIcon className="mr-2 h-4 w-4" />
                        {t("contactForm.send")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </ClientOnly>
      </div>
    </div>
  );
}
