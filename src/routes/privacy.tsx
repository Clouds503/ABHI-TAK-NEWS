import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield, Lock, Eye, Bell, Camera, Database, Mail, Phone } from "lucide-react";
import { Logo, CONTACT_PHONE, WHATSAPP_URL } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy â€” Abhi Tak News" },
      {
        name: "description",
        content:
          "Privacy Policy for Abhi Tak News digital network and mobile application (District Bijnor).",
      },
      { property: "og:title", content: "Privacy Policy â€” Abhi Tak News" },
      {
        property: "og:description",
        content: "Privacy Policy and data practices for Abhi Tak News.",
      },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  const { lang } = useI18n();
  const isHi = lang !== "en";

  return (
    <div className="mx-auto max-w-2xl lg:max-w-4xl px-4 py-8 text-foreground">
      {/* Top Bar */}
      <div className="mb-6 flex items-center gap-3 border-b pb-4">
        <Link
          to="/"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Logo className="h-9 w-9 shrink-0" />
        <div className="min-w-0">
          <h1 className="truncate font-serif text-lg font-bold sm:text-xl">
            {isHi ? "à¤—à¥‹à¤ªà¤¨à¥€à¤¯à¤¤à¤¾ à¤¨à¥€à¤¤à¤¿" : "Privacy Policy"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isHi ? "à¤…à¤‚à¤¤à¤¿à¤® à¤…à¤ªà¤¡à¥‡à¤Ÿ: à¤…à¤•à¥à¤Ÿà¥‚à¤¬à¤° 2026" : "Last updated: October 2026"}
          </p>
        </div>
      </div>

      {/* Intro Badge */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm leading-relaxed text-muted-foreground">
            {isHi ? (
              <>
                <strong className="text-foreground">à¤…à¤­à¥€ à¤¤à¤• à¤¨à¥à¤¯à¥‚à¤œà¤¼ (Abhi Tak News)</strong> à¤†à¤ªà¤•à¥€
                à¤—à¥‹à¤ªà¤¨à¥€à¤¯à¤¤à¤¾ à¤•à¤¾ à¤ªà¥‚à¤°à¤¾ à¤¸à¤®à¥à¤®à¤¾à¤¨ à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆà¥¤ à¤¯à¤¹ à¤¨à¥€à¤¤à¤¿ à¤¬à¤¤à¤¾à¤¤à¥€ à¤¹à¥ˆ à¤•à¤¿ à¤œà¤¬ à¤†à¤ª à¤¹à¤®à¤¾à¤°à¥€ à¤µà¥‡à¤¬à¤¸à¤¾à¤‡à¤Ÿ à¤¯à¤¾ Android
                à¤à¤ª (<code className="text-xs font-mono">com.abhitak.news</code>) à¤•à¤¾ à¤‰à¤ªà¤¯à¥‹à¤— à¤•à¤°à¤¤à¥‡ à¤¹à¥ˆà¤‚
                à¤¤à¥‹ à¤¹à¤® à¤†à¤ªà¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤•à¤¾ à¤¸à¤‚à¤—à¥à¤°à¤¹, à¤‰à¤ªà¤¯à¥‹à¤— à¤”à¤° à¤¸à¥à¤°à¤•à¥à¤·à¤¾ à¤•à¥ˆà¤¸à¥‡ à¤•à¤°à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤
              </>
            ) : (
              <>
                <strong className="text-foreground">Abhi Tak News</strong> respects your privacy.
                This policy explains how we collect, use, and protect your information when you use
                our website or Android application (
                <code className="text-xs font-mono">com.abhitak.news</code>).
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6 text-sm leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Database className="h-4 w-4 text-primary" />
            {isHi ? "1. à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤œà¥‹ à¤¹à¤® à¤à¤•à¤¤à¥à¤° à¤•à¤°à¤¤à¥‡ à¤¹à¥ˆà¤‚" : "1. Information We Collect"}
          </h2>
          <div className="text-muted-foreground space-y-1.5 pl-6">
            <p>
              {isHi
                ? "â€¢ à¤ªà¥à¤°à¥‹à¤«à¤¼à¤¾à¤‡à¤² à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€: à¤¯à¤¦à¤¿ à¤†à¤ª à¤–à¤¾à¤¤à¤¾ à¤¬à¤¨à¤¾à¤¤à¥‡ à¤¹à¥ˆà¤‚, à¤¤à¥‹ à¤¹à¤® à¤†à¤ªà¤•à¤¾ à¤¨à¤¾à¤®, à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°, à¤ˆà¤®à¥‡à¤² à¤”à¤° à¤šà¥à¤¨à¤¾ à¤—à¤¯à¤¾ à¤•à¤¸à¥à¤¬à¤¾/à¤¸à¥à¤¥à¤¾à¤¨ à¤à¤•à¤¤à¥à¤° à¤•à¤°à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤"
                : "â€¢ Account Information: If you create an account, we collect your name, phone number, email, and selected town/district."}
            </p>
            <p>
              {isHi
                ? "â€¢ à¤œà¤¨ à¤•à¥€ à¤†à¤µà¤¾à¤œà¤¼ (Jan Ki Awaaz): à¤œà¤¬ à¤†à¤ª à¤¸à¥à¤¥à¤¾à¤¨à¥€à¤¯ à¤¨à¤¾à¤—à¤°à¤¿à¤• à¤¸à¤®à¤¸à¥à¤¯à¤¾ à¤•à¥€ à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ à¤¦à¤°à¥à¤œ à¤•à¤°à¤¤à¥‡ à¤¹à¥ˆà¤‚, à¤¤à¥‹ à¤¸à¤®à¤¸à¥à¤¯à¤¾ à¤•à¤¾ à¤µà¤¿à¤µà¤°à¤£, à¤¶à¥€à¤°à¥à¤·à¤•, à¤•à¥à¤·à¥‡à¤¤à¥à¤°, à¤”à¤° à¤†à¤ªà¤•à¥‡ à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤…à¤ªà¤²à¥‹à¤¡ à¤•à¤¿à¤ à¤—à¤ à¤«à¥‹à¤Ÿà¥‹ à¤¯à¤¾ à¤µà¥€à¤¡à¤¿à¤¯à¥‹ à¤à¤•à¤¤à¥à¤° à¤•à¤¿à¤ à¤œà¤¾à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤ à¤¯à¤¦à¤¿ à¤†à¤ª à¤šà¤¾à¤¹à¥‡à¤‚, à¤¤à¥‹ à¤‡à¤¸à¥‡ 'à¤…à¤œà¥à¤žà¤¾à¤¤ à¤¨à¤¾à¤—à¤°à¤¿à¤•' à¤•à¥‡ à¤°à¥‚à¤ª à¤®à¥‡à¤‚ à¤­à¥€ à¤¦à¤°à¥à¤œ à¤•à¤° à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤"
                : "â€¢ Citizen Journalism & Grievances (Jan Ki Awaaz): When you submit a civic issue, we collect the title, description, location, and photos/videos you voluntarily attach. You may choose to submit anonymously."}
            </p>
            <p>
              {isHi
                ? "â€¢ à¤¤à¤•à¤¨à¥€à¤•à¥€ à¤¡à¥‡à¤Ÿà¤¾: à¤à¤ª à¤•à¥‡ à¤¸à¥à¤šà¤¾à¤°à¥‚ à¤¸à¤‚à¤šà¤¾à¤²à¤¨ à¤•à¥‡ à¤²à¤¿à¤ à¤¡à¤¿à¤µà¤¾à¤‡à¤¸ à¤®à¥‰à¤¡à¤², Android OS à¤¸à¤‚à¤¸à¥à¤•à¤°à¤£, à¤”à¤° à¤¬à¥à¤°à¥‡à¤•à¤¿à¤‚à¤— à¤¨à¥à¤¯à¥‚à¤œà¤¼ à¤•à¥‡ à¤²à¤¿à¤ Firebase Cloud Messaging (FCM) à¤Ÿà¥‹à¤•à¤¨à¥¤"
                : "â€¢ Device & Usage Data: Technical details like device model, Android OS version, and Firebase Cloud Messaging (FCM) token for push notifications."}
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Camera className="h-4 w-4 text-primary" />
            {isHi ? "2. Android à¤…à¤¨à¥à¤®à¤¤à¤¿à¤¯à¤¾à¤‚ (Permissions)" : "2. Android Permissions Used"}
          </h2>
          <div className="text-muted-foreground space-y-1.5 pl-6">
            <p>
              {isHi
                ? "â€¢ à¤‡à¤‚à¤Ÿà¤°à¤¨à¥‡à¤Ÿ (INTERNET & ACCESS_NETWORK_STATE): à¤¤à¤¾à¤œà¤¼à¤¾ à¤–à¤¼à¤¬à¤°à¥‡à¤‚, à¤µà¥€à¤¡à¤¿à¤¯à¥‹ à¤”à¤° à¤ˆ-à¤ªà¥‡à¤ªà¤° à¤²à¥‹à¤¡ à¤•à¤°à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤…à¤¨à¤¿à¤µà¤¾à¤°à¥à¤¯à¥¤"
                : "â€¢ Internet (INTERNET & ACCESS_NETWORK_STATE): Required to stream live TV, load articles, video reels, and e-paper editions."}
            </p>
            <p>
              {isHi
                ? "â€¢ à¤¸à¥‚à¤šà¤¨à¤¾à¤à¤‚ (POST_NOTIFICATIONS): à¤¬à¥à¤°à¥‡à¤•à¤¿à¤‚à¤— à¤¨à¥à¤¯à¥‚à¤œà¤¼ à¤”à¤° à¤œà¤¨à¤ªà¤¦ à¤¬à¤¿à¤œà¤¨à¥Œà¤° à¤•à¥‡ à¤®à¤¹à¤¤à¥à¤µà¤ªà¥‚à¤°à¥à¤£ à¤…à¤²à¤°à¥à¤Ÿ à¤­à¥‡à¤œà¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ (à¤†à¤ª à¤‡à¤¸à¥‡ à¤•à¤­à¥€ à¤­à¥€ à¤¡à¤¿à¤µà¤¾à¤‡à¤¸ à¤¸à¥‡à¤Ÿà¤¿à¤‚à¤—à¥à¤¸ à¤¸à¥‡ à¤¬à¤‚à¤¦ à¤•à¤° à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚)à¥¤"
                : "â€¢ Notifications (POST_NOTIFICATIONS): Used only to deliver critical breaking news and updates for District Bijnor. You can toggle this anytime in device settings."}
            </p>
            <p>
              {isHi
                ? "â€¢ à¤®à¥€à¤¡à¤¿à¤¯à¤¾ à¤”à¤° à¤¤à¤¸à¥à¤µà¥€à¤°à¥‡à¤‚ (READ_MEDIA_IMAGES): à¤‡à¤¸à¤•à¤¾ à¤‰à¤ªà¤¯à¥‹à¤— à¤•à¥‡à¤µà¤² à¤¤à¤¬ à¤¹à¥‹à¤¤à¤¾ à¤¹à¥ˆ à¤œà¤¬ à¤†à¤ª 'à¤œà¤¨ à¤•à¥€ à¤†à¤µà¤¾à¤œà¤¼' à¤®à¥‡à¤‚ à¤…à¤ªà¤¨à¥€ à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ à¤•à¥‡ à¤¸à¤¾à¤¥ à¤«à¥‹à¤Ÿà¥‹ à¤…à¤Ÿà¥ˆà¤š à¤•à¤°à¤¨à¤¾ à¤šà¥à¤¨à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤"
                : "â€¢ Photos & Media (System Photo Picker): Selected only through Android's secure system photo picker when you voluntarily attach a photo or video to a citizen grievance submission. No device storage permission is requested or required."}
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Eye className="h-4 w-4 text-primary" />
            {isHi ? "3. à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤•à¤¾ à¤‰à¤ªà¤¯à¥‹à¤—" : "3. How We Use Your Information"}
          </h2>
          <p className="text-muted-foreground pl-6">
            {isHi
              ? "à¤¹à¤® à¤à¤•à¤¤à¥à¤°à¤¿à¤¤ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤•à¤¾ à¤‰à¤ªà¤¯à¥‹à¤— à¤•à¥‡à¤µà¤² à¤¸à¤®à¤¾à¤šà¤¾à¤° à¤¸à¥‡à¤µà¤¾à¤à¤‚ à¤ªà¥à¤°à¤¦à¤¾à¤¨ à¤•à¤°à¤¨à¥‡, à¤¨à¤¾à¤—à¤°à¤¿à¤• à¤¶à¤¿à¤•à¤¾à¤¯à¤¤à¥‹à¤‚ à¤•à¥€ à¤¸à¤®à¥€à¤•à¥à¤·à¤¾ à¤µ à¤ªà¥à¤°à¤¶à¤¾à¤¸à¤¨ à¤¤à¤• à¤ªà¤¹à¥à¤‚à¤šà¤¾à¤¨à¥‡, à¤¬à¥à¤°à¥‡à¤•à¤¿à¤‚à¤— à¤…à¤²à¤°à¥à¤Ÿ à¤­à¥‡à¤œà¤¨à¥‡ à¤”à¤° à¤à¤ª à¤•à¥‡ à¤ªà¥à¤°à¤¦à¤°à¥à¤¶à¤¨ à¤•à¥‹ à¤¬à¥‡à¤¹à¤¤à¤° à¤¬à¤¨à¤¾à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤•à¤°à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤ à¤¹à¤® à¤†à¤ªà¤•à¥€ à¤µà¥à¤¯à¤•à¥à¤¤à¤¿à¤—à¤¤ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤•à¤¿à¤¸à¥€ à¤­à¥€ à¤¤à¥€à¤¸à¤°à¥‡ à¤ªà¤•à¥à¤· à¤•à¥‹ à¤¨à¤¹à¥€à¤‚ à¤¬à¥‡à¤šà¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤"
              : "We use the information strictly to deliver news services, review and forward civic grievances to relevant administrative departments, broadcast emergency alerts, and improve app stability. We never sell your personal information."}
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Lock className="h-4 w-4 text-primary" />
            {isHi ? "4. à¤¤à¥ƒà¤¤à¥€à¤¯-à¤ªà¤•à¥à¤· à¤¸à¥‡à¤µà¤¾à¤à¤‚ (Third-Party Services)" : "4. Third-Party Services"}
          </h2>
          <div className="text-muted-foreground space-y-1.5 pl-6">
            <p>
              {isHi
                ? "â€¢ Google Play Services & Firebase: à¤¨à¥‹à¤Ÿà¤¿à¤«à¤¿à¤•à¥‡à¤¶à¤¨ à¤­à¥‡à¤œà¤¨à¥‡ à¤”à¤° à¤à¤ª à¤µà¤¿à¤¤à¤°à¤£ à¤•à¥‡ à¤²à¤¿à¤à¥¤"
                : "â€¢ Google Play Services & Firebase Cloud Messaging: For reliable push notifications and app distribution."}
            </p>
            <p>
              {isHi
                ? "â€¢ Supabase: à¤à¤¨à¥à¤•à¥à¤°à¤¿à¤ªà¥à¤Ÿà¥‡à¤¡ à¤”à¤° à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤¡à¥‡à¤Ÿà¤¾à¤¬à¥‡à¤¸ à¤µ à¤ªà¥à¤°à¤®à¤¾à¤£à¥€à¤•à¤°à¤£à¥¤"
                : "â€¢ Supabase: Encrypted cloud database and secure session management."}
            </p>
            <p>
              {isHi
                ? "â€¢ YouTube API: à¤¸à¤®à¤¾à¤šà¤¾à¤° à¤µà¥€à¤¡à¤¿à¤¯à¥‹ à¤”à¤° à¤²à¤¾à¤‡à¤µ à¤ªà¥à¤°à¤¸à¤¾à¤°à¤£ à¤¦à¥‡à¤–à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤à¥¤"
                : "â€¢ YouTube: For streaming live channel broadcasts and official video reports."}
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Bell className="h-4 w-4 text-primary" />
            {isHi
              ? "5. à¤¡à¥‡à¤Ÿà¤¾ à¤¸à¥à¤°à¤•à¥à¤·à¤¾ à¤”à¤° à¤–à¤¾à¤¤à¤¾ à¤¹à¤Ÿà¤¾à¤¨à¤¾ (Data Deletion)"
              : "5. Data Retention & Account Deletion"}
          </h2>
          <p className="text-muted-foreground pl-6">
            {isHi
              ? "à¤†à¤ª à¤•à¤­à¥€ à¤­à¥€ à¤…à¤ªà¤¨à¥‡ à¤–à¤¾à¤¤à¥‡ à¤…à¤¥à¤µà¤¾ à¤…à¤ªà¤¨à¥€ à¤¸à¤¬à¤®à¤¿à¤Ÿ à¤•à¥€ à¤—à¤ˆ à¤¸à¤¾à¤®à¤—à¥à¤°à¥€ à¤•à¥‹ à¤¹à¤Ÿà¤¾à¤¨à¥‡ à¤•à¤¾ à¤…à¤¨à¥à¤°à¥‹à¤§ à¤•à¤° à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤ à¤‡à¤¸à¤•à¥‡ à¤²à¤¿à¤ à¤†à¤ª à¤¹à¤®à¥‡à¤‚ à¤¸à¥€à¤§à¥‡ à¤«à¥‹à¤¨ à¤¯à¤¾ à¤µà¥à¤¹à¤¾à¤Ÿà¥à¤¸à¤à¤ª à¤ªà¤° à¤¸à¤‚à¤ªà¤°à¥à¤• à¤•à¤° à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚, à¤”à¤° à¤¹à¤®à¤¾à¤°à¥€ à¤Ÿà¥€à¤® 7 à¤•à¤¾à¤°à¥à¤¯ à¤¦à¤¿à¤µà¤¸à¥‹à¤‚ à¤•à¥‡ à¤­à¥€à¤¤à¤° à¤†à¤ªà¤•à¤¾ à¤¡à¥‡à¤Ÿà¤¾ à¤¸à¥à¤¥à¤¾à¤¯à¥€ à¤°à¥‚à¤ª à¤¸à¥‡ à¤¹à¤Ÿà¤¾ à¤¦à¥‡à¤—à¥€à¥¤"
              : "You have the right to request deletion of your account or submitted grievances at any time. Simply contact us via phone or WhatsApp, and our team will permanently delete your data within 7 business days."}
          </p>
        </section>

        {/* Section 6 - Contact */}
        <section className="mt-8 rounded-xl border bg-muted/30 p-4 space-y-3">
          <h2 className="text-base font-bold text-foreground">
            {isHi ? "à¤¸à¤‚à¤ªà¤°à¥à¤• à¤•à¤°à¥‡à¤‚ (Contact Information)" : "Contact Us"}
          </h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">à¤…à¤­à¥€ à¤¤à¤• à¤¡à¤¿à¤œà¤¿à¤Ÿà¤² à¤¸à¤®à¤¾à¤šà¤¾à¤° à¤¨à¥‡à¤Ÿà¤µà¤°à¥à¤•</p>
            <p>à¤œà¤¨à¤ªà¤¦ à¤¬à¤¿à¤œà¤¨à¥Œà¤°, à¤‰à¤¤à¥à¤¤à¤° à¤ªà¥à¤°à¤¦à¥‡à¤¶, à¤­à¤¾à¤°à¤¤ Â· District Bijnor, Uttar Pradesh, India</p>
            <div className="flex flex-wrap gap-4 pt-1">
              <a
                href={`tel:${CONTACT_PHONE.replace(/-/g, "")}`}
                className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
              >
                <Phone className="h-4 w-4" /> {CONTACT_PHONE}
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-600 hover:underline font-medium"
              >
                <Mail className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* Back button */}
      <div className="mt-8 border-t pt-6 text-center">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow"
        >
          {isHi ? "à¤®à¥à¤–à¥à¤¯ à¤ªà¥ƒà¤·à¥à¤  à¤ªà¤° à¤œà¤¾à¤à¤‚ (Home)" : "Back to Home"}
        </Link>
      </div>
    </div>
  );
}
