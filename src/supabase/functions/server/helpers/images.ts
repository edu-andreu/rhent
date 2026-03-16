import type { SupabaseClient } from "npm:@supabase/supabase-js";

const BUCKET_NAME = "photos";
const SIGNED_URL_EXPIRY = 31536000; // 1 year in seconds
const FILE_LIST_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface FileEntry { name: string }
let fileListCache: { files: FileEntry[]; expiry: number } | null = null;

export function clearImageCache() {
  fileListCache = null;
}

/**
 * Resolves image URLs for a batch of item IDs in at most 2 calls total
 * (one list + one batch signedUrls), with a 5-minute in-memory cache on the file list.
 */
export async function batchResolveImageUrls(
  supabase: SupabaseClient,
  itemIds: string[],
  categoryDefaults: Map<string, string>,
): Promise<Map<string, string>> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const result = new Map<string, string>();

  if (itemIds.length === 0) return result;

  let allFiles: FileEntry[];
  if (fileListCache && Date.now() < fileListCache.expiry) {
    allFiles = fileListCache.files;
  } else {
    const { data, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list("", { limit: 10000, sortBy: { column: "name", order: "asc" } });

    if (listError || !data) {
      console.log("Warning: Could not list storage files for batch image resolution:", listError?.message);
      applyFallbackDefaults(result, itemIds, categoryDefaults, supabaseUrl);
      return result;
    }

    allFiles = data;
    fileListCache = { files: allFiles, expiry: Date.now() + FILE_LIST_TTL_MS };
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
