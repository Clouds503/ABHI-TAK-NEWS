# iPhone install support, new logo, and campaign reporting

## What will change

- Replace the in-app Abhi Tak logo with the supplied artwork and derive properly sized favicon, Apple Touch Icon, and PWA icons from it.
- Add a manifest so the published site can be added to an iPhone Home Screen with the Abhi Tak name, icon, brand color, and standalone display.
- Keep this install support lightweight: no offline cache or service worker will be added.
- Track real advertisement and promotion impressions when a campaign is visibly rendered, and clicks when its destination is opened.
- Show campaign performance in the existing admin area: impressions, clicks, click-through rate, active date range, elapsed/remaining duration, and current schedule status.

## Safety and performance

- Record analytics through a narrow public server endpoint that validates campaign IDs and only increments counters; visitors cannot edit campaign content.
- Count each displayed campaign once per browser session to avoid inflated impressions from re-renders.
- Preserve lazy media loading and avoid extra work on initial page load.

## Verification

- Confirm the manifest and all icon sizes are valid and the new logo appears in the app.
- Confirm an eligible ad records one impression, a click records once per click, and admin metrics update.
- Check the public home page and admin campaign page on iPhone and desktop sizes, then confirm a clean build.
