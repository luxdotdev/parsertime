"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ClientOnly } from "@/lib/client-only";
import { parseData } from "@/lib/parser";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLinkIcon, PlusCircledIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Form, useForm } from "react-hook-form";
import { z } from "zod";

const XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const TXT = "text/plain";

const ACCEPTED_FILE_TYPES = [XLSX, TXT];

const MAX_FILE_SIZE = 1000000; // 1MB in bytes

export function AddMapCard() {
  const t = useTranslations("scrimPage");
  const formSchema = z.object({
    file: z
      .any()
      .refine(
        (file) => file !== null && file !== undefined,
        t("addMap.fileMessage.required")
      )
      .refine(
        (file) => file && file.size <= MAX_FILE_SIZE,
        t("addMap.fileMessage.maxSize")
      )
      .refine(
        (file) => file && ACCEPTED_FILE_TYPES.includes(file.type),
        t("addMap.fileMessage.accepted")
      ),
  });
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  async function handleFile(file: File) {
    // pathname should look like this: /team/scrim/:id
    const scrimId = pathname.split("/")[3];

    toast({
      title: t("addMap.handleFile.creatingTitle"),
      description: t("addMap.handleFile.creatingDescription"),
      duration: 5000,
    });

    const data = await parseData(file);

    const res = await fetch(`/api/scrim/add-map?id=${scrimId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast({
        title: t("addMap.handleFile.createTitle"),
        description: t("addMap.handleFile.createDescription"),
        duration: 5000,
      });
      router.refresh();
    } else {
      toast({
        title: t("addMap.handleFile.errorTitle"),
        description: (
          <p>
            {t("addMap.handleFile.errorDescription1")} {await res.text()} (
            {res.status}){t("addMap.handleFile.errorDescription2")}{" "}
            <Link
              href="https://docs.parsertime.app/#common-errors"
              target="_blank"
              className="underline"
            >
              {t("addMap.handleFile.errorLink")}
            </Link>{" "}
            <ExternalLinkIcon className="inline h-4 w-4" />{" "}
            {t("addMap.handleFile.errorDescription3")}
          </p>
        ),
        duration: 5000,
        variant: "destructive",
      });
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // at least one file has been selected so do something
      handleFile(e.dataTransfer.files[0]);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      // at least one file has been selected so do something
      handleFile(e.target.files[0]);
    }
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      file: null,
    },
  });

  return (
    <ClientOnly>
      <Form {...form} className="w-full p-2 md:w-1/3">
        <form onDragEnter={handleDrag}>
          <FormField
            control={form.control}
            name="file"
            render={() => (
              <FormItem>
                <Card
                  className={cn(
                    "flex h-48 max-w-md flex-col items-center justify-center border-dashed",
                    dragActive && "border-green-500"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <CardHeader className="text-center text-xl">
                    <span className="inline-flex items-center justify-center space-x-2">
                      <PlusCircledIcon className="h-6 w-6" />{" "}
                      <span>{t("addMap.title")}</span>
                    </span>
                  </CardHeader>
                  <CardDescription className="pb-4">
                    {t("addMap.description")}
                  </CardDescription>
                  <CardContent className="flex items-center justify-center">
                    <Label htmlFor="file" className="hidden">
                      {t("addMap.addFile")}
                    </Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={handleChange}
                      className="w-64"
                      accept=".xlsx, .txt"
                    />
                    <div className="pl-2" />
                  </CardContent>
                </Card>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </ClientOnly>
  );
}
