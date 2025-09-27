"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/components/ui/link";
import { Separator } from "@/components/ui/separator";
import { parseData } from "@/lib/parser";
import { ParserDataSchema } from "@/lib/schema";
import { cn, detectCorruptedData } from "@/lib/utils";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { JsonEditor } from "json-edit-react";
import { useTranslations } from "next-intl";
import { startTransition, useState } from "react";
import { toast } from "sonner";

const defaultData = {
  kill: [
    [
      "kill",
      35.2,
      "Team 1",
      "lux",
      "Ana",
      "Team 2",
      "Spingar",
      "Widowmaker",
      "Primary Fire",
      60.98,
      "True",
      "0",
    ],
  ],
};

export default function DebugPage() {
  const [data, setData] = useState<object>(defaultData);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const t = useTranslations("dataCorruption");

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

    if (e.dataTransfer.files?.[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      await handleFile(file);
    });
  }

  async function handleFile(file: File) {
    // Check for corrupted data before parsing
    const fileContent = await file.text();
    const corruptionInfo = detectCorruptedData(fileContent);

    if (corruptionInfo.isCorrupted) {
      let warningMessage = t("warning.baseDescription");

      if (corruptionInfo.hasInvalidMercyRez) {
        warningMessage += `\n${t("warning.invalidMercyRez")}`;
      }
      if (corruptionInfo.hasAsterisks) {
        warningMessage += `\n${t("warning.asteriskValues")}`;
      }

      toast.warning(t("warning.title"), {
        description: warningMessage,
        duration: 8000,
      });
    }

    const data = await parseData(file);

    setData(data);

    const result = ParserDataSchema.safeParse(data);

    if (!result.success) {
      const errorMessages = result.error.issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");

      setErrors(
        result.error.issues.map(
          (err) => `${err.path.join(".")}: ${err.message}`
        )
      );

      toast.error("Invalid data", {
        description: errorMessages,
        duration: 5000,
      });
    } else {
      setErrors([]);
    }
  }

  return (
    <main className="space-y-4 p-8 pt-6 lg:flex-1">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Debug Assistant</h2>
      </div>
      <div className="justify-center gap-4 space-y-4 lg:flex lg:space-y-0">
        <div className="flex flex-col items-center gap-4">
          <Card
            className={cn(
              "flex h-48 w-full max-w-md flex-col items-center justify-center border-dashed",
              dragActive && "border-green-500"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <CardHeader className="flex items-center justify-center text-xl">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <PlusCircledIcon className="h-6 w-6" />
                <span>Add a file...</span>
              </div>
            </CardHeader>
            <CardDescription className="pb-4">
              Drag and drop or select a file to upload.
            </CardDescription>
            <CardContent className="flex items-center justify-center">
              <Label htmlFor="file" className="hidden">
                Add a file
              </Label>
              <Input
                id="file_uploader"
                type="file"
                accept=".txt"
                className="w-64"
                onChange={handleChange}
              />
              <div className="pl-2" />
            </CardContent>
          </Card>

          {errors.length > 0 && (
            <Card className="destructive border-destructive bg-destructive text-destructive-background group flex w-full max-w-md flex-col">
              <CardHeader>Errors</CardHeader>
              <CardContent>
                <ul>
                  {errors.map((error) => (
                    <li key={error} className="list-inside list-decimal">
                      {error}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {errors.length === 0 && (
            <Card className="w-full max-w-md bg-green-700">
              <p className="p-2 pl-4 text-white">✅ No errors detected.</p>
            </Card>
          )}

          <div className="max-w-sm">
            <p className="text-muted-foreground text-sm">
              Drag and drop a file to convert it to a JSON object. You can then
              view the data and see any errors with the data.
            </p>
            <p className="pt-4">How to read the error messages:</p>
            <ul className="list-inside list-disc pl-4">
              <li>
                <span className="font-semibold">Path:</span> The path to the
                error in the JSON object.
              </li>
              <li>
                <span className="font-semibold">Message:</span> The error
                message.
              </li>
            </ul>
            <p className="text-muted-foreground pt-4 text-sm">
              The path is formatted like this:{" "}
              <code className="text-foreground">`key.index.index`</code>. For
              example, seeing an error that says{" "}
              <code className="text-foreground">`match_start.0.0`</code> means
              that the error is in the{" "}
              <code className="text-foreground">`match_start`</code> array at
              index <code className="text-foreground">`0`</code> (which is also
              an array) and the error is at position{" "}
              <code className="text-foreground">`0`</code> in that array.
            </p>
            <p className="pt-6">
              <Link href="https://parserti.me/schema" external>
                View the schema documentation
              </Link>
            </p>
          </div>
        </div>

        <Separator className="lg:hidden" />
        <Separator orientation="vertical" className="hidden lg:flex" />

        <div className="flex flex-col items-center">
          <JsonEditor
            data={data}
            // theme={"githubDark" as ThemeInput}
            restrictEdit
            restrictAdd
            restrictDelete
            restrictDrag
            rootName="parsedData"
            collapse={1}
            onUpdate={({ newData }) => {
              const isValid = ParserDataSchema.safeParse(newData);
              if (!isValid.success) {
                const errorMessages = isValid.error.issues
                  .map((err) => `${err.path.join(".")}: ${err.message}`)
                  .join("\n");

                toast.error("Invalid data", {
                  description: errorMessages,
                  duration: 5000,
                });

                return "Schema validation failed";
              }
            }}
            maxWidth={400}
            minWidth={400}
          />
        </div>
      </div>
    </main>
  );
}
