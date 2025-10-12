"use client";

import { MenuBar } from "@/components/tiptap/menu-bar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useTranslations } from "next-intl";

export function TipTap() {
  const t = useTranslations("mapPage.tiptap");
  const editor = useEditor({
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
        enableTabIndentation: "true",
        class:
          "min-h-[300px] p-4 border border-muted rounded-lg bg-background prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring dark:prose-invert max-w-full",
      },
    },
    content: "",
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
