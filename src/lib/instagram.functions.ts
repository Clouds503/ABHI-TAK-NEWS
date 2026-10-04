import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const reelInput = z.object({
  shortcode: z.string().regex(/^[A-Za-z0-9_-]{5,40}$/),
});

const INSTAGRAM_HOSTS = [".cdninstagram.com", ".fbcdn.net"];
const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";

function decodeJsonString(value: string): string | null {
  try {
    const decoded = JSON.parse(`"${value}"`) as unknown;
    if (typeof decoded !== "string") return null;
    return decoded
      .replace(/\\\//g, "/")
      .replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
      );
  } catch {
    return null;
  }
}

function allowedMediaUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !INSTAGRAM_HOSTS.some((host) => url.hostname.endsWith(host)))
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const getInstagramReelMedia = createServerFn({ method: "GET" })
  .inputValidator((input) => reelInput.parse(input))
  .handler(async ({ data }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    try {
      const response = await fetch(
        `https://www.instagram.com/reel/${data.shortcode}/embed/captioned/`,
        {
          headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
          signal: controller.signal,
        },
      );
      if (!response.ok) return { videoUrl: null };

      const html = await response.text();
      const encodedUrl =
        html.match(/\\"video_url\\":\\"((?:\\\\.|[^"\\])*)\\"/)?.[1] ??
        html.match(/"video_url":"((?:\\.|[^"\\])*)"/)?.[1];

      return { videoUrl: allowedMediaUrl(decodeJsonString(encodedUrl ?? "")) };
    } catch {
      return { videoUrl: null };
    } finally {
      clearTimeout(timeout);
    }
  });
