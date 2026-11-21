import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips obsolete WordPress Gutenberg markup and dead media tags,
 * and formats article body text with comprehensive support for:
 * - HTML headings (h1, h2, h3, h4, h5, h6)
 * - Markdown headings (#, ##, ###, ####)
 * - Standalone bold lines as subheadings (**Heading** or <strong>Heading</strong> on own line)
 * - Paragraphs, line breaks, bold, italics, and lists
 */
export function cleanArticleBody(html: string | null | undefined): string {
  if (!html) return "";

  // 1. Strip WordPress comments and dead media tags
  let text = html
    .replace(/<!--\s*\/?wp:[^>]*-->/gi, "")
    .replace(/<figure[^>]*>[\s\S]*?wp-content[\s\S]*?<\/figure>/gi, "")
    .replace(/<img[^>]*wp-content[^>]*\/?>/gi, "")
    .replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, "")
    .trim();

  if (!text) return "";

  // 2. Normalize and convert Markdown headings (whether inside <p> or on raw lines)
  // Lines wrapped in <p> like <p>## Heading</p>
  text = text.replace(/<p>\s*#{1,2}\s+(.+?)\s*<\/p>/gi, "<h2>$1</h2>");
  text = text.replace(/<p>\s*#{3}\s+(.+?)\s*<\/p>/gi, "<h3>$1</h3>");
  text = text.replace(/<p>\s*#{4,6}\s+(.+?)\s*<\/p>/gi, "<h4>$1</h4>");

  // Raw lines starting with #, ##, ###, ####
  text = text.replace(/^######\s+(.+)$/gm, "<h4>$1</h4>");
  text = text.replace(/^#####\s+(.+)$/gm, "<h4>$1</h4>");
  text = text.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  text = text.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  text = text.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  text = text.replace(/^#\s+(.+)$/gm, "<h2>$1</h2>");

  // 3. Convert standalone bold lines into subheadings (e.g. **हेडिंग** on own line)
  text = text.replace(/^(\*\*|__)(.+?)\1\s*$/gm, "<h3>$2</h3>");
  text = text.replace(/<p>\s*<strong>(.+?)<\/strong>\s*<\/p>/gi, (match, inner) => {
    const trimmed = inner.trim();
    if (trimmed.length > 0 && trimmed.length <= 90 && !/[.!?।]$/.test(trimmed)) {
      return `<h3>${trimmed}</h3>`;
    }
    return match;
  });
  text = text.replace(/<p>\s*<b>(.+?)<\/b>\s*<\/p>/gi, (match, inner) => {
    const trimmed = inner.trim();
    if (trimmed.length > 0 && trimmed.length <= 90 && !/[.!?।]$/.test(trimmed)) {
      return `<h3>${trimmed}</h3>`;
    }
    return match;
  });

  // 4. Check if the text already contains block HTML tags (<p>, <div>, <h2>, etc.)
  const hasBlockHtml = /<\/?(p|div|h[1-6]|ul|ol|li|blockquote|table|section|article)[^>]*>/i.test(
    text,
  );

  if (!hasBlockHtml) {
    // If it's plain text without block tags:
    // Convert inline markdown bold & italic
    text = text.replace(/(\*\*|__)(.+?)\1/g, "<strong>$2</strong>");
    text = text.replace(/(\*|_)(.+?)\1/g, "<em>$2</em>");

    // Split into paragraphs by double or multiple newlines
    const blocks = text.split(/\n{2,}/);
    text = blocks
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        // If the block is already a heading, list, or blockquote, don't wrap in <p>
        if (/^<(h[1-6]|ul|ol|li|blockquote)/i.test(trimmed)) {
          return trimmed;
        }
        // Convert single newlines inside paragraph to <br />
        return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
      })
      .filter(Boolean)
      .join("\n\n");
  } else {
    // If it already has block HTML, also convert any inline markdown bold & italic
    text = text.replace(/(\*\*|__)(.+?)\1/g, "<strong>$2</strong>");
  }

  return text;
}
