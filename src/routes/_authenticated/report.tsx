import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Camera, Video, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { townsQuery } from "@/lib/queries";
import { useI18n, JKA_CATEGORIES } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { UploadNote } from "@/components/UploadNote";
import { uploadMedia } from "@/lib/upload";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({
    meta: [{ title: "Report an issue — Jan Ki Awaaz" }, { name: "robots", content: "noindex" }],
  }),
  component: ReportPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Name required").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  category: z.string().min(1, "Choose a category"),
  town_id: z.string().uuid("Choose a town"),
  area: z.string().trim().max(120).optional(),
  title: z.string().trim().min(5, "Title is too short").max(150),
  description: z.string().trim().min(20, "Please describe the issue (min 20 characters)").max(3000),
});

async function upload(_userId: string, file: File) {
  return uploadMedia(file, "reports");
}

function ReportPage() {
  const { user } = Route.useRouteContext();
  const { t, pick, lang } = useI18n();
  const navigate = useNavigate();
  const { data: towns } = useQuery(townsQuery);
  const [f, setF] = useState({
    name: "",
    phone: "",
    category: "",
    town_id: "",
    area: "",
    title: "",
    description: "",
  });
  const [anon, setAnon] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hp, setHp] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("full_name, phone, town_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data)
          setF((p) => ({
            ...p,
            name: data.full_name ?? "",
            phone: data.phone ?? "",
            town_id: data.town_id ?? "",
          }));
      });
  }, [user.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hp) return;
    const parsed = schema.safeParse(f);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message);
      return;
    }
    if (photo && photo.size > 10 * 1024 * 1024) {
      toast.error("Photo must be under 10 MB");
      return;
    }
    if (video && video.size > 50 * 1024 * 1024) {
      toast.error("Video must be under 50 MB");
      return;
    }
    setBusy(true);
    try {
      await supabase
        .from("profiles")
        .update({
          full_name: parsed.data.name,
          phone: parsed.data.phone,
          town_id: parsed.data.town_id,
        })
        .eq("id", user.id);
      const photo_url = photo ? await upload(user.id, photo) : null;
      const video_url = video ? await upload(user.id, video) : null;
      const { data, error } = await supabase
        .from("jan_ki_awaaz_posts")
        .insert({
          user_id: user.id,
          reporter_name: parsed.data.name,
          category: parsed.data.category,
          town_id: parsed.data.town_id,
          area: parsed.data.area || null,
          title: parsed.data.title,
          description: parsed.data.description,
          photo_url,
          video_url,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          is_anonymous: anon,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success(
        lang === "en" ? "Issue submitted for review" : "आपकी समस्या समीक्षा के लिए भेज दी गई",
      );
      navigate({ to: "/my-issues", search: { new: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  };

  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value });
  const selectCls = "mt-1.5 h-12 w-full rounded-md border border-input bg-card px-3 text-[15px]";

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl lg:max-w-3xl space-y-5 px-4 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-sm bg-primary text-primary-foreground">
          <Megaphone className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">{t("reportIssue")}</h1>
          <p className="text-sm text-muted-foreground">{t("jkaTagline")}</p>
        </div>
      </div>

      <input
        tabIndex={-1}
        autoComplete="off"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        className="hidden"
        aria-hidden
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t("name")} *</Label>
          <Input className="mt-1.5 h-12" value={f.name} onChange={set("name")} />
        </div>
        <div>
          <Label>{t("mobile")} *</Label>
          <Input
            className="mt-1.5 h-12"
            inputMode="numeric"
            maxLength={10}
            value={f.phone}
            onChange={set("phone")}
          />
        </div>
      </div>

      <div>
        <Label>{t("category")} *</Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {JKA_CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.slug}
              onClick={() => setF({ ...f, category: c.slug })}
              className={cn(
                "h-11 rounded-sm border text-[13px] font-medium",
                f.category === c.slug
                  ? "border-primary bg-accent text-accent-foreground"
                  : "bg-card",
              )}
            >
              {lang === "en" ? c.en : c.hi}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t("town")} *</Label>
          <select className={selectCls} value={f.town_id} onChange={set("town_id")}>
            <option value="">—</option>
            {towns?.map((tw) => (
              <option key={tw.id} value={tw.id}>
                {pick(tw.name_hi, tw.name_en)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>{t("area")}</Label>
          <Input className="mt-1.5 h-12" value={f.area} onChange={set("area")} />
        </div>
      </div>

      <div>
        <Label>{t("title")} *</Label>
        <Input className="mt-1.5 h-12" maxLength={150} value={f.title} onChange={set("title")} />
      </div>
      <div>
        <Label>{t("description")} *</Label>
        <Textarea
          className="mt-1.5 min-h-32 text-[15px]"
          maxLength={3000}
          value={f.description}
          onChange={set("description")}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border border-dashed bg-card text-[13px] hover:bg-muted/40 transition-colors">
            <Camera className="h-5 w-5 text-primary" />{" "}
            <span className="max-w-full truncate px-2 font-medium">
              {photo?.name ?? t("photo")}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
          <UploadNote
            type="JPG, PNG, WebP, HEIC"
            maxSize="15 MB"
            ratio="16:9 / 4:3 (Landscape / Portrait)"
            hint={
              lang === "hi"
                ? "स्पष्ट तस्वीर अपलोड करें ताकि समस्या साफ दिखे।"
                : "Clear issue photo with visible details."
            }
          />
        </div>
        <div>
          <label className="flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border border-dashed bg-card text-[13px] hover:bg-muted/40 transition-colors">
            <Video className="h-5 w-5 text-primary" />{" "}
            <span className="max-w-full truncate px-2 font-medium">
              {video?.name ?? t("video")}
            </span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
            />
          </label>
          <UploadNote
            type="MP4, MOV, WebM"
            maxSize="50 MB"
            ratio="16:9 / 9:16 (Landscape / Vertical)"
            hint={
              lang === "hi"
                ? "समस्या का संक्षिप्त वीडियो रिकॉर्ड या अपलोड करें।"
                : "Brief video recording or issue clip."
            }
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          navigator.geolocation?.getCurrentPosition(
            (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => toast.error("Location unavailable"),
          )
        }
        className="text-sm font-medium text-primary"
      >
        {coords
          ? `📍 ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
          : lang === "en"
            ? "+ Add my location (optional)"
            : "+ मेरी लोकेशन जोड़ें (वैकल्पिक)"}
      </button>

      <label className="flex items-start gap-3 rounded-sm border bg-card p-3">
        <Checkbox checked={anon} onCheckedChange={(v) => setAnon(v === true)} className="mt-0.5" />
        <span className="text-[14px]">
          <span className="font-semibold">{t("publishAnon")}</span>
          <span className="block text-muted-foreground">
            {lang === "en"
              ? "Public will see “Anonymous Citizen”. Your details stay private with Abhi Tak."
              : "जनता को “अज्ञात नागरिक” दिखेगा। आपकी जानकारी अभी तक के पास सुरक्षित रहेगी।"}
          </span>
        </span>
      </label>

      <Button
        type="submit"
        disabled={busy}
        className="h-14 w-full text-[17px] font-bold uppercase tracking-wide"
      >
        {busy ? "…" : t("submitIssue")}
      </Button>
    </form>
  );
}
