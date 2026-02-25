import { createBlock } from "@/lib/actions/blocks";
import type { Block } from "@/types/block";

/**
 * Opens a file picker, uploads the selected image to Supabase Storage,
 * and creates a reference block with media_type "image".
 * Returns the created block, or null if cancelled/errored.
 */
export function uploadImageAndCreateBlock(): Promise<Block | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);

      if (file.size > 10 * 1024 * 1024) {
        alert("File too large (max 10MB)");
        return resolve(null);
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        const { url } = await res.json();

        const block = await createBlock({
          type: "reference",
          title: file.name.replace(/\.[^.]+$/, ""),
          url,
          media_type: "image",
          thumbnail_url: url,
        });

        resolve(block);
      } catch (err) {
        console.error("Image upload error:", err);
        resolve(null);
      }
    };
    input.click();
  });
}
