"use client";

import { MenuBar } from "@/components/tiptap/menu-bar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import z from "zod";

export const noteDataSchema = z.object({
  scrimId: z.number(),
  mapDataId: z.number(),
  content: z.string(),
});

async function fetchNotes(mapDataId: number, scrimId: number, content: string) {
  const response = await fetch("/api/scrim/edit-note", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mapDataId, scrimId, content }),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch notes");
  }
  const data = noteDataSchema.parse(await response.json());

  return data;
}

export function TipTap() {
  const t = useTranslations("mapPage.tiptap");

  const pathname = usePathname();
  const pathSegments = pathname.split("/");

  const scrimId = Number(pathSegments[3]);
  const mapDataId = Number(pathSegments[5]);

  const {
    data: noteData,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["fetch-scrim-notes"],
    queryFn: async () => {
      return fetchNotes(mapDataId, scrimId, "");
    },
  });

  const content = isError
    ? "Error loading notes."
    : isLoading
      ? "Loading notes..."
      : noteData?.content;

  const editor = useEditor({
    content,
    extensions: [
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: {
            class: "list-disc ml-4",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal ml-4",
          },
        },
        codeBlock: {
          enableTabIndentation: true,
        },
      }),
      Highlight,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "min-h-[300px] p-4 border border-muted rounded-lg bg-background prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring dark:prose-invert max-w-full",
      },
    },
    immediatelyRender: false,
  });

  return (
    <Card className="border-muted shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t("notes")}</CardTitle>
        <p className="text-muted-foreground text-sm">{t("placeholder")}</p>

        <MenuBar editor={editor} />
      </CardHeader>
      <CardContent className="max-w-full">
        <EditorContent editor={editor} />
      </CardContent>
      <CardFooter />
    </Card>
  );
}
