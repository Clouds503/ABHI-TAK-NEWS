import React, { useRef, useState } from "react";
import { Heading2, Heading3, Bold, List, Quote, Eye, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cleanArticleBody, cn } from "@/lib/utils";

interface ArticleBodyEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

/**
 * Extracts headings, paragraphs, and lists from HTML copied from MS Word, Google Docs, or websites.
 */
function convertPastedHtmlToMarkdown(html: string): string | null {
  // Check if pasted HTML contains any headings or structured tags
  if (!/<(h[1-6]|p|ul|ol|li|strong|b)[^>]*>/i.test(html)) {
    return null;
  }

  let text = html
    // Headings
    .replace(/<h[12][^>]*>(.*?)<\/h[12]>/gis, "\n\n## $1\n\n")
    .replace(/<h[34][^>]*>(.*?)<\/h[34]>/gis, "\n\n### $1\n\n")
    .replace(/<h[56][^>]*>(.*?)<\/h[56]>/gis, "\n\n#### $1\n\n")
    // Bold / Strong
    .replace(/<strong[^>]*>(.*?)<\/strong>/gis, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gis, "**$1**")
    // Italic
    .replace(/<em[^>]*>(.*?)<\/em>/gis, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/gis, "*$1*")
    // List items
    .replace(/<li[^>]*>(.*?)<\/li>/gis, "\n- $1")
    // Paragraphs
    .replace(/<p[^>]*>(.*?)<\/p>/gis, "\n\n$1\n\n")
    // Line breaks
    .replace(/<br\s*\/?>/gi, "\n")
    // Strip all remaining HTML tags
    .replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Clean extra whitespace
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text.length > 0 ? text : null;
}

export function ArticleBodyEditor({
  label,
  value,
  onChange,
  placeholder = "यहाँ अपनी खबर / रिपोर्ट लिखें या पेस्ट करें...",
  className,
  minHeight = "min-h-48",
}: ArticleBodyEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormat = (prefix: string, suffix = "", defaultText = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = value || "";
    const selectedText = currentVal.substring(start, end);
    const textToInsert = selectedText || defaultText;

    // Add surrounding newlines for block elements like headings
    const isHeadingOrBlock = prefix.startsWith("\n\n##") || prefix.startsWith("\n\n###") || prefix.startsWith("\n- ");
    let finalPrefix = prefix;
    if (isHeadingOrBlock && start > 0 && !currentVal.substring(0, start).endsWith("\n\n")) {
      finalPrefix = currentVal.substring(0, start).endsWith("\n") ? `\n${prefix.trimStart()}` : `\n\n${prefix.trimStart()}`;
    }

    const nextValue =
      currentVal.substring(0, start) +
      finalPrefix +
      textToInsert +
      suffix +
      currentVal.substring(end);

    onChange(nextValue);

    // Re-focus and set cursor position after update
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + finalPrefix.length + textToInsert.length + suffix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData("text/html");
    if (!html) return; // default paste handles plain text

    const converted = convertPastedHtmlToMarkdown(html);
    if (!converted) return; // let default plain-text paste happen

    e.preventDefault();
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange((value || "") + "\n\n" + converted);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = value || "";
    const nextVal = currentVal.substring(0, start) + converted + currentVal.substring(end);
    onChange(nextVal);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + converted.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        {label && <label className="text-sm font-medium">{label}</label>}
        
        {/* Tab switcher: Write vs Preview */}
        <div className="flex items-center rounded-lg border bg-muted/50 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setTab("write")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors",
              tab === "write" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Edit3 className="h-3.5 w-3.5" />
            लिखें
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors",
              tab === "preview" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            पूर्वावलोकन
          </button>
        </div>
      </div>

      {tab === "write" ? (
        <div className="rounded-md border bg-card focus-within:ring-1 focus-within:ring-ring">
          {/* Quick formatting toolbar */}
          <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-2 py-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormat("\n\n## ", "\n\n", "मुख्य हेडिंग")}
              className="h-7 gap-1 px-2 text-xs font-semibold hover:bg-muted"
              title="बड़ी हेडिंग जोड़ें (Heading 2)"
            >
              <Heading2 className="h-3.5 w-3.5 text-primary" />
              <span>H2 हेडिंग</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormat("\n\n### ", "\n\n", "उप-हेडिंग")}
              className="h-7 gap-1 px-2 text-xs font-semibold hover:bg-muted"
              title="मध्यम हेडिंग जोड़ें (Heading 3)"
            >
              <Heading3 className="h-3.5 w-3.5 text-primary" />
              <span>H3 हेडिंग</span>
            </Button>

            <div className="h-4 w-px bg-border mx-0.5" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormat("**", "**", "बोल्ड टेक्स्ट")}
              className="h-7 gap-1 px-2 text-xs hover:bg-muted"
              title="बोल्ड (Bold)"
            >
              <Bold className="h-3.5 w-3.5" />
              <span>बोल्ड</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormat("\n- ", "", "बिंदु 1\n- बिंदु 2")}
              className="h-7 gap-1 px-2 text-xs hover:bg-muted"
              title="लिस्ट (Bullet List)"
            >
              <List className="h-3.5 w-3.5" />
              <span>लिस्ट</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormat("\n> ", "\n", "महत्वपूर्ण बयान या कोट")}
              className="h-7 gap-1 px-2 text-xs hover:bg-muted"
              title="उद्धरण (Quote)"
            >
              <Quote className="h-3.5 w-3.5" />
              <span>कोट</span>
            </Button>
          </div>

          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            placeholder={placeholder}
            className={cn("border-0 shadow-none focus-visible:ring-0 rounded-t-none resize-y", minHeight)}
          />

          <div className="border-t bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>💡 <strong>हेडिंग के लिए:</strong> लाइन की शुरुआत में <code>## </code> लगाएं (उदा: <code>## मुख्य बिंदु</code>) या [H2 हेडिंग] बटन दबाएं।</span>
            <span className="tabular-nums">{(value || "").length} अक्षर</span>
          </div>
        </div>
      ) : (
        /* Preview tab: Render article body live with headings styled */
        <div className={cn("rounded-md border bg-card p-4 overflow-y-auto", minHeight)}>
          {value ? (
            <div
              className="prose article-body max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: cleanArticleBody(value) }}
            />
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              यहाँ पूर्वावलोकन देखने के लिए पहले टेक्स्ट लिखें या पेस्ट करें।
            </div>
          )}
        </div>
      )}
    </div>
  );
}
