"use client";
import { Toggle } from "@/components/ui/toggle";
import type { Editor } from "@tiptap/react";
import { useTranslations } from "next-intl";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  BlocksIcon,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Redo,
  Strikethrough,
  Undo,
} from "lucide-react";

type MenuOption = {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  pressed: boolean;
};

export function MenuBar({ editor }: { editor: Editor | null }) {
  const t = useTranslations("mapPage.tiptap.toolbar");

  if (!editor) {
    return null;
  }

  const options: MenuOption[] = [
    {
      id: "undo",
      label: t("undo"),
      icon: <Undo className="size-4" />,
      onClick: () => editor.chain().focus().undo().run(),
      pressed: editor.can().undo(),
    },
    {
      id: "redo",
      label: t("redo"),
      icon: <Redo className="size-4" />,
      onClick: () => editor.chain().focus().redo().run(),
      pressed: editor.can().redo(),
    },
    {
      id: "h1",
      label: t("h1"),
      icon: <Heading1 className="size-4" />,
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      pressed: editor.isActive("heading", { level: 1 }),
    },
    {
      id: "h2",
      label: t("h2"),
      icon: <Heading2 className="size-4" />,
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      pressed: editor.isActive("heading", { level: 2 }),
    },
    {
      id: "h3",
      label: t("h3"),
      icon: <Heading3 className="size-4" />,
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      pressed: editor.isActive("heading", { level: 3 }),
    },
    {
      id: "bold",
      label: t("bold"),
      icon: <Bold className="size-4" />,
      onClick: () => editor.chain().focus().toggleBold().run(),
      pressed: editor.isActive("bold"),
    },
    {
      id: "italic",
      label: t("italic"),
      icon: <Italic className="size-4" />,
      onClick: () => editor.chain().focus().toggleItalic().run(),
      pressed: editor.isActive("italic"),
    },
    {
      id: "strike",
      label: t("strike"),
      icon: <Strikethrough className="size-4" />,
      onClick: () => editor.chain().focus().toggleStrike().run(),
      pressed: editor.isActive("strike"),
    },
    {
      id: "codeblock",
      label: t("codeBlock"),
      icon: <BlocksIcon className="size-4" />,
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
      pressed: editor.isActive("codeBlock"),
    },
    {
      id: "left",
      label: t("alignLeft"),
      icon: <AlignLeft className="size-4" />,
      onClick: () => editor.chain().focus().setTextAlign("left").run(),
      pressed: editor.isActive({ textAlign: "left" }),
    },
    {
      id: "center",
      label: t("alignCenter"),
      icon: <AlignCenter className="size-4" />,
      onClick: () => editor.chain().focus().setTextAlign("center").run(),
      pressed: editor.isActive({ textAlign: "center" }),
    },
    {
      id: "right",
      label: t("alignRight"),
      icon: <AlignRight className="size-4" />,
      onClick: () => editor.chain().focus().setTextAlign("right").run(),
      pressed: editor.isActive({ textAlign: "right" }),
    },
    {
      id: "list",
      label: t("list"),
      icon: <List className="size-4" />,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      pressed: editor.isActive("bulletList"),
    },
    {
      id: "orderedList",
      label: t("orderedList"),
      icon: <ListOrdered className="size-4" />,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      pressed: editor.isActive("orderedList"),
    },
    {
      id: "highlight",
      label: t("highlight"),
      icon: <Highlighter className="size-4" />,
      onClick: () => editor.chain().focus().toggleHighlight().run(),
      pressed: editor.isActive("highlight"),
    },
  ];

  return (
    <div
      role="toolbar"
      aria-label={t("label")}
      className="flex flex-wrap items-center gap-1"
    >
      {options.map((option) => (
        <Toggle
          key={option.id}
          aria-label={option.label}
          pressed={option.pressed}
          onPressedChange={option.onClick}
          className="data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
        >
          {option.icon}
        </Toggle>
      ))}
    </div>
  );
}
