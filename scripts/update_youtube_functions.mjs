import fs from "fs";

let code = fs.readFileSync("src/lib/youtube.functions.ts", "utf8");

const oldFuncStart = code.indexOf("export const getLiveStatus = createServerFn({ method: \"GET\" }).handler(");
const oldFuncEnd = code.indexOf("export const syncYouTubeVideosServerFn = createServerFn({ method: \"POST\" }).handler(");

if (oldFuncStart === -1 || oldFuncEnd === -1) {
  console.error("Could not find function bounds:", { oldFuncStart, oldFuncEnd });
  process.exit(1);
}

const replacement = `export const LIVE_CHANNEL_STREAM_URL =
  "http://abhitaknews.livebox.co.in/AbhitakNewshls/ABHITAKNEWS.m3u8";
export const LIVE_CHANNEL_STREAM_HTTPS_URL =
  "https://abhitaknews.livebox.co.in/AbhitakNewshls/ABHITAKNEWS.m3u8";

export const getLiveStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    live: boolean;
    videoId: string | null;
    title: string | null;
    streamUrl: string;
  }> => {
    try {
      const res = await fetch(LIVE_CHANNEL_STREAM_HTTPS_URL, {
        method: "HEAD",
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return {
          live: true,
          videoId: null,
          title: "अभि तक 24x7 सीधा लाइव प्रसारण (Abhi Tak 24x7 Live)",
          streamUrl: LIVE_CHANNEL_STREAM_URL,
        };
      }
    } catch (e) {
      console.warn("[getLiveStatus] HLS check note:", e);
    }

    try {
      const res = await fetch(\`https://www.youtube.com/channel/\${YT_CHANNEL_ID}/live\`, {
        headers: { "User-Agent": UA, "Accept-Language": "en" },
        signal: AbortSignal.timeout(4000),
      });
      const html = await res.text();
      const live = /"isLiveNow":true/.test(html) || /"isLive":true/.test(html);
      if (live) {
        const videoId =
          html.match(
            /<link rel="canonical" href="https:\\/\\/www\\.youtube\\.com\\/watch\\?v=([\\w-]{11})"/,
          )?.[1] ??
          html.match(/"videoId":"([\\w-]{11})"/)?.[1] ??
          null;
        const title = html.match(/<meta name="title" content="([^"]*)"/)?.[1] ?? null;
        return {
          live: true,
          videoId,
          title: title ? decode(title) : "अभि तक सीधा प्रसारण",
          streamUrl: LIVE_CHANNEL_STREAM_URL,
        };
      }
    } catch {
      // ignore
    }

    return {
      live: true,
      videoId: null,
      title: "अभि तक 24x7 लाइव टीवी — सीधा प्रसारण",
      streamUrl: LIVE_CHANNEL_STREAM_URL,
    };
  },
);

`;

const newCode = code.slice(0, oldFuncStart) + replacement + code.slice(oldFuncEnd);
fs.writeFileSync("src/lib/youtube.functions.ts", newCode, "utf8");
console.log("Successfully updated src/lib/youtube.functions.ts");
