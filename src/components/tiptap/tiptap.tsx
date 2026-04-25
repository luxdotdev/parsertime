"use client";

import { MenuBar } from "@/components/tiptap/menu-bar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { noteDataSchema } from "@/lib/utils";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

async function saveNotes(mapDataId: number, scrimId: number, content: string) {
  const response = await fetch("/api/scrim/edit-note", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mapDataId, scrimId, content }),
  });
  if (!response.ok) {
    throw new Error("Failed to save notes");
  }

  const data = noteDataSchema.parse(await response.json());

  return data;
}

export function TipTap({
  noteContent,
  mapDataId,
  scrimId,
}: {
  noteContent: string;
  mapDataId: number;
  scrimId: number;
}) {
  const t = useTranslations("mapPage.tiptap");

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savedContentRef = useRef(noteContent);

  const editor = useEditor({
    content: noteContent,
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
          "min-h-[300px] p-4 border border-border rounded-md bg-background prose prose-sm sm:prose focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring dark:prose-invert max-w-full",
      },
    },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setHasUnsavedChanges(editor.getHTML() !== savedContentRef.current);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === noteContent) return;
    savedContentRef.current = noteContent;
    editor.commands.setContent(noteContent);
  }, [noteContent, editor]);

  async function handleSave() {
    if (!editor) return;
    setIsSaving(true);
    try {
      await saveNotes(mapDataId, scrimId, editor.getHTML());
      savedContentRef.current = editor.getHTML();
      setHasUnsavedChanges(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("notes")}</CardTitle>
        <p className="text-muted-foreground text-sm">{t("placeholder")}</p>

        <MenuBar editor={editor} />
      </CardHeader>
      <CardContent className="max-w-full">
        <EditorContent editor={editor} />
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <span aria-live="polite" className="text-muted-foreground text-sm">
          {hasUnsavedChanges ? t("unsavedChanges") : ""}
        </span>
        <Button
          onClick={handleSave}
          disabled={!hasUnsavedChanges || isSaving}
          aria-busy={isSaving}
        >
          {isSaving ? t("saving") : t("save")}
        </Button>
      </CardFooter>
    </Card>
  );
}
