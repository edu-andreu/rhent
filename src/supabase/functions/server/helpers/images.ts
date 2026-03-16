import type { SupabaseClient } from "npm:@supabase/supabase-js";

const BUCKET_NAME = "photos";
const SIGNED_URL_EXPIRY = 31536000; // 1 year in seconds

/**
 * Resolves image URLs for a batch of item IDs in 2 calls total
 * instead of 2 calls per item (list + signedUrl).
 *
 * Strategy:
 *   1. List all files in the photos bucket (single call).
 *   2. Match files to item IDs by checking if the filename starts with the ID.
 *   3. Batch-create signed URLs for all matched files (single call).
 */
export async function batchResolveImageUrls(
  supabase: SupabaseClient,
  itemIds: string[],
  categoryDefaults: Map<string, string>,
): Promise<Map<string, string>> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const result = new Map<string, string>();

  if (itemIds.length === 0) return result;

  // 1. List all files in bucket (Supabase returns up to 1000 by default)
  const { data: allFiles, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list("", { limit: 10000, sortBy: { column: "name", order: "asc" } });

  if (listError || !allFiles) {
    console.log("Warning: Could not list storage files for batch image resolution:", listError?.message);
    applyFallbackDefaults(result, itemIds, categoryDefaults, supabaseUrl);
    return result;
  }

  // 2. Match files to item IDs: find the first file whose name starts with each ID
  const itemIdSet = new Set(itemIds);
  const matchedPaths: { itemId: string; filePath: string }[] = [];

  for (const file of allFiles) {
    for (const id of itemIdSet) {
      if (file.name.startsWith(id)) {
        matchedPaths.push({ itemId: id, filePath: file.name });
        itemIdSet.delete(id);
        break;
      }
    }
    if (itemIdSet.size === 0) break;
  }

  // 3. Batch-create signed URLs
  if (matchedPaths.length > 0) {
    const { data: signedUrls, error: signError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrls(
        matchedPaths.map((m) => m.filePath),
        SIGNED_URL_EXPIRY,
      );

    if (!signError && signedUrls) {
      for (let i = 0; i < matchedPaths.length; i++) {
        const url = signedUrls[i]?.signedUrl;
        if (url) {
          result.set(matchedPaths[i].itemId, url);
        }
      }
    }
  }

  // 4. Apply category default images for items without a matched photo
  applyFallbackDefaults(result, itemIds, categoryDefaults, supabaseUrl);

  return result;
}

function applyFallbackDefaults(
  result: Map<string, string>,
  itemIds: string[],
  categoryDefaults: Map<string, string>,
  supabaseUrl: string | undefined,
) {
  for (const id of itemIds) {
    if (!result.has(id)) {
      const defaultImage = categoryDefaults.get(id);
      if (defaultImage && defaultImage.trim() !== "") {
        result.set(id, `${supabaseUrl}/storage/v1/object/public/photos/${defaultImage}`);
      } else {
        result.set(id, "");
      }
    }
  }
}
