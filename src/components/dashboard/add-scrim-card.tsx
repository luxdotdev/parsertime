"use client";

import { CreateScrimButton } from "@/components/dashboard/create-scrim";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { FormField, FormItem } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { ClientOnly } from "@/lib/client-only";
import { parseDataFromXLSX } from "@/lib/parser";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Form, useForm } from "react-hook-form";
import { z } from "zod";

const ACCEPTED_FILE_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE = 1000000; // 1MB in bytes

export function AddScrimCard() {
  const t = useTranslations("dashboard.addScrim");
  const formSchema = z.object({
    file: z
      .any()
      .refine(
        (file) => file !== null && file !== undefined,
        t("handleFile.fileReq")
      )
      .refine(
        (file) => file && file.size <= MAX_FILE_SIZE,
        t("handleFile.fileMax")
      )
      .refine(
        (file) => file && ACCEPTED_FILE_TYPES.includes(file.type),
        t("handleFile.fileAccept")
      ),
  });
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleFile(file: File) {
    toast({
      title: t("handleFile.creatingTitle"),
      description: t("handleFile.creatingDescription"),
      duration: 5000,
    });

    const data = await parseDataFromXLSX(file);

    const res = await fetch("/api/scrim/create-scrim", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast({
        title: t("handleFile.createdTitle"),
        description: t("handleFile.createdDescription"),
        duration: 5000,
      });
      router.refresh();
    } else {
      toast({
        title: t("handleFile.errorTitle"),
        description: t("handleFile.errorDescription", {
          res: `${await res.text()} (${res.status})`,
        }),
        duration: 5000,
        variant: "destructive",
      });
    }

    // console.log(res);
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
      <Form {...form}>
        <form /*onDragEnter={handleDrag}*/>
          <FormField
            control={form.control}
            name="file"
            render={({ field }) => (
              <FormItem>
                <Card
                  className={cn(
                    "flex h-48 max-w-md flex-col items-center justify-center border-dashed"
                    // dragActive && "border-green-500"
                  )}
                  // onDragEnter={handleDrag}
                  // onDragLeave={handleDrag}
                  // onDragOver={handleDrag}
                  // onDrop={handleDrop}
                >
                  <CardHeader className="text-center text-xl">
                    <span className="inline-flex items-center justify-center space-x-2">
                      <PlusCircledIcon className="h-6 w-6" />{" "}
                      <span>{t("title")}</span>
                    </span>
                  </CardHeader>
                  <CardDescription className="pb-4">
                    {t("description")}
                  </CardDescription>
                  <CardContent className="flex items-center justify-center">
                    {/* <Input
                      type="file"
                      onChange={handleChange}
                      className="w-64"
                      accept=".xlsx"
                    />
                    <div className="pl-2" /> */}
                    <CreateScrimButton />
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
