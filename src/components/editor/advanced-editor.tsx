'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import CharacterCount from '@tiptap/extension-character-count';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
  Highlighter,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Minus,
  Table as TableIcon,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  RemoveFormatting,
  Maximize2,
  Minimize2,
  Pilcrow,
} from 'lucide-react';

interface AdvancedEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
];

const HIGHLIGHT_COLORS = [
  { value: '#fef08a', label: 'Yellow' },
  { value: '#bbf7d0', label: 'Green' },
  { value: '#bfdbfe', label: 'Blue' },
  { value: '#fecaca', label: 'Red' },
  { value: '#e9d5ff', label: 'Purple' },
  { value: '#fed7aa', label: 'Orange' },
];

const TEXT_COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#374151', label: 'Gray' },
  { value: '#dc2626', label: 'Red' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#ca8a04', label: 'Yellow' },
  { value: '#16a34a', label: 'Green' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#7c3aed', label: 'Purple' },
];

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  tooltip: string;
}

function ToolbarButton({ onClick, isActive, disabled, children, tooltip }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={isActive}
          onPressedChange={onClick}
          disabled={disabled}
          className={cn(
            "h-8 w-8 p-0 data-[state=on]:bg-accent",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {children}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-border mx-1" />;
}

export function AdvancedEditor({ content, onChange, placeholder = 'Start writing...', minHeight = '300px' }: AdvancedEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Typography,
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      CharacterCount,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none px-4 py-3',
          'prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2',
          '[&_ul[data-type="taskList"]]:list-none [&_ul[data-type="taskList"]]:pl-0',
          '[&_ul[data-type="taskList"]_li]:flex [&_ul[data-type="taskList"]_li]:gap-2 [&_ul[data-type="taskList"]_li]:items-start',
        ),
        style: `min-height: ${minHeight}`,
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    setLinkUrl('');
  }, [editor, linkUrl]);

  const addTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="border rounded-lg p-4 animate-pulse bg-muted/50" style={{ minHeight }}>
        <div className="h-4 bg-muted rounded w-1/4 mb-2" />
        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    );
  }

  const characterCount = editor.storage.characterCount;

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn(
        "border rounded-lg overflow-hidden bg-background transition-all",
        isFullscreen && "fixed inset-4 z-50 flex flex-col"
      )}>
        {/* Main Toolbar */}
        <div className="border-b bg-muted/30 p-1.5 flex flex-wrap items-center gap-0.5">
          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            tooltip="Undo (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            tooltip="Redo (Ctrl+Y)"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Block Type Selector */}
          <Select
            value={
              editor.isActive('heading', { level: 1 }) ? 'h1' :
              editor.isActive('heading', { level: 2 }) ? 'h2' :
              editor.isActive('heading', { level: 3 }) ? 'h3' :
              editor.isActive('blockquote') ? 'quote' :
              editor.isActive('codeBlock') ? 'code' :
              'paragraph'
            }
            onValueChange={(value) => {
              if (value === 'paragraph') editor.chain().focus().setParagraph().run();
              else if (value === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
              else if (value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
              else if (value === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
              else if (value === 'quote') editor.chain().focus().toggleBlockquote().run();
              else if (value === 'code') editor.chain().focus().toggleCodeBlock().run();
            }}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Paragraph" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">
                <span className="flex items-center gap-2"><Pilcrow className="h-3.5 w-3.5" /> Paragraph</span>
              </SelectItem>
              <SelectItem value="h1">
                <span className="flex items-center gap-2"><Heading1 className="h-3.5 w-3.5" /> Heading 1</span>
              </SelectItem>
              <SelectItem value="h2">
                <span className="flex items-center gap-2"><Heading2 className="h-3.5 w-3.5" /> Heading 2</span>
              </SelectItem>
              <SelectItem value="h3">
                <span className="flex items-center gap-2"><Heading3 className="h-3.5 w-3.5" /> Heading 3</span>
              </SelectItem>
              <SelectItem value="quote">
                <span className="flex items-center gap-2"><Quote className="h-3.5 w-3.5" /> Quote</span>
              </SelectItem>
              <SelectItem value="code">
                <span className="flex items-center gap-2"><Code className="h-3.5 w-3.5" /> Code Block</span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Font Family */}
          <Select
            value={editor.getAttributes('textStyle').fontFamily || 'Inter'}
            onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()}
          >
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map(font => (
                <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ToolbarDivider />

          {/* Text Formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            tooltip="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            tooltip="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            tooltip="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            tooltip="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            isActive={editor.isActive('subscript')}
            tooltip="Subscript"
          >
            <SubscriptIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            isActive={editor.isActive('superscript')}
            tooltip="Superscript"
          >
            <SuperscriptIcon className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Text Color */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <div className="flex flex-col items-center">
                  <Type className="h-3.5 w-3.5" />
                  <div 
                    className="w-4 h-1 rounded-sm mt-0.5" 
                    style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}
                  />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-4 gap-1">
                {TEXT_COLORS.map(color => (
                  <button
                    key={color.value}
                    className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.value }}
                    onClick={() => editor.chain().focus().setColor(color.value).run()}
                    title={color.label}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={() => editor.chain().focus().unsetColor().run()}
              >
                Remove color
              </Button>
            </PopoverContent>
          </Popover>

          {/* Highlight */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className={cn("h-8 w-8 p-0", editor.isActive('highlight') && "bg-accent")}>
                <Highlighter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-3 gap-1">
                {HIGHLIGHT_COLORS.map(color => (
                  <button
                    key={color.value}
                    className="w-8 h-6 rounded border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.value }}
                    onClick={() => editor.chain().focus().toggleHighlight({ color: color.value }).run()}
                    title={color.label}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={() => editor.chain().focus().unsetHighlight().run()}
              >
                Remove highlight
              </Button>
            </PopoverContent>
          </Popover>

          <ToolbarDivider />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            tooltip="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            tooltip="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            tooltip="Task List"
          >
            <ListChecks className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Alignment */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            tooltip="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            tooltip="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            tooltip="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            isActive={editor.isActive({ textAlign: 'justify' })}
            tooltip="Justify"
          >
            <AlignJustify className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Link */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className={cn("h-8 w-8 p-0", editor.isActive('link') && "bg-accent")}>
                <LinkIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3">
              <div className="space-y-2">
                <Label className="text-xs">URL</Label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="h-8 text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={setLink} className="flex-1">
                    {editor.isActive('link') ? 'Update' : 'Add'} Link
                  </Button>
                  {editor.isActive('link') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => editor.chain().focus().unsetLink().run()}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Table */}
          <ToolbarButton onClick={addTable} tooltip="Insert Table">
            <TableIcon className="h-4 w-4" />
          </ToolbarButton>

          {/* Horizontal Rule */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            tooltip="Horizontal Line"
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Clear Formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            tooltip="Clear Formatting"
          >
            <RemoveFormatting className="h-4 w-4" />
          </ToolbarButton>

          {/* Fullscreen Toggle */}
          <div className="ml-auto">
            <ToolbarButton
              onClick={() => setIsFullscreen(!isFullscreen)}
              tooltip={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </ToolbarButton>
          </div>
        </div>

        {/* Editor Content */}
        <div className={cn("overflow-auto", isFullscreen && "flex-1")}>
          <EditorContent editor={editor} />
        </div>

        {/* Status Bar */}
        <div className="border-t bg-muted/30 px-3 py-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{characterCount?.characters()} characters</span>
            <span>{characterCount?.words()} words</span>
          </div>
          <div className="flex items-center gap-2">
            {editor.isActive('link') && (
              <span className="text-primary">Link selected</span>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
