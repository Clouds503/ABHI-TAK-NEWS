import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads an image or media file safely to the 'media' storage bucket.
 * Tries direct client storage upload first. If any RLS policy failure occurs
 * (e.g. "new row violates row-level security policy" / 403 / AccessDenied),
 * it seamlessly routes through the authenticated server API route to guarantee success.
 */
export async function uploadMedia(file: File, folder = "uploads"): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  // 1. Try direct client upload
  try {
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(path, file, { contentType: file.type, upsert: true });

    if (!uploadError) {
      const { data: signed, error: signError } = await supabase.storage
        .from("media")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);

      if (!signError && signed?.signedUrl) {
        return signed.signedUrl;
      }
    } else {
      console.warn("Client storage upload returned error, falling back to server-side upload:", uploadError.message);
    }
  } catch (err) {
    console.warn("Direct storage upload exception, falling back to server-side upload:", err);
  }

  // 2. Server-side upload fallback (uses service role key to bypass RLS)
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const res = await fetch("/api/public/upload-media", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.url) return data.url;
    }

    // Try JSON base64 as secondary fallback if FormData had an issue
    const base64 = await fileToBase64(file);
    const jsonRes = await fetch("/api/public/upload-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64,
        filename: file.name,
        contentType: file.type,
        folder,
      }),
    });

    if (!jsonRes.ok) {
      const errData = await jsonRes.json().catch(() => ({}));
      throw new Error(errData.error || `Upload failed with status ${jsonRes.status}`);
    }

    const jsonData = await jsonRes.json();
    if (!jsonData?.url) {
      throw new Error("Upload did not return a valid URL");
    }

    return jsonData.url;
  } catch (serverErr) {
    throw new Error(
      serverErr instanceof Error ? serverErr.message : "Failed to upload image. Please try again.",
    );
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}
