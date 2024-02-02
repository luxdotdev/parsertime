"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { parseData } from "@/lib/parser";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Form, useForm } from "react-hook-form";
import { z } from "zod";
import { usePathname } from "next/navigation";

const XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const TXT = "text/plain";

const ACCEPTED_FILE_TYPES = [XLSX, TXT];

const MAX_FILE_SIZE = 1000000; // 1MB in bytes

const formSchema = z.object({
  file: z
    .any()
    .refine((file) => file !== null && file !== undefined, "File is required.")
    .refine(
      (file) => file && file.size <= MAX_FILE_SIZE,
      "Max file size is 1MB."
    )
    .refine(
      (file) => file && ACCEPTED_FILE_TYPES.includes(file.type),
      ".xlsx files are accepted."
    ),
});

export function AddMapCard() {
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  async function handleFile(file: File) {
    // pathname should look like this: /team/scrim/:id
    const scrimId = pathname.split("/")[3];

    toast({
      title: "Creating map...",
      description: "We are processing your data. Please wait.",
      duration: 5000,
    });

    const data = await parseData(file);

    const res = await fetch(`/api/add-map?id=${scrimId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast({
        title: "Map created",
        description: "Your map has been created successfully.",
        duration: 5000,
      });
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: `An error occurred: ${res.statusText} (${res.status})`,
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

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient)
    return (
      <Card className="border-dashed">
        <Skeleton className="w-24 h-24" />
      </Card>
    );

  return (
    <Form {...form} className="p-2 w-1/3">
      <form onDragEnter={handleDrag}>
        <FormField
          control={form.control}
          name="file"
          render={() => (
            <>
              <FormItem>
                <Card
                  className={cn(
                    "max-w-md h-48 flex flex-col justify-center items-center border-dashed",
                    dragActive && "border-green-500"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <CardHeader className="text-xl text-center">
                    <span className="inline-flex items-center justify-center space-x-2">
                      <PlusCircledIcon className="h-6 w-6" />{" "}
                      <span>Add a map...</span>
                    </span>
                  </CardHeader>
                  <CardDescription className="pb-4">
                    Drag and drop or select a file to upload.
                  </CardDescription>
                  <CardContent className="flex justify-center items-center">
                    <Input
                      type="file"
                      onChange={handleChange}
                      className="w-64"
                      accept=".xlsx, .txt"
                    />
                    <div className="pl-2" />
                  </CardContent>
                </Card>
              </FormItem>
            </>
          )}
        />
      </form>
    </Form>
  );
}
