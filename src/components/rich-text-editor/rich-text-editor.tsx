"use client";

import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
	Bold,
	Highlighter,
	Italic,
	Link as LinkIcon,
	List,
	ListOrdered,
	Palette,
	Quote,
	Redo,
	Strikethrough,
	Type,
	Underline as UnderlineIcon,
	Undo,
	Unlink,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { useAutoSave, useBeforeUnload } from "@/hooks";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
	content: string;
	onChange: (content: string) => void;
	onLocalUpdate?: (content: string) => void;
	placeholder?: string;
	className?: string;
	minHeight?: string;
	showToolbar?: boolean;
	toolbarPosition?: "top" | "bottom";
}

const FONT_FAMILIES = [
	{ value: "Inter", label: "Inter" },
	{ value: "Arial", label: "Arial" },
	{ value: "Georgia", label: "Georgia" },
	{ value: "Times New Roman", label: "Times New Roman" },
	{ value: "Verdana", label: "Verdana" },
	{ value: "Roboto", label: "Roboto" },
	{ value: "Open Sans", label: "Open Sans" },
];

const COLORS = [
	"#000000",
	"#374151",
	"#6B7280",
	"#9CA3AF",
	"#EF4444",
	"#F97316",
	"#F59E0B",
	"#EAB308",
	"#22C55E",
	"#10B981",
	"#14B8A6",
	"#06B6D4",
	"#3B82F6",
	"#6366F1",
	"#8B5CF6",
	"#A855F7",
];

const HIGHLIGHT_COLORS = [
	"#FEF08A",
	"#FDE047",
	"#FBBF24",
	"#BBF7D0",
	"#86EFAC",
	"#4ADE80",
	"#BFDBFE",
	"#93C5FD",
	"#60A5FA",
	"#DDD6FE",
	"#C4B5FD",
	"#A78BFA",
];

function MenuBar({ editor }: { editor: Editor | null }) {
	const [linkUrl, setLinkUrl] = useState("");
	const [linkOpen, setLinkOpen] = useState(false);

	const setLink = useCallback(() => {
		if (!editor || !linkUrl) return;

		if (linkUrl === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
		} else {
			editor
				.chain()
				.focus()
				.extendMarkRange("link")
				.setLink({ href: linkUrl })
				.run();
		}
		setLinkOpen(false);
		setLinkUrl("");
	}, [editor, linkUrl]);

	if (!editor) return null;

	return (
		<div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2">
			{/* Undo/Redo */}
			<Button
				className="h-8 w-8"
				disabled={!editor.can().undo()}
				onClick={() => editor.chain().focus().undo().run()}
				size="icon"
				variant="ghost"
			>
				<Undo className="h-4 w-4" />
			</Button>
			<Button
				className="h-8 w-8"
				disabled={!editor.can().redo()}
				onClick={() => editor.chain().focus().redo().run()}
				size="icon"
				variant="ghost"
			>
				<Redo className="h-4 w-4" />
			</Button>

			<Separator className="mx-1 h-6" orientation="vertical" />

			{/* Font Family */}
			<Select
				onValueChange={(value) =>
					editor.chain().focus().setFontFamily(value).run()
				}
				value={editor.getAttributes("textStyle").fontFamily || "Inter"}
			>
				<SelectTrigger className="h-8 w-28">
					<Type className="mr-1 h-3 w-3" />
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{FONT_FAMILIES.map((font) => (
						<SelectItem
							key={font.value}
							style={{ fontFamily: font.value }}
							value={font.value}
						>
							{font.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Separator className="mx-1 h-6" orientation="vertical" />

			{/* Text Formatting */}
			<Toggle
				onPressedChange={() => editor.chain().focus().toggleBold().run()}
				pressed={editor.isActive("bold")}
				size="sm"
			>
				<Bold className="h-4 w-4" />
			</Toggle>
			<Toggle
				onPressedChange={() => editor.chain().focus().toggleItalic().run()}
				pressed={editor.isActive("italic")}
				size="sm"
			>
				<Italic className="h-4 w-4" />
			</Toggle>
			<Toggle
				onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
				pressed={editor.isActive("underline")}
				size="sm"
			>
				<UnderlineIcon className="h-4 w-4" />
			</Toggle>
			<Toggle
				onPressedChange={() => editor.chain().focus().toggleStrike().run()}
				pressed={editor.isActive("strike")}
				size="sm"
			>
				<Strikethrough className="h-4 w-4" />
			</Toggle>

			<Separator className="mx-1 h-6" orientation="vertical" />

			{/* Text Color */}
			<Popover>
				<PopoverTrigger asChild>
					<Button className="h-8 w-8" size="icon" variant="ghost">
						<Palette className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-2">
					<div className="grid grid-cols-4 gap-1">
						{COLORS.map((color) => (
							<button
								className="h-6 w-6 rounded border border-border transition-transform hover:scale-110"
								key={color}
								onClick={() => editor.chain().focus().setColor(color).run()}
								style={{ backgroundColor: color }}
							/>
						))}
					</div>
				</PopoverContent>
			</Popover>

			{/* Highlight */}
			<Popover>
				<PopoverTrigger asChild>
					<Button className="h-8 w-8" size="icon" variant="ghost">
						<Highlighter className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-2">
					<div className="grid grid-cols-4 gap-1">
						{HIGHLIGHT_COLORS.map((color) => (
							<button
								className="h-6 w-6 rounded border border-border transition-transform hover:scale-110"
								key={color}
								onClick={() =>
									editor.chain().focus().toggleHighlight({ color }).run()
								}
								style={{ backgroundColor: color }}
							/>
						))}
						<button
							className="flex h-6 w-6 items-center justify-center rounded border border-border text-xs transition-transform hover:scale-110"
							onClick={() => editor.chain().focus().unsetHighlight().run()}
						>
							✕
						</button>
					</div>
				</PopoverContent>
			</Popover>

			<Separator className="mx-1 h-6" orientation="vertical" />

			{/* Alignment */}
			<Toggle
				onPressedChange={() =>
					editor.chain().focus().setTextAlign("left").run()
				}
				pressed={editor.isActive({ textAlign: "left" })}
				size="sm"
			>
				<AlignLeft className="h-4 w-4" />
			</Toggle>
			<Toggle
				onPressedChange={() =>
					editor.chain().focus().setTextAlign("center").run()
				}
				pressed={editor.isActive({ textAlign: "center" })}
				size="sm"
			>
				<AlignCenter className="h-4 w-4" />
			</Toggle>
			<Toggle
				onPressedChange={() =>
					editor.chain().focus().setTextAlign("right").run()
				}
				pressed={editor.isActive({ textAlign: "right" })}
				size="sm"
			>
				<AlignRight className="h-4 w-4" />
			</Toggle>
			<Toggle
				onPressedChange={() =>
					editor.chain().focus().setTextAlign("justify").run()
				}
				pressed={editor.isActive({ textAlign: "justify" })}
				size="sm"
			>
				<AlignJustify className="h-4 w-4" />
			</Toggle>

			<Separator className="mx-1 h-6" orientation="vertical" />

			{/* Lists */}
			<Toggle
				onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
				pressed={editor.isActive("bulletList")}
				size="sm"
			>
				<List className="h-4 w-4" />
			</Toggle>
			<Toggle
				onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
				pressed={editor.isActive("orderedList")}
				size="sm"
			>
				<ListOrdered className="h-4 w-4" />
			</Toggle>
			<Toggle
				onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
				pressed={editor.isActive("blockquote")}
				size="sm"
			>
				<Quote className="h-4 w-4" />
			</Toggle>

			<Separator className="mx-1 h-6" orientation="vertical" />

			{/* Link */}
			<Popover onOpenChange={setLinkOpen} open={linkOpen}>
				<PopoverTrigger asChild>
					<Toggle pressed={editor.isActive("link")} size="sm">
						<LinkIcon className="h-4 w-4" />
					</Toggle>
				</PopoverTrigger>
				<PopoverContent className="w-80">
					<div className="flex gap-2">
						<Input
							onChange={(e) => setLinkUrl(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && setLink()}
							placeholder="https://example.com"
							value={linkUrl}
						/>
						<Button onClick={setLink} size="sm">
							Set
						</Button>
					</div>
				</PopoverContent>
			</Popover>
			{editor.isActive("link") && (
				<Button
					className="h-8 w-8"
					onClick={() => editor.chain().focus().unsetLink().run()}
					size="icon"
					variant="ghost"
				>
					<Unlink className="h-4 w-4" />
				</Button>
			)}
		</div>
	);
}

export function RichTextEditor({
	content,
	onChange,
	onLocalUpdate,
	placeholder = "Start typing...",
	className,
	minHeight = "150px",
	showToolbar = true,
	toolbarPosition = "top",
}: RichTextEditorProps) {
	const { localData, setLocalData, status, error, isDirty } = useAutoSave({
		data: content,
		onSave: async (val) => onChange(val),
		onLocalUpdate,
	});

	useBeforeUnload(isDirty);

	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				heading: { levels: [1, 2, 3] },
			}),
			Underline,
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			TextStyle,
			Color,
			FontFamily,
			Highlight.configure({ multicolor: true }),
			Placeholder.configure({ placeholder }),
			Link.configure({
				openOnClick: false,
				HTMLAttributes: { class: "text-primary underline" },
			}),
		],
		content: localData,
		onUpdate: ({ editor }) => {
			const html = editor.getHTML();
			setLocalData(html);
		},
		editorProps: {
			attributes: {
				class: cn(
					"prose prose-sm dark:prose-invert max-w-none p-4 focus:outline-none",
					"prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2",
					"prose-li:my-0 prose-ol:my-2 prose-ul:my-2",
					"prose-blockquote:my-2 prose-blockquote:border-l-primary",
				),
				style: `min-height: ${minHeight}`,
			},
		},
	});

	// Update editor content when localData changes (e.g. from autosave sync or external content)
	useEffect(() => {
		if (editor && localData !== editor.getHTML()) {
			editor.commands.setContent(localData);
		}
	}, [localData, editor]);

	return (
		<div
			className={cn(
				"overflow-hidden rounded-lg border bg-background",
				className,
			)}
		>
			{showToolbar && toolbarPosition === "top" && <MenuBar editor={editor} />}
			<EditorContent editor={editor} />
			{showToolbar && toolbarPosition === "bottom" && (
				<MenuBar editor={editor} />
			)}
		</div>
	);
}

export { useEditor, Editor };
