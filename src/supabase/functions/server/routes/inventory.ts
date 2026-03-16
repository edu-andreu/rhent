import type { Hono } from "npm:hono";
import type { SupabaseClient } from "npm:@supabase/supabase-js";
import { getCurrentUserDisplay } from "../helpers/auth.ts";
import * as kv from "../kv_store.ts";
import { roundToNearestThousand } from "../priceUtils.ts";
import { batchResolveImageUrls } from "../helpers/images.ts";

export function registerInventoryRoutes(app: Hono, supabase: SupabaseClient) {

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const getCheckedOutItemIds = async () => {
    const { data, error } = await supabase
      .from("rental_items")
      .select("item_id")
      .eq("status", "checked_out");

    if (error) {
      console.log("Warning: Could not fetch checked out item ids:", error.message);
      return new Set<string>();
    }

    return new Set((data || []).map((row) => row.item_id).filter(Boolean));
  };

  // GET all inventory items
  app.get("/make-server-918f1e54/inventory-items", async (c) => {
    try {
      const { data: items, error } = await supabase
        .from("inventory_items")
        .select(`
          id, sku, description, curr_price, status,
          category_id, subcategory_id, brand_id, size_id, color_id, name_id, location_id,
          is_for_sale, sale_price, stock_quantity, is_stock_tracked, low_stock_threshold,
          category:category_id (category, default_image),
          subcategory:subcategory_id (subcategory),
          brand:brand_id (brand),
          size:size_id (size),
          color:color_id (color),
          name:name_id (name),
          location:location_id (location, badge_class, availability_status),
          inventory_item_colors ( color:color_id (color) )
        `)
        .eq("status", "On")
        .order("created_at", { ascending: false });

      if (error) {
        console.log("Error fetching inventory items:", error);
        return c.json({ error: `Failed to fetch inventory items: ${error.message}` }, 500);
      }

      if (!items || items.length === 0) {
        return c.json({ dresses: [] });
      }

      const rentalCountMap: Record<string, number> = {};
      const { data: rentalCounts, error: rentalCountError } = await supabase
        .rpc("get_rental_counts");

      if (!rentalCountError && rentalCounts) {
        for (const row of rentalCounts) {
          rentalCountMap[row.item_id] = Number(row.rental_count);
        }
      } else if (rentalCountError) {
        console.log("Warning: Could not fetch rental counts for popularity sorting:", rentalCountError.message);
      }

      const checkedOutItemIds = await getCheckedOutItemIds();

      const itemIds = items.map((item) => item.id);
      const categoryDefaults = new Map(
        items.map((item) => [item.id, item.category?.default_image || ""])
      );
      const imageUrlMap = await batchResolveImageUrls(supabase, itemIds, categoryDefaults);

      const dresses = items.map((item) => {
        const isCheckedOut = checkedOutItemIds.has(item.id);

        const colors = item.inventory_item_colors && item.inventory_item_colors.length > 0
          ? item.inventory_item_colors.map(ic => ic.color?.color).filter(Boolean)
          : [item.color?.color].filter(Boolean);

        return {
          id: item.id,
          name: item.name?.name || item.sku || "Unnamed Item",
          sku: item.sku,
          description: item.description || "",
          size: item.size?.size || "",
          colors: colors,
          pricePerDay: parseFloat(item.curr_price) || 0,
          imageUrl: imageUrlMap.get(item.id) || "",
          category: item.category?.category || "",
          categoryType: item.category?.category?.toLowerCase() === 'extras' ? 'service' : 'product',
          type: item.subcategory?.subcategory || "",
          brand: item.brand?.brand || "",
          available: item.status === "On" && !isCheckedOut,
          status: isCheckedOut ? "Rented" : item.location?.location || "",
          locationId: item.location_id,
          statusBadgeClass: item.location?.badge_class || "text-bg-light",
          availabilityStatus: isCheckedOut ? "unavailable" : item.location?.availability_status || "",
          rentalCount: rentalCountMap[item.id] || 0,
          isForSale: item.is_for_sale || false,
          salePrice: item.sale_price ? parseFloat(item.sale_price) : null,
          stockQuantity: item.stock_quantity ?? 1,
          isStockTracked: item.is_stock_tracked || false,
          lowStockThreshold: item.low_stock_threshold ?? 5,
        };
      });

      dresses.sort((a, b) => b.rentalCount - a.rentalCount);

      return c.json({ dresses });
    } catch (error) {
      console.log("Unexpected error fetching inventory items:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  // GET single inventory item by ID
  app.get("/make-server-918f1e54/inventory-items/:id", async (c) => {
    try {
      const itemId = c.req.param("id");
      const { data: item, error } = await supabase
        .from("inventory_items")
        .select(`
          id, sku, description, curr_price, status,
          category_id, subcategory_id, brand_id, size_id, color_id, name_id, location_id,
          is_for_sale, sale_price, stock_quantity, is_stock_tracked, low_stock_threshold,
          category:category_id (id, category, default_image),
          subcategory:subcategory_id (id, subcategory),
          brand:brand_id (id, brand),
          size:size_id (id, size),
          color:color_id (id, color),
          name:name_id (id, name),
          location:location_id (id, location, badge_class, availability_status),
          inventory_item_colors ( color:color_id (id, color) )
        `)
        .eq("id", itemId)
        .single();

      if (error) {
        console.log("Error fetching inventory item:", error);
        return c.json({ error: `Failed to fetch inventory item: ${error.message}` }, 500);
      }
      if (!item) {
        return c.json({ error: "Item not found" }, 404);
      }

      const checkedOutItemIds = await getCheckedOutItemIds();
      const isCheckedOut = checkedOutItemIds.has(item.id);
      const bucketName = 'photos';
      let imageUrl = "";
      const { data: files } = await supabase.storage.from(bucketName).list('', { search: item.id });
      if (files && files.length > 0) {
        const { data: signedUrlData } = await supabase.storage.from(bucketName).createSignedUrl(files[0].name, 31536000);
        if (signedUrlData) imageUrl = signedUrlData.signedUrl;
      } else if (item.category?.default_image && item.category.default_image.trim() !== "") {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${item.category.default_image}`;
      }

      const colors = item.inventory_item_colors && item.inventory_item_colors.length > 0
        ? item.inventory_item_colors.map(ic => ({ id: ic.color?.id, color: ic.color?.color })).filter(c => c.color)
        : item.color ? [{ id: item.color.id, color: item.color.color }] : [];

      const itemDetails = {
        id: item.id, sku: item.sku,
        name: item.name?.name || "", nameId: item.name_id,
        description: item.description || "",
        category: item.category?.category || "", categoryId: item.category_id,
        categoryType: item.category?.category?.toLowerCase() === 'extras' ? 'service' : 'product',
        subcategory: item.subcategory?.subcategory || "", subcategoryId: item.subcategory_id,
        brand: item.brand?.brand || "", brandId: item.brand_id,
        size: item.size?.size || "", sizeId: item.size_id,
        colors: colors, colorId: item.color_id,
        pricePerDay: parseFloat(item.curr_price) || 0,
        imageUrl: imageUrl,
        status: isCheckedOut ? "Rented" : item.location?.location || "", locationId: item.location_id,
        statusBadgeClass: item.location?.badge_class || "text-bg-light",
        available: item.status === "On" && !isCheckedOut,
        availabilityStatus: isCheckedOut ? "unavailable" : item.location?.availability_status || "",
        isForSale: item.is_for_sale || false,
        salePrice: item.sale_price ? parseFloat(item.sale_price) : null,
        stockQuantity: item.stock_quantity ?? 1,
        isStockTracked: item.is_stock_tracked || false,
        lowStockThreshold: item.low_stock_threshold ?? 5,
      };

      return c.json({ item: itemDetails });
    } catch (error) {
      console.log("Unexpected error fetching inventory item:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  // GET item availability calendar
  app.get("/make-server-918f1e54/inventory-items/:id/availability", async (c) => {
    try {
      const itemId = c.req.param("id");
      if (!itemId) return c.json({ error: "Item ID is required" }, 400);

      const { data, error } = await supabase
        .from("v_availability_calendar")
        .select("day, status, rental_item_id, rental_id")
        .eq("item_id", itemId)
        .in("status", ["reserved", "checked_out"])
        .order("day", { ascending: true });

      if (error) {
        console.log("Error fetching availability calendar:", error);
        return c.json({ error: `Failed to fetch availability: ${error.message}` }, 500);
      }

      return c.json({ itemId, reservedDates: data || [] });
    } catch (error) {
      console.log("Unexpected error fetching availability calendar:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  // GET reserved periods for an item
  app.get("/make-server-918f1e54/inventory-items/:id/reserved-periods", async (c) => {
    try {
      const itemId = c.req.param("id");
      if (!itemId) return c.json({ error: "Item ID is required" }, 400);

      const [blockPrevRaw, blockNextRaw] = await Promise.all([
        kv.get("config_reserve_block_prev_days"),
        kv.get("config_reserve_block_next_days"),
      ]);
      const blockPrevDays = parseInt(blockPrevRaw as string) || 4;
      const blockNextDays = parseInt(blockNextRaw as string) || 1;

      const { data, error } = await supabase
        .from("rental_items")
        .select("id, rental_id, start_date, end_date, status")
        .eq("item_id", itemId)
        .in("status", ["reserved", "checked_out"])
        .order("start_date", { ascending: true });

      if (error) {
        console.log("Error fetching reserved periods for item:", itemId, error);
        return c.json({ error: `Failed to fetch reserved periods: ${error.message}` }, 500);
      }

      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const gmt3 = new Date(utc + (3600000 * -3));
      const todayStr = `${gmt3.getFullYear()}-${String(gmt3.getMonth() + 1).padStart(2, '0')}-${String(gmt3.getDate()).padStart(2, '0')}`;

      const reservedPeriods = (data || []).map((item: any) => {
        let effectiveEndDate = item.end_date;
        if (item.status === "checked_out" && item.end_date < todayStr) {
          effectiveEndDate = todayStr;
          console.log(`Late return detected for rental_item ${item.id}: end_date=${item.end_date}, extended to ${todayStr}`);
        }
        return {
          start_date: item.start_date,
          end_date: item.end_date,
          effective_end_date: effectiveEndDate,
          rental_id: item.rental_id,
          rental_item_id: item.id,
          status: item.status,
        };
      });

      console.log(`Reserved periods for item ${itemId}: ${reservedPeriods.length} periods found, blockPrev=${blockPrevDays}, blockNext=${blockNextDays}`);

      return c.json({ itemId, reservedPeriods, blockPrevDays, blockNextDays });
    } catch (error) {
      console.log("Unexpected error fetching reserved periods:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  // POST create new inventory item
  app.post("/make-server-918f1e54/inventory-items", async (c) => {
    try {
      const body = await c.req.json();
      console.log("Creating new inventory item with data:", body);
      const {
        nameId, categoryId, subcategoryId, brandId, sizeId, colorId, locationId,
        description, pricePerDay, price, colorIds, colors,
        isForSale, salePrice, stockQuantity, isStockTracked, lowStockThreshold,
      } = body;

      const colorArray = colorIds || colors;
      const rawPrice = price || pricePerDay;
      const isSaleItem = isForSale === true;

      if (isSaleItem) {
        if (!nameId || !sizeId) return c.json({ error: "Missing required fields: nameId and sizeId are required" }, 400);
        if (!salePrice || salePrice <= 0) return c.json({ error: "sale_price is required and must be positive for items for sale" }, 400);
        if (isStockTracked && (stockQuantity === undefined || stockQuantity < 0)) return c.json({ error: "stock_quantity is required and must be non-negative for products" }, 400);
      } else {
        if (!nameId || !sizeId || !rawPrice) return c.json({ error: "Missing required fields: nameId, sizeId, and price are required" }, 400);
      }

      const finalPrice = isSaleItem ? null : roundToNearestThousand(parseFloat(rawPrice));
      const finalSalePrice = isSaleItem ? roundToNearestThousand(parseFloat(salePrice)) : null;

      const { data: newItem, error: insertError } = await supabase
        .from("inventory_items")
        .insert({
          name_id: nameId, category_id: categoryId || null,
          subcategory_id: subcategoryId || null, brand_id: brandId || null,
          size_id: sizeId, color_id: colorId || null, location_id: locationId || null,
          description: description || null, curr_price: finalPrice,
          is_for_sale: isSaleItem, sale_price: finalSalePrice,
          stock_quantity: isSaleItem && isStockTracked ? (stockQuantity ?? 1) : 1,
          is_stock_tracked: isSaleItem ? (isStockTracked || false) : false,
          low_stock_threshold: isSaleItem && isStockTracked ? (lowStockThreshold || 5) : 5,
          status: "On", created_by: getCurrentUserDisplay(c), updated_by: getCurrentUserDisplay(c),
        })
        .select()
        .single();

      if (insertError) {
        console.log("Error creating inventory item:", insertError);
        return c.json({ error: `Failed to create inventory item: ${insertError.message}` }, 500);
      }

      if (colorArray && Array.isArray(colorArray) && colorArray.length > 0) {
        const colorInserts = colorArray.map(cId => ({ item_id: newItem.id, color_id: cId }));
        const { error: colorError } = await supabase.from("inventory_item_colors").insert(colorInserts);
        if (colorError) console.log("Error inserting item colors:", colorError);
      }

      const { data: fullItem, error: fetchError } = await supabase
        .from("inventory_items")
        .select(`
          id, sku, description, curr_price, status,
          is_for_sale, sale_price, stock_quantity, is_stock_tracked, low_stock_threshold,
          category:category_id (category, default_image),
          subcategory:subcategory_id (subcategory),
          brand:brand_id (brand), size:size_id (size),
          color:color_id (color), name:name_id (name),
          location:location_id (location, badge_class, availability_status),
          inventory_item_colors ( color:color_id (color) )
        `)
        .eq("id", newItem.id)
        .single();

      if (fetchError) {
        console.log("Error fetching created item details:", fetchError);
        return c.json({ success: true, item: newItem });
      }

      const bucketName = 'photos';
      let imageUrl = "";
      const { data: files } = await supabase.storage.from(bucketName).list('', { search: fullItem.id });
      if (files && files.length > 0) {
        const { data: signedUrlData } = await supabase.storage.from(bucketName).createSignedUrl(files[0].name, 31536000);
        if (signedUrlData) imageUrl = signedUrlData.signedUrl;
      } else if (fullItem.category?.default_image && fullItem.category.default_image.trim() !== "") {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${fullItem.category.default_image}`;
      }

      const itemColors = fullItem.inventory_item_colors && fullItem.inventory_item_colors.length > 0
        ? fullItem.inventory_item_colors.map(ic => ic.color?.color).filter(Boolean)
        : [fullItem.color?.color].filter(Boolean);
      const checkedOutItemIds = await getCheckedOutItemIds();
      const isCheckedOut = checkedOutItemIds.has(fullItem.id);

      const dressResponse = {
        id: fullItem.id, name: fullItem.name?.name || fullItem.sku || "Unnamed Item",
        sku: fullItem.sku, description: fullItem.description || "",
        size: fullItem.size?.size || "", colors: itemColors,
        pricePerDay: parseFloat(fullItem.curr_price) || 0, imageUrl: imageUrl,
        category: fullItem.category?.category || "",
        categoryType: fullItem.category?.category?.toLowerCase() === 'extras' ? 'service' : 'product',
        type: fullItem.subcategory?.subcategory || "", brand: fullItem.brand?.brand || "",
        available: fullItem.status === "On" && !isCheckedOut,
        status: isCheckedOut ? "Rented" : fullItem.location?.location || "",
        statusBadgeClass: fullItem.location?.badge_class || "text-bg-light",
        availabilityStatus: isCheckedOut ? "unavailable" : fullItem.location?.availability_status || "",
        isForSale: fullItem.is_for_sale || false,
        salePrice: fullItem.sale_price ? parseFloat(fullItem.sale_price) : null,
        stockQuantity: fullItem.stock_quantity ?? 1,
        isStockTracked: fullItem.is_stock_tracked || false,
        lowStockThreshold: fullItem.low_stock_threshold ?? 5,
      };

      return c.json({ success: true, item: dressResponse });
    } catch (error) {
      console.log("Unexpected error creating inventory item:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  // PUT update inventory item
  app.put("/make-server-918f1e54/inventory-items/:id", async (c) => {
    try {
      const itemId = c.req.param("id");
      const body = await c.req.json();
      const {
        nameId, categoryId, subcategoryId, brandId, sizeId, colorId, locationId,
        description, pricePerDay, price, colorIds, colors, salePrice, stockQuantity, lowStockThreshold,
      } = body;

      const colorArray = colorIds || colors;
      const rawPrice = price || pricePerDay;

      const { data: currentItem, error: currentItemError } = await supabase
        .from("inventory_items")
        .select("is_for_sale, is_stock_tracked")
        .eq("id", itemId)
        .single();

      if (currentItemError || !currentItem) {
        return c.json({ error: `Item not found: ${currentItemError?.message || 'unknown'}` }, 404);
      }

      if (body.isForSale !== undefined && body.isForSale !== currentItem.is_for_sale) {
        return c.json({ error: "Cannot change item type (isForSale) after creation. Create a new item instead." }, 400);
      }

      const updateFields: Record<string, any> = { updated_by: getCurrentUserDisplay(c) };
      if (nameId !== undefined) updateFields.name_id = nameId || null;
      if (categoryId !== undefined) updateFields.category_id = categoryId || null;
      if (subcategoryId !== undefined) updateFields.subcategory_id = subcategoryId || null;
      if (brandId !== undefined) updateFields.brand_id = brandId || null;
      if (sizeId !== undefined) updateFields.size_id = sizeId || null;
      if (colorId !== undefined) updateFields.color_id = colorId || null;
      if (locationId !== undefined) updateFields.location_id = locationId || null;
      if (description !== undefined) updateFields.description = description || null;

      if (currentItem.is_for_sale) {
        if (salePrice !== undefined) updateFields.sale_price = salePrice ? roundToNearestThousand(parseFloat(salePrice)) : null;
        if (stockQuantity !== undefined) updateFields.stock_quantity = stockQuantity;
        if (lowStockThreshold !== undefined) updateFields.low_stock_threshold = lowStockThreshold;
      } else {
        if (rawPrice !== undefined) updateFields.curr_price = rawPrice ? roundToNearestThousand(parseFloat(rawPrice)) : null;
      }

      const { data: updatedItem, error: updateError } = await supabase
        .from("inventory_items").update(updateFields).eq("id", itemId).select().single();
      if (updateError) {
        console.log("Error updating inventory item:", updateError);
        return c.json({ error: `Failed to update inventory item: ${updateError.message}` }, 500);
      }

      if (colorArray && Array.isArray(colorArray) && colorArray.length > 0) {
        await supabase.from("inventory_item_colors").delete().eq("item_id", itemId);
        const colorInserts = colorArray.map(cId => ({ item_id: itemId, color_id: cId }));
        const { error: colorError } = await supabase.from("inventory_item_colors").insert(colorInserts);
        if (colorError) console.log("Error updating item colors:", colorError);
      }

      // When client sends empty imageUrl, remove item's image from storage so response uses category default
      const requestedImageUrl = body.imageUrl;
      if (requestedImageUrl === "" || requestedImageUrl === null) {
        const bucketName = 'photos';
        const { data: existingFiles } = await supabase.storage.from(bucketName).list('', { search: itemId });
        if (existingFiles && existingFiles.length > 0) {
          const filesToDelete = existingFiles.map((file: { name: string }) => file.name);
          const { error: storageError } = await supabase.storage.from(bucketName).remove(filesToDelete);
          if (storageError) console.log("Error removing item image from storage on update:", storageError);
        }
      }

      const { data: fullItem, error: fetchError } = await supabase
        .from("inventory_items")
        .select(`
          id, sku, description, curr_price, status, location_id,
          is_for_sale, sale_price, stock_quantity, is_stock_tracked, low_stock_threshold,
          category:category_id (category, default_image),
          subcategory:subcategory_id (subcategory),
          brand:brand_id (brand), size:size_id (size),
          color:color_id (color), name:name_id (name),
          location:location_id (location, badge_class, availability_status),
          inventory_item_colors ( color:color_id (color) )
        `)
        .eq("id", itemId).single();

      if (fetchError) {
        console.log("Error fetching updated item details:", fetchError);
        return c.json({ success: true, item: updatedItem });
      }

      const bucketName = 'photos';
      let imageUrl = "";
      const { data: files } = await supabase.storage.from(bucketName).list('', { search: fullItem.id });
      if (files && files.length > 0) {
        const { data: signedUrlData } = await supabase.storage.from(bucketName).createSignedUrl(files[0].name, 31536000);
        if (signedUrlData) imageUrl = signedUrlData.signedUrl;
      } else if (fullItem.category?.default_image && fullItem.category.default_image.trim() !== "") {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${fullItem.category.default_image}`;
      }

      const itemColors = fullItem.inventory_item_colors && fullItem.inventory_item_colors.length > 0
        ? fullItem.inventory_item_colors.map(ic => ic.color?.color).filter(Boolean)
        : [fullItem.color?.color].filter(Boolean);
      const checkedOutItemIds = await getCheckedOutItemIds();
      const isCheckedOut = checkedOutItemIds.has(fullItem.id);

      const dressResponse = {
        id: fullItem.id, name: fullItem.name?.name || fullItem.sku || "Unnamed Item",
        sku: fullItem.sku, description: fullItem.description || "",
        size: fullItem.size?.size || "", colors: itemColors,
        pricePerDay: parseFloat(fullItem.curr_price) || 0, imageUrl,
        category: fullItem.category?.category || "",
        categoryType: fullItem.category?.category?.toLowerCase() === 'extras' ? 'service' : 'product',
        type: fullItem.subcategory?.subcategory || "", brand: fullItem.brand?.brand || "",
        available: fullItem.status === "On" && !isCheckedOut,
        status: isCheckedOut ? "Rented" : fullItem.location?.location || "",
        locationId: fullItem.location_id,
        statusBadgeClass: fullItem.location?.badge_class || "text-bg-light",
        availabilityStatus: isCheckedOut ? "unavailable" : fullItem.location?.availability_status || "",
        isForSale: fullItem.is_for_sale || false,
        salePrice: fullItem.sale_price ? parseFloat(fullItem.sale_price) : null,
        stockQuantity: fullItem.stock_quantity ?? 1,
        isStockTracked: fullItem.is_stock_tracked || false,
        lowStockThreshold: fullItem.low_stock_threshold ?? 5,
      };

      return c.json({ success: true, item: dressResponse });
    } catch (error) {
      console.log("Unexpected error updating inventory item:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  // DELETE inventory item
  app.delete("/make-server-918f1e54/inventory-items/:id", async (c) => {
    try {
      const itemId = c.req.param("id");
      console.log("Deleting inventory item:", itemId);

      const { error: colorsDeleteError } = await supabase.from("inventory_item_colors").delete().eq("item_id", itemId);
      if (colorsDeleteError) console.log("Error deleting item colors:", colorsDeleteError);

      const bucketName = 'photos';
      const { data: files } = await supabase.storage.from(bucketName).list('', { search: itemId });
      if (files && files.length > 0) {
        const filesToDelete = files.map(file => file.name);
        const { error: storageError } = await supabase.storage.from(bucketName).remove(filesToDelete);
        if (storageError) console.log("Error deleting item image from storage:", storageError);
      }

      const { error: deleteError } = await supabase.from("inventory_items").delete().eq("id", itemId);
      if (deleteError) {
        console.log("Error deleting inventory item:", deleteError);
        return c.json({ error: `Failed to delete inventory item: ${deleteError.message}` }, 500);
      }

      console.log("Successfully deleted inventory item:", itemId);
      return c.json({ success: true, message: "Item deleted successfully" });
    } catch (error) {
      console.log("Unexpected error deleting inventory item:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  // ============= IMAGE ROUTES =============

  // POST upload image (with remove.bg processing)
  app.post("/make-server-918f1e54/upload-image", async (c) => {
    try {
      const body = await c.req.json();
      const { itemId, imageData } = body;
      if (!itemId || !imageData) return c.json({ error: "Item ID and image data are required" }, 400);

      const matches = imageData.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) return c.json({ error: "Invalid image data format" }, 400);

      const mimeType = matches[1];
      const base64Data = matches[2];
      const binaryString = atob(base64Data);
      const originalBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) originalBytes[i] = binaryString.charCodeAt(i);

      let processedBytes = originalBytes;
      let usedRemoveBg = false;

      try {
        const removeBgApiKey = Deno.env.get("REMOVEBG_API_KEY");
        if (removeBgApiKey) {
          console.log("Processing image with remove.bg API...");
          const formData = new FormData();
          const blob = new Blob([originalBytes], { type: `image/${mimeType}` });
          formData.append('image_file', blob); formData.append('size', 'regular');
          formData.append('format', 'png'); formData.append('type', 'product');
          formData.append('crop', 'true'); formData.append('crop_margin', '12%');
          formData.append('position', 'center'); formData.append('bg_color', 'D8DAD5');
          const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST', headers: { 'X-Api-Key': removeBgApiKey }, body: formData,
          });
          if (removeBgResponse.ok) {
            processedBytes = new Uint8Array(await removeBgResponse.arrayBuffer());
            usedRemoveBg = true;
          } else {
            console.log(`Remove.bg API error (${removeBgResponse.status}):`, await removeBgResponse.text());
          }
        }
      } catch (removeBgError) {
        console.log("Error calling remove.bg API:", removeBgError);
      }

      const bucketName = 'photos';
      const fileName = `${itemId}.png`;
      const { data: existingFiles } = await supabase.storage.from(bucketName).list('', { search: itemId });
      if (existingFiles && existingFiles.length > 0) {
        for (const file of existingFiles) await supabase.storage.from(bucketName).remove([file.name]);
      }

      const { data, error } = await supabase.storage.from(bucketName).upload(fileName, processedBytes, { contentType: 'image/png', upsert: true });
      if (error) return c.json({ error: `Failed to upload image: ${error.message}` }, 500);

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from(bucketName).createSignedUrl(fileName, 31536000);
      if (signedUrlError) return c.json({ error: `Failed to create signed URL: ${signedUrlError.message}` }, 500);

      return c.json({ success: true, imageUrl: signedUrlData.signedUrl, fileName, processedWithRemoveBg: usedRemoveBg });
    } catch (error) {
      console.log("Unexpected error uploading image:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  // POST rename image
  app.post("/make-server-918f1e54/rename-image", async (c) => {
    try {
      const body = await c.req.json();
      const { oldItemId, newItemId } = body;
      if (!oldItemId || !newItemId) return c.json({ error: "Old and new item IDs are required" }, 400);

      const bucketName = 'photos';
      const { data: files } = await supabase.storage.from(bucketName).list('', { search: oldItemId });
      if (!files || files.length === 0) return c.json({ success: true, message: "No image to rename" });

      const oldFileName = files[0].name;
      const extension = oldFileName.split('.').pop();
      const newFileName = `${newItemId}.${extension}`;

      const { data: fileData, error: downloadError } = await supabase.storage.from(bucketName).download(oldFileName);
      if (downloadError) return c.json({ error: `Failed to download file: ${downloadError.message}` }, 500);

      const fileBytes = new Uint8Array(await fileData.arrayBuffer());
      const { error: uploadError } = await supabase.storage.from(bucketName).upload(newFileName, fileBytes, { contentType: 'image/png', upsert: true });
      if (uploadError) return c.json({ error: `Failed to upload file: ${uploadError.message}` }, 500);

      await supabase.storage.from(bucketName).remove([oldFileName]);
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from(bucketName).createSignedUrl(newFileName, 31536000);
      if (signedUrlError) return c.json({ error: `Failed to create signed URL: ${signedUrlError.message}` }, 500);

      return c.json({ success: true, imageUrl: signedUrlData.signedUrl, fileName: newFileName });
    } catch (error) {
      console.log("Unexpected error renaming image:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  // DELETE image
  app.delete("/make-server-918f1e54/delete-image/:itemId", async (c) => {
    try {
      const itemId = c.req.param("itemId");
      const bucketName = 'photos';
      if (!itemId) return c.json({ error: "Item ID is required" }, 400);

      const { data: existingFiles } = await supabase.storage.from(bucketName).list('', { search: itemId });
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(file => file.name);
        const { error: deleteError } = await supabase.storage.from(bucketName).remove(filesToDelete);
        if (deleteError) return c.json({ error: `Failed to delete image: ${deleteError.message}` }, 500);
      }

      const { data: item, error: itemError } = await supabase
        .from("inventory_items")
        .select(`category_id, category:category_id (default_image)`)
        .eq("id", itemId).single();

      let defaultImageUrl = "";
      if (!itemError && item?.category?.default_image && item.category.default_image.trim() !== "") {
        defaultImageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${item.category.default_image}`;
      }

      return c.json({ success: true, defaultImageUrl, message: "Image deleted successfully" });
    } catch (error) {
      console.log("Unexpected error deleting image:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });
}
