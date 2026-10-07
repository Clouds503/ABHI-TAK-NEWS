<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Keep iPhone installability manifest-only unless offline use is explicitly requested, avoiding service-worker cache risks.
- Record public campaign metrics only through the validated public API route and narrow database function, never public table updates.
- Keep YouTube embeds click-to-load except for an active live broadcast, reducing third-party scripts and media on initial page load.
- Load the YouTube catalog incrementally and keep its RSS feed as the latest-video fallback, so a full-channel scrape never blocks the gallery.
- Render Instagram reels as native videos resolved server-side, preferring admin-uploaded media, so playback controls and the full-screen UI remain reliable.
- Verify video playback with the system browser (`executable_path="/bin/chromium"`); the bundled Playwright Chromium ships without H.264/AAC and fails valid reel files with `MEDIA_ERR_SRC_NOT_SUPPORTED`, which is a test-environment limit, not an app bug.
