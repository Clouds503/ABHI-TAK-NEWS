import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge"; export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs));
} /** * Strips obsolete WordPress Gutenberg markup and dead media tags from HTML content. */
export function cleanArticleBody(html: string | null | undefined): string { if (!html) return ""; return html .replace(/<!--\s*\/?wp:[^>]*-->/gi, "") .replace(/<figure[^>]*>[\s\S]*?wp-content[\s\S]*?<\/figure>/gi, "") .replace(/<img[^>]*wp-content[^>]*\/?>/gi, "") .replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, "") .trim();
}
