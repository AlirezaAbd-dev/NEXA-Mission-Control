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
  Sparkles,
  Upload,
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
      Underline,
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
      // If editor is empty or just has empty paragraph, return empty string
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

  const handleAddLink = () => {
    if (!editor) return;
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkModalOpen(false);
      return;
    }
    const href = linkUrl.startsWith("http://") || linkUrl.startsWith("https://")
      ? linkUrl
      : `https://${linkUrl}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkModalOpen(false);
    setLinkUrl("");
  };

  if (!editor) return null;

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

          {/* Formatting: Bold, Italic, Underline, Strike, Code, Highlight */}
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
              title="Add Link"
              onClick={() => {
                const prev = editor.getAttributes("link").href;
                setLinkUrl(prev || "");
                setLinkModalOpen(true);
              }}
              className={cn(
                "rounded-lg p-1.5 transition-colors cursor-pointer",
                editor.isActive("link")
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground",
              )}
            >
              <Link2 className="h-3.5 w-3.5" />
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

      {/* Quick link popover modal */}
      {linkModalOpen && (
        <div className="p-2 border-b border-border/80 bg-muted/60 dark:bg-black/40 flex items-center gap-2 text-xs">
          <input
            type="url"
            placeholder="https://example.com"
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
            className="flex-1 rounded-lg border border-border px-2 py-1 text-xs bg-background text-foreground outline-none focus:border-primary"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddLink}
            className="rounded-lg px-2.5 py-1 bg-primary text-primary-foreground font-semibold cursor-pointer"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setLinkModalOpen(false)}
            className="rounded-lg px-2 py-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Cancel
          </button>
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
    </div>
  );
};
