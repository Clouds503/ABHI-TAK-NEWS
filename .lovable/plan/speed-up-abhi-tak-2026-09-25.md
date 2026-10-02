# Speed up Abhi Tak

## Goal
Make page navigation, news images, and the video gallery feel substantially faster on iPhone without changing the editorial design.

## Changes
- Cache reusable news, town, video, and YouTube results longer to avoid repeated network requests during navigation.
- Reduce home-page data payloads and defer below-the-fold sections until needed.
- Replace the immediately loaded YouTube player with a lightweight thumbnail; load the player only after the viewer taps Play.
- Use smaller YouTube thumbnails, lazy media loading, fixed dimensions, and low-priority decoding outside the first screen.
- Prevent advertisement videos and other off-screen media from downloading more than needed.
- Tune route preloading so recently visited pages and data open instantly.

## Verification
- Compare request count and load timing on iPhone-sized home and Videos screens.
- Confirm video playback still works after tapping Play.
- Check page navigation, images, build health, and browser errors.

## Technical details
- Keep the installable app manifest-only; no service worker or stale offline cache.
- Add server-side cache headers to YouTube feed/live requests and client query cache settings.
- Preserve the existing backend, content, analytics, and visual layout.
