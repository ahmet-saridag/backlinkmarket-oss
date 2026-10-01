"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "avatars";

/** Shrinks an image file to a square JPEG (center crop) so uploads stay small. */
export function fileToAvatar(file: File, size = 256): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))), "image/jpeg", 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Not an image"));
    };
    img.src = url;
  });
}

/** Stores the photo in Supabase Storage and saves its URL on the profile. Returns the new URL. */
export async function uploadAvatar(userId: string, blob: Blob): Promise<string> {
  const supabase = createClient();
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: "image/jpeg" });
  if (error) throw error;
  // The path never changes, so a version query keeps browsers from showing the old photo.
  const url = `${supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  const { error: saveError } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
  if (saveError) throw saveError;
  return url;
}

export async function removeAvatar(userId: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([`${userId}/avatar.jpg`]);
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) throw error;
}
