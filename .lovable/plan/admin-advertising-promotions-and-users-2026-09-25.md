# Admin advertising, promotions, and users

## What will be added
- Add **Ads & Promotions** to the admin navigation and dashboard.
- Provide a searchable list with active/inactive status, schedule, placement, media preview, edit, and delete controls.
- Add a create/edit form for advertisements and promotions with title, advertiser, destination link, placement, town targeting, start/end dates, and active status.
- Support direct image or video upload to the existing private media library, with upload progress and preview.
- Update public ad rendering so image and video campaigns display correctly and only during their scheduled period.
- Add **Users** to the admin navigation with search, profile details, town, join date, and assigned roles.

## Access and safety
- Keep both pages inside the existing staff-only admin area.
- Keep user roles read-only on this page; role changes remain restricted to super admins and are not part of this request.
- Validate forms and uploaded media types, preserve row-level access controls, and log campaign create/update/delete actions.

## Technical details
- Extend the advertisement data with campaign type, media type, and video URL fields through an additive migration.
- Reuse the existing media bucket and staff upload permissions; save long-lived signed URLs for public campaign playback.
- Build two focused admin routes and add links from the dashboard.
- Verify creation/editing, image/video previews, user search, mobile layout, and a clean build.
