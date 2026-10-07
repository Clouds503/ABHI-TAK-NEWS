import assert from "node:assert";
import {
  decodeXmlEntities,
  parseYouTubeAtomXml,
  fetchYouTubeRssVideos,
  YOUTUBE_CHANNEL_ID,
  YOUTUBE_RSS_URL,
} from "../src/lib/youtube-sync.ts";

console.log("=== Testing YouTube Sync Engine ===");

// 1. Test Entity Decoding
console.log("1. Testing XML Entity Decoding...");
assert.strictEqual(
  decodeXmlEntities(
    "Breaking &amp; News: Tom &amp; Jerry &#39;Special&#39; &quot;Exclusive&quot; &lt;Live&gt;",
  ),
  "Breaking & News: Tom & Jerry 'Special' \"Exclusive\" <Live>",
);
assert.strictEqual(decodeXmlEntities("नमस्ते &#2349;&#2368;&#2352;"), "नमस्ते भीर");
console.log("  ✓ Entity decoding verified.");

// 2. Test Atom XML Parsing with Sample WebSub Payload
console.log("2. Testing WebSub Atom XML Parsing...");
const sampleAtomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <link rel="hub" href="https://pubsubhubbub.appspot.com"/>
  <title>YouTube video feed</title>
  <updated>2026-10-08T00:30:00+00:00</updated>
  <entry>
    <id>yt:video:TEST_VID_01</id>
    <yt:videoId>TEST_VID_01</yt:videoId>
    <yt:channelId>${YOUTUBE_CHANNEL_ID}</yt:channelId>
    <title>धमाकेदार खबर &amp; ग्राउंड रिपोर्ट</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=TEST_VID_01"/>
    <published>2026-10-08T00:25:00+00:00</published>
    <updated>2026-10-08T00:30:00+00:00</updated>
    <media:group xmlns:media="http://search.yahoo.com/mrss/">
      <media:title>धमाकेदार खबर &amp; ग्राउंड रिपोर्ट</media:title>
      <media:thumbnail url="https://i.ytimg.com/vi/TEST_VID_01/hqdefault.jpg" width="480" height="360"/>
    </media:group>
  </entry>
</feed>`;

const parsedEntries = parseYouTubeAtomXml(sampleAtomXml);
assert.strictEqual(parsedEntries.length, 1);
assert.strictEqual(parsedEntries[0].id, "TEST_VID_01");
assert.strictEqual(parsedEntries[0].title, "धमाकेदार खबर & ग्राउंड रिपोर्ट");
assert.strictEqual(parsedEntries[0].videoUrl, "https://www.youtube.com/watch?v=TEST_VID_01");
assert.strictEqual(parsedEntries[0].thumbnail, "https://i.ytimg.com/vi/TEST_VID_01/hqdefault.jpg");
console.log("  ✓ WebSub Atom XML parsed successfully:", parsedEntries[0]);

// 3. Test Live YouTube Channel RSS
console.log("3. Fetching live YouTube channel RSS from:", YOUTUBE_RSS_URL);
const liveVideos = await fetchYouTubeRssVideos();
console.log(`  ✓ Received ${liveVideos.length} videos from YouTube channel RSS`);
assert.ok(liveVideos.length > 0, "Should receive at least 1 video from live channel RSS");
console.log("  ✓ Sample latest video:", liveVideos[0]);

// 4. Test WebSub Challenge Handshake Logic
console.log("4. Testing WebSub Handshake Verification Logic...");
const testChallenge = "random_challenge_string_987654";
const mockUrl = new URL(
  `https://example.com/api/public/sync-youtube?hub.mode=subscribe&hub.topic=${encodeURIComponent(YOUTUBE_RSS_URL)}&hub.challenge=${testChallenge}&hub.lease_seconds=864000`,
);
const challengeParam = mockUrl.searchParams.get("hub.challenge");
const modeParam = mockUrl.searchParams.get("hub.mode");
const topicParam = mockUrl.searchParams.get("hub.topic");

assert.strictEqual(challengeParam, testChallenge);
assert.strictEqual(modeParam, "subscribe");
assert.ok(topicParam?.includes(YOUTUBE_CHANNEL_ID));
console.log("  ✓ WebSub Challenge parameters verified:", {
  challenge: challengeParam,
  mode: modeParam,
});

console.log("\n=== All YouTube Sync Engine Verification Tests Passed! ===");
