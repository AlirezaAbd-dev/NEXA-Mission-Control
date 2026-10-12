import React, { useRef, useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Image as ImageExtension } from "@tiptap/extension-image";
import { Link as LinkExtension } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Underline } from "@tiptap/extension-underline";
import { Highlight } from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Typography } from "@tiptap/extension-typography";

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  CodeSquare,
  Link2,
  Image as ImageIcon,
  Table as TableIcon,
  Undo2,
  Redo2,
  Minus,
  Upload,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Subscript as SubIcon,
  Superscript as SuperIcon,
  Palette,
  Eraser,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  onImageUpload?: (file: File) => Promise<string>;
  minHeight?: string;
  className?: string;
}

const COLOR_PALETTE = [
  { label: "Default", color: "inherit" },
  { label: "Teal (Brand)", color: "#0d9488" },
  { label: "Cyan", color: "#06b6d4" },
  { label: "Blue", color: "#3b82f6" },
  { label: "Indigo", color: "#6366f1" },
  { label: "Purple", color: "#a855f7" },
  { label: "Rose", color: "#f43f5e" },
  { label: "Amber", color: "#f59e0b" },
  { label: "Emerald", color: "#10b981" },
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = "Write a rich description… (supports markdown, pasting images, tables, code)",
  editable = true,
  onImageUpload,
  minHeight = "180px",
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkRange, setLinkRange] = useState<{ from: number; to: number } | null>(null);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: {
          HTMLAttributes: {
            class:
              "rounded-xl bg-slate-900 text-teal-300 dark:bg-black/80 dark:text-teal-300 p-4 font-mono text-xs my-2 overflow-x-auto border border-teal-500/20",
          },
        },
      }),
      TextStyle,
      Color,
      Underline,
      Subscript,
      Superscript,
      Typography,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: false,
        HTMLAttributes: {
          class:
            "bg-teal-500/20 text-teal-800 dark:text-teal-200 px-1 py-0.5 rounded",
        },
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-teal-600 dark:text-teal-400 underline font-medium hover:opacity-80 transition-opacity",
        },
      }),
      ImageExtension.configure({
        allowBase64: true,
        inline: false,
        HTMLAttributes: {
          class:
            "max-w-full h-auto rounded-xl border border-border/80 shadow-md my-3.5 object-cover cursor-pointer hover:ring-2 hover:ring-teal-500 transition-all",
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class:
            "w-full my-3 border-collapse border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden text-sm",
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class:
            "border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#132428] font-bold p-2 text-start",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class:
            "border border-slate-200 dark:border-white/10 p-2 text-start align-top",
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "space-y-1.5 my-2 list-none p-0",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "flex items-start gap-2",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (editor.isEmpty) {
        onChange("");
      } else {
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: "tiptap-content focus:outline-none min-h-[160px]",
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files?.length > 0) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            handleProcessImageFile(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith("image/")) {
              const file = items[i].getAsFile();
              if (file) {
                event.preventDefault();
                handleProcessImageFile(file);
                return true;
              }
            }
          }
        }
        return false;
      },
    },
  });

  // Sync content when modified externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      if (!content && editor.isEmpty) return;
      editor.commands.setContent(content || "");
    }
  }, [content, editor]);

  const handleProcessImageFile = async (file: File) => {
    if (!editor) return;
    setIsUploading(true);
    try {
      if (onImageUpload) {
        const url = await onImageUpload(file);
        if (url) {
          editor.chain().focus().setImage({ src: url, alt: file.name }).run();
          return;
        }
      }
      // Fallback: Read as base64 data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (base64) {
          editor.chain().focus().setImage({ src: base64, alt: file.name }).run();
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed to upload/read image:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenLinkModal = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    const prevUrl = editor.getAttributes("link").href || "";
    setLinkRange({ from, to });
    setLinkText(selectedText);
    setLinkUrl(prevUrl);
    setLinkModalOpen(true);
  };

  const handleAddLink = () => {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkModalOpen(false);
      return;
    }

    const href =
      linkUrl.startsWith("http://") || linkUrl.startsWith("https://")
        ? linkUrl.trim()
        : `https://${linkUrl.trim()}`;

    if (linkText.trim()) {
      if (linkRange && linkRange.from !== linkRange.to) {
        editor
          .chain()
          .focus()
          .setTextSelection({ from: linkRange.from, to: linkRange.to })
          .insertContent({
            type: "text",
            text: linkText,
            marks: [{ type: "link", attrs: { href } }],
          })
          .run();
      } else {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "text",
            text: linkText,
            marks: [{ type: "link", attrs: { href } }],
          })
          .run();
      }
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }

    setLinkModalOpen(false);
    setLinkUrl("");
    setLinkText("");
    setLinkRange(null);
  };

  const handleRemoveLink = () => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkModalOpen(false);
    setLinkUrl("");
    setLinkText("");
    setLinkRange(null);
  };

  const handleCopyText = async () => {
    if (!editor) return;
    const text = editor.getText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!editor) return null;

  // Character and Word counter
  const charCount = editor.storage.characterCount
    ? editor.storage.characterCount.characters()
    : editor.getText().length;
  const wordCount = editor.getText().trim()
    ? editor.getText().trim().split(/\s+/).length
    : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-background text-foreground transition-all duration-200 focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/20 dark:border-white/10 dark:bg-[#071316] shadow-2xs overflow-hidden flex flex-col",
        className,
      )}
    >
      {/* Hidden file input for Image Picker button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProcessImageFile(file);
          e.target.value = "";
        }}
      />

      {/* Editor Toolbar */}
      {editable && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border/60 bg-muted/40 dark:border-white/8 dark:bg-black/30 p-1.5 text-xs select-none sticky top-0 z-10 backdrop-blur-md">
          {/* Text Style: Headings */}
          <div className="flex items-center gap-0.5 border-r border-border/60 dark:border-white/10 pe-1.5 me-0.5">
            <button
              type="button"
              title="Heading 1"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={cn(
                "rounded-lg p-1.5 font-bold transition-colors cursor-pointer",
                editor.isActive("heading", { level: 1 })
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <Heading1 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Heading 2"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={cn(
                "rounded-lg p-1.5 font-bold transition-colors cursor-pointer",
                editor.isActive("heading", { level: 2 })
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <Heading2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Heading 3"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={cn(
                "rounded-lg p-1.5 font-bold transition-colors cursor-pointer",
                editor.isActive("heading", { level: 3 })
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <Heading3 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Formatting: Bold, Italic, Underline, Strike, Code, Sub, Super, Highlight */}
          <div className="flex items-center gap-0.5 border-r border-border/60 dark:border-white/10 pe-1.5 me-0.5">
            <button
              type="button"
              title="Bold (Ctrl+B)"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn(
                "rounded-lg p-1.5 font-bold transition-colors cursor-pointer",
                editor.isActive("bold")
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Italic (Ctrl+I)"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive("italic")
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Underline (Ctrl+U)"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive("underline")
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Strikethrough"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive("strike")
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Subscript"
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive("subscript")
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <SubIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Superscript"
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive("superscript")
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <SuperIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Inline Code"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive("code")
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <Code className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Highlight"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive("highlight")
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <Highlighter className="h-3.5 w-3.5" />
            </button>

            {/* Text Color Picker */}
            <div className="relative">
              <button
                type="button"
                title="Text Color"
                onClick={() => setColorMenuOpen(!colorMenuOpen)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition-colors cursor-pointer"
              >
                <Palette className="h-3.5 w-3.5" />
              </button>
              {colorMenuOpen && (
                <div className="absolute top-full start-0 mt-1.5 p-2 bg-popover border border-border rounded-xl shadow-xl z-30 flex items-center gap-1.5 backdrop-blur-xl">
                  {COLOR_PALETTE.map((col) => (
                    <button
                      key={col.label}
                      type="button"
                      title={col.label}
                      onClick={() => {
                        if (col.color === "inherit") {
                          editor.chain().focus().unsetColor().run();
                        } else {
                          editor.chain().focus().setColor(col.color).run();
                        }
                        setColorMenuOpen(false);
                      }}
                      className="h-5 w-5 rounded-full border border-black/10 dark:border-white/20 transition-transform hover:scale-125 cursor-pointer shadow-xs"
                      style={{
                        backgroundColor:
                          col.color === "inherit" ? "#94a3b8" : col.color,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Clear Formatting */}
            <button
              type="button"
              title="Clear Formatting"
              onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition-colors cursor-pointer"
            >
              <Eraser className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Alignment: Left, Center, Right, Justify */}
          <div className="flex items-center gap-0.5 border-r border-border/60 dark:border-white/10 pe-1.5 me-0.5">
            <button
              type="button"
              title="Align Left"
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive({ textAlign: "left" })
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Align Center"
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive({ textAlign: "center" })
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Align Right"
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive({ textAlign: "right" })
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Justify"
              onClick={() => editor.chain().focus().setTextAlign("justify").run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive({ textAlign: "justify" })
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <AlignJustify className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Lists: Bullet, Numbered, Checklist */}
          <div className="flex items-center gap-0.5 border-r border-border/60 dark:border-white/10 pe-1.5 me-0.5">
            <button
              type="button"
              title="Bullet List"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive("bulletList")
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Numbered List"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive("orderedList")
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Task Checklist"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive("taskList")
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <ListChecks className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Inserts: Blockquote, CodeBlock, Table, Divider */}
          <div className="flex items-center gap-0.5 border-r border-border/60 dark:border-white/10 pe-1.5 me-0.5">
            <button
              type="button"
              title="Blockquote"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive("blockquote")
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <Quote className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Code Block"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive("codeBlock")
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <CodeSquare className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Insert Table (3x3)"
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition-colors cursor-pointer"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Horizontal Divider"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground transition-colors cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Links & Rich Images */}
          <div className="flex items-center gap-0.5 border-r border-border/60 dark:border-white/10 pe-1.5 me-0.5">
            <button
              type="button"
              title="Add or Edit Link (Ctrl+K)"
              onClick={handleOpenLinkModal}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer flex items-center gap-1",
                editor.isActive("link")
                  ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <Link2 className="h-3.5 w-3.5" />
              <span className="text-[11px] hidden sm:inline">Link</span>
            </button>

            <button
              type="button"
              title="Upload / Embed Image"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg p-1.5 text-teal-600 dark:text-teal-400 hover:bg-teal-500/15 transition-colors cursor-pointer flex items-center gap-1 font-semibold"
            >
              {isUploading ? (
                <Upload className="h-3.5 w-3.5 animate-bounce" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
              <span className="text-[11px] hidden sm:inline">Image</span>
            </button>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 ms-auto">
            <button
              type="button"
              title="Undo (Ctrl+Z)"
              disabled={!editor.can().undo()}
              onClick={() => editor.chain().focus().undo().run()}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Redo (Ctrl+Y)"
              disabled={!editor.can().redo()}
              onClick={() => editor.chain().focus().redo().run()}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Advanced Link Popover Dialog */}
      {linkModalOpen && (
        <div className="p-3 border-b border-border/80 bg-muted/70 dark:bg-black/50 space-y-2 text-xs backdrop-blur-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1 text-primary">
              <Link2 className="h-3 w-3" />
              Insert / Edit Link
            </span>
            <span className="text-[10px] text-muted-foreground/80 font-normal">
              Press Enter to save · Esc to close
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                Display Text
              </label>
              <input
                type="text"
                placeholder="e.g. Click here, Documentation, Figma"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddLink();
                  } else if (e.key === "Escape") {
                    setLinkModalOpen(false);
                  }
                }}
                className="w-full rounded-xl border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                autoFocus={!linkText}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                Link URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/page"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddLink();
                  } else if (e.key === "Escape") {
                    setLinkModalOpen(false);
                  }
                }}
                className="w-full rounded-xl border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                autoFocus={Boolean(linkText)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {editor.isActive("link") ? (
              <button
                type="button"
                onClick={handleRemoveLink}
                className="text-[11px] text-rose-500 hover:underline font-semibold cursor-pointer"
              >
                Remove Link
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="rounded-lg px-2.5 py-1 text-muted-foreground hover:text-foreground cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddLink}
                className="rounded-lg px-3 py-1 bg-primary text-primary-foreground font-semibold cursor-pointer shadow-xs text-xs"
              >
                Save Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Content Area */}
      <div
        className="p-3.5 flex-1 cursor-text prose prose-sm dark:prose-invert max-w-none focus:outline-none"
        style={{ minHeight }}
        onClick={() => {
          if (!editor.isFocused) {
            editor.chain().focus().run();
          }
        }}
      >
        <EditorContent editor={editor} className="outline-none" />
      </div>

      {/* Table controls helper toolbar (shows when table is selected) */}
      {editable && editor.isActive("table") && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
          <span className="font-bold text-foreground">Table:</span>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="rounded px-1.5 py-0.5 hover:bg-muted dark:hover:bg-white/10"
          >
            + Col
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="rounded px-1.5 py-0.5 hover:bg-muted dark:hover:bg-white/10 text-rose-500"
          >
            - Col
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="rounded px-1.5 py-0.5 hover:bg-muted dark:hover:bg-white/10"
          >
            + Row
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="rounded px-1.5 py-0.5 hover:bg-muted dark:hover:bg-white/10 text-rose-500"
          >
            - Row
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="rounded px-1.5 py-0.5 hover:bg-muted dark:hover:bg-white/10 text-rose-600 font-semibold"
          >
            Delete Table
          </button>
        </div>
      )}

      {/* Status Bar / Word & Character Count */}
      <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 dark:border-white/5 px-3 py-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>

        <button
          type="button"
          onClick={handleCopyText}
          className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy text</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
