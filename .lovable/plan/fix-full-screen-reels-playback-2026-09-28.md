# Fix full-screen Reels playback

## Changes
- Replace the Instagram embed frame with a native full-screen video player using each public reel’s playable media source.
- Remove Instagram’s embedded footer completely, including likes, comments, share, save, and “View more” controls.
- Keep only the existing back arrow, tap-to-pause/resume feedback, mute control, and vertical swipe navigation.
- Show a clear swipe-to-next message when Instagram does not provide playable media.

## Technical details
- Resolve public Instagram reel media on the server from the validated reel shortcode, with short-lived caching and strict response parsing.
- Continue preferring admin-uploaded video files because they remain the most reliable source.
- Load only the active reel and its immediate neighbors to preserve fast iPhone scrolling.
- Verify playback layout, footer removal, swipe behavior, and error handling in an iPhone-sized browser.
