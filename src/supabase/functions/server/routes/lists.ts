import type { Hono } from "npm:hono";
import type { SupabaseClient } from "npm:@supabase/supabase-js";

export function registerListsRoutes(app: Hono, supabase: SupabaseClient) {

  // ============= CATEGORIES ROUTES =============

  app.get("/make-server-918f1e54/categories", async (c) => {
    try {
      const { data, error } = await supabase
        .from("category")
        .select("id, category, status, created_at, updated_at, default_image")
        .eq("status", "On")
        .order("category", { ascending: true });

      if (error) {
        console.log("Error fetching categories:", error);
        return c.json({ error: `Failed to fetch categories: ${error.message}` }, 500);
      }

      return c.json({ categories: data });
    } catch (error) {
      console.log("Unexpected error fetching categories:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.post("/make-server-918f1e54/categories", async (c) => {
    try {
      const body = await c.req.json();
      const { value } = body;

      if (!value || typeof value !== "string" || value.trim() === "") {
        return c.json({ error: "Value is required and must be a non-empty string" }, 400);
      }

      const { data, error } = await supabase
        .from("category")
        .insert([
          {
            category_raw: value.trim(),
            status: "On",
            created_by: "user",
          },
        ])
        .select("id, category, status, created_at")
        .single();

      if (error) {
        console.log("Error creating category:", error);
        return c.json({ error: `Failed to create category: ${error.message}` }, 500);
      }

      return c.json({ category: data }, 201);
    } catch (error) {
      console.log("Unexpected error creating category:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.put("/make-server-918f1e54/categories/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();
      const { value } = body;

      if (!value || typeof value !== "string" || value.trim() === "") {
        return c.json({ error: "Value is required and must be a non-empty string" }, 400);
      }

      const { data, error } = await supabase
        .from("category")
        .update({
          category_raw: value.trim(),
          updated_by: "user",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id, category, status, created_at, updated_at")
        .single();

      if (error) {
        console.log("Error updating category:", error);
        return c.json({ error: `Failed to update category: ${error.message}` }, 500);
      }

      return c.json({ category: data });
    } catch (error) {
      console.log("Unexpected error updating category:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.delete("/make-server-918f1e54/categories/:id", async (c) => {
    try {
      const id = c.req.param("id");

      const { error } = await supabase
        .from("category")
        .delete()
        .eq("id", id);

      if (error) {
        console.log("Error deleting category:", error);
        return c.json({ error: `Failed to delete category: ${error.message}` }, 500);
      }

      return c.json({ success: true });
    } catch (error) {
      console.log("Unexpected error deleting category:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  // ============= SUBCATEGORIES (TYPE) ROUTES =============

  app.get("/make-server-918f1e54/subcategories", async (c) => {
    try {
      const { data, error } = await supabase
        .from("subcategory")
        .select("id, subcategory, status, created_at, updated_at")
        .eq("status", "On")
        .order("subcategory", { ascending: true });

      if (error) {
        console.log("Error fetching subcategories:", error);
        return c.json({ error: `Failed to fetch subcategories: ${error.message}` }, 500);
      }

      return c.json({ subcategories: data });
    } catch (error) {
      console.log("Unexpected error fetching subcategories:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.post("/make-server-918f1e54/subcategories", async (c) => {
    try {
      const body = await c.req.json();
      const { value } = body;

      if (!value || typeof value !== "string" || value.trim() === "") {
        return c.json({ error: "Value is required and must be a non-empty string" }, 400);
      }

      const { data, error } = await supabase
        .from("subcategory")
        .insert([
          {
            subcategory_raw: value.trim(),
            status: "On",
            created_by: "user",
          },
        ])
        .select("id, subcategory, status, created_at")
        .single();

      if (error) {
        console.log("Error creating subcategory:", error);
        return c.json({ error: `Failed to create subcategory: ${error.message}` }, 500);
      }

      return c.json({ subcategory: data }, 201);
    } catch (error) {
      console.log("Unexpected error creating subcategory:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.put("/make-server-918f1e54/subcategories/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();
      const { value } = body;

      if (!value || typeof value !== "string" || value.trim() === "") {
        return c.json({ error: "Value is required and must be a non-empty string" }, 400);
      }

      const { data, error } = await supabase
        .from("subcategory")
        .update({
          subcategory_raw: value.trim(),
          updated_by: "user",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id, subcategory, status, created_at, updated_at")
        .single();

      if (error) {
        console.log("Error updating subcategory:", error);
        return c.json({ error: `Failed to update subcategory: ${error.message}` }, 500);
      }

      return c.json({ subcategory: data });
    } catch (error) {
      console.log("Unexpected error updating subcategory:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.delete("/make-server-918f1e54/subcategories/:id", async (c) => {
    try {
      const id = c.req.param("id");

      const { error } = await supabase
        .from("subcategory")
        .delete()
        .eq("id", id);

      if (error) {
        console.log("Error deleting subcategory:", error);
        return c.json({ error: `Failed to delete subcategory: ${error.message}` }, 500);
      }

      return c.json({ success: true });
    } catch (error) {
      console.log("Unexpected error deleting subcategory:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  // ============= COLORS ROUTES =============

  app.get("/make-server-918f1e54/colors", async (c) => {
    try {
      const { data, error } = await supabase
        .from("color")
        .select("id, color, status, created_at, updated_at")
        .eq("status", "On")
        .order("color", { ascending: true });

      if (error) {
        console.log("Error fetching colors:", error);
        return c.json({ error: `Failed to fetch colors: ${error.message}` }, 500);
      }

      return c.json({ colors: data });
    } catch (error) {
      console.log("Unexpected error fetching colors:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.post("/make-server-918f1e54/colors", async (c) => {
    try {
      const body = await c.req.json();
      const { value } = body;

      if (!value || typeof value !== "string" || value.trim() === "") {
        return c.json({ error: "Value is required and must be a non-empty string" }, 400);
      }

      const { data, error } = await supabase
        .from("color")
        .insert([
          {
            color_raw: value.trim(),
            status: "On",
            created_by: "user",
          },
        ])
        .select("id, color, status, created_at")
        .single();

      if (error) {
        console.log("Error creating color:", error);
        return c.json({ error: `Failed to create color: ${error.message}` }, 500);
      }

      return c.json({ color: data }, 201);
    } catch (error) {
      console.log("Unexpected error creating color:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.put("/make-server-918f1e54/colors/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();
      const { value } = body;

      if (!value || typeof value !== "string" || value.trim() === "") {
        return c.json({ error: "Value is required and must be a non-empty string" }, 400);
      }

      const { data, error } = await supabase
        .from("color")
        .update({
          color_raw: value.trim(),
          updated_by: "user",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id, color, status, created_at, updated_at")
        .single();

      if (error) {
        console.log("Error updating color:", error);
        return c.json({ error: `Failed to update color: ${error.message}` }, 500);
      }

      return c.json({ color: data });
    } catch (error) {
      console.log("Unexpected error updating color:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.delete("/make-server-918f1e54/colors/:id", async (c) => {
    try {
      const id = c.req.param("id");

      const { error } = await supabase
        .from("color")
        .delete()
        .eq("id", id);

      if (error) {
        console.log("Error deleting color:", error);
        return c.json({ error: `Failed to delete color: ${error.message}` }, 500);
      }

      return c.json({ success: true });
    } catch (error) {
      console.log("Unexpected error deleting color:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  // ============= STATUSES ROUTES =============

  app.get("/make-server-918f1e54/statuses", async (c) => {
    try {
      const { data, error } = await supabase
        .from("location")
        .select("id, location, location_short, availability_status, badge_class, status, created_at, updated_at")
        .eq("status", "On")
        .eq("populate", 1)
        .order("location", { ascending: true });

      if (error) {
        console.log("Error fetching statuses:", error);
        return c.json({ error: `Failed to fetch statuses: ${error.message}` }, 500);
      }

      const statuses = data.map(item => ({
        ...item,
        status_name: item.location,
      }));

      return c.json({ statuses });
    } catch (error) {
      console.log("Unexpected error fetching statuses:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  // ============= SIZES ROUTES =============

  app.get("/make-server-918f1e54/sizes", async (c) => {
    try {
      const { data, error } = await supabase
        .from("size")
        .select("id, size, status, order, created_at, updated_at")
        .eq("status", "On")
        .order("order", { ascending: true, nullsFirst: false });

      if (error) {
        console.log("Error fetching sizes:", error);
        return c.json({ error: `Failed to fetch sizes: ${error.message}` }, 500);
      }

      return c.json({ sizes: data });
    } catch (error) {
      console.log("Unexpected error fetching sizes:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.post("/make-server-918f1e54/sizes", async (c) => {
    try {
      const body = await c.req.json();
      const { value } = body;

      if (!value || typeof value !== "string" || value.trim() === "") {
        return c.json({ error: "Value is required and must be a non-empty string" }, 400);
      }

      const { data, error } = await supabase
        .from("size")
        .insert([
          {
            size_raw: value.trim(),
            status: "On",
            created_by: "user",
          },
        ])
        .select("id, size, status, created_at")
        .single();

      if (error) {
        console.log("Error creating size:", error);
        return c.json({ error: `Failed to create size: ${error.message}` }, 500);
      }

      return c.json({ size: data }, 201);
    } catch (error) {
      console.log("Unexpected error creating size:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.put("/make-server-918f1e54/sizes/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();
      const { value } = body;

      if (!value || typeof value !== "string" || value.trim() === "") {
        return c.json({ error: "Value is required and must be a non-empty string" }, 400);
      }

      const { data, error } = await supabase
        .from("size")
        .update({
          size_raw: value.trim(),
          updated_by: "user",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id, size, status, created_at, updated_at")
        .single();

      if (error) {
        console.log("Error updating size:", error);
        return c.json({ error: `Failed to update size: ${error.message}` }, 500);
      }

      return c.json({ size: data });
    } catch (error) {
      console.log("Unexpected error updating size:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.delete("/make-server-918f1e54/sizes/:id", async (c) => {
    try {
      const id = c.req.param("id");

      const { error } = await supabase
        .from("size")
        .delete()
        .eq("id", id);

      if (error) {
        console.log("Error deleting size:", error);
        return c.json({ error: `Failed to delete size: ${error.message}` }, 500);
      }

      return c.json({ success: true });
    } catch (error) {
      console.log("Unexpected error deleting size:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  // ============= BRANDS ROUTES =============

  app.get("/make-server-918f1e54/brands", async (c) => {
    try {
      const { data, error } = await supabase
        .from("brand")
        .select("id, brand, status, created_at, updated_at")
        .eq("status", "On")
        .order("brand", { ascending: true });

      if (error) {
        console.log("Error fetching brands:", error);
        return c.json({ error: `Failed to fetch brands: ${error.message}` }, 500);
      }

      return c.json({ brands: data });
    } catch (error) {
      console.log("Unexpected error fetching brands:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.post("/make-server-918f1e54/brands", async (c) => {
    try {
      const body = await c.req.json();
      const { value } = body;

      if (!value || typeof value !== "string" || value.trim() === "") {
        return c.json({ error: "Value is required and must be a non-empty string" }, 400);
      }

      const { data, error } = await supabase
        .from("brand")
        .insert([
          {
            brand_raw: value.trim(),
            status: "On",
            created_by: "user",
          },
        ])
        .select("id, brand, status, created_at")
        .single();

      if (error) {
        console.log("Error creating brand:", error);
        return c.json({ error: `Failed to create brand: ${error.message}` }, 500);
      }

      return c.json({ brand: data }, 201);
    } catch (error) {
      console.log("Unexpected error creating brand:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.put("/make-server-918f1e54/brands/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();
      const { value } = body;

      if (!value || typeof value !== "string" || value.trim() === "") {
        return c.json({ error: "Value is required and must be a non-empty string" }, 400);
      }

      const { data, error } = await supabase
        .from("brand")
        .update({
          brand_raw: value.trim(),
          updated_by: "user",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id, brand, status, created_at, updated_at")
        .single();

      if (error) {
        console.log("Error updating brand:", error);
        return c.json({ error: `Failed to update brand: ${error.message}` }, 500);
      }

      return c.json({ brand: data });
    } catch (error) {
      console.log("Unexpected error updating brand:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.delete("/make-server-918f1e54/brands/:id", async (c) => {
    try {
      const id = c.req.param("id");

      const { error } = await supabase
        .from("brand")
        .delete()
        .eq("id", id);

      if (error) {
        console.log("Error deleting brand:", error);
        return c.json({ error: `Failed to delete brand: ${error.message}` }, 500);
      }

      return c.json({ success: true });
    } catch (error) {
      console.log("Unexpected error deleting brand:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  // ============= NAMES ROUTES =============

  app.get("/make-server-918f1e54/names", async (c) => {
    try {
      const { data, error } = await supabase
        .from("name")
        .select("id, name, status, created_at, updated_at")
        .eq("status", "On")
        .order("name", { ascending: true });

      if (error) {
        console.log("Error fetching names:", error);
        return c.json({ error: `Failed to fetch names: ${error.message}` }, 500);
      }

      return c.json({ names: data });
    } catch (error) {
      console.log("Unexpected error fetching names:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.post("/make-server-918f1e54/names", async (c) => {
    try {
      const body = await c.req.json();
      const { value } = body;

      if (!value || typeof value !== "string" || value.trim() === "") {
        return c.json({ error: "Value is required and must be a non-empty string" }, 400);
      }

      const { data, error } = await supabase
        .from("name")
        .insert([
          {
            name_raw: value.trim(),
            status: "On",
            created_by: "user",
          },
        ])
        .select("id, name, status, created_at")
        .single();

      if (error) {
        console.log("Error creating name:", error);
        return c.json({ error: `Failed to create name: ${error.message}` }, 500);
      }

      return c.json({ name: data }, 201);
    } catch (error) {
      console.log("Unexpected error creating name:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.put("/make-server-918f1e54/names/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();
      const { value } = body;

      if (!value || typeof value !== "string" || value.trim() === "") {
        return c.json({ error: "Value is required and must be a non-empty string" }, 400);
      }

      const { data, error } = await supabase
        .from("name")
        .update({
          name_raw: value.trim(),
          updated_by: "user",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id, name, status, created_at, updated_at")
        .single();

      if (error) {
        console.log("Error updating name:", error);
        return c.json({ error: `Failed to update name: ${error.message}` }, 500);
      }

      return c.json({ name: data });
    } catch (error) {
      console.log("Unexpected error updating name:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.delete("/make-server-918f1e54/names/:id", async (c) => {
    try {
      const id = c.req.param("id");

      const { error } = await supabase
        .from("name")
        .delete()
        .eq("id", id);

      if (error) {
        console.log("Error deleting name:", error);
        return c.json({ error: `Failed to delete name: ${error.message}` }, 500);
      }

      return c.json({ success: true });
    } catch (error) {
      console.log("Unexpected error deleting name:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.post("/make-server-918f1e54/names/generate-unique", async (c) => {
    try {
      const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiApiKey) {
        console.log("OpenAI API key not found");
        return c.json({ error: "OpenAI API key not configured" }, 500);
      }

      const { data: existingNames, error: fetchError } = await supabase
        .from("name")
        .select("name")
        .eq("status", "On");

      if (fetchError) {
        console.log("Error fetching existing names for AI generation:", fetchError);
        return c.json({ error: `Failed to fetch existing names: ${fetchError.message}` }, 500);
      }

      const namesList = existingNames?.map(n => n.name).join(", ") || "";

      const systemPrompt = `You are a creative naming assistant for a fashion rental inventory system. Generate unique, memorable names that are:
- 12 characters or less
- Based on names of countries, cities, towns, movie characters, celebrities or notable persons from any culture
- Easy to pronounce in both English and Spanish
- Professional yet distinctive
- Not already in use

Always respond with ONLY the name itself - no quotes, explanations, or additional text.`;

      const userPrompt = namesList
        ? `Generate a unique inventory item name that is NOT in this list: ${namesList}`
        : `Generate a unique inventory item name.`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.9,
          max_tokens: 20,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("OpenAI API error:", response.status, errorText);
        return c.json({ error: "Failed to generate name suggestion" }, 500);
      }

      const data = await response.json();
      let suggestedName = data.choices?.[0]?.message?.content?.trim() || "";
      suggestedName = suggestedName.replace(/^["']|["']$/g, "").split("\n")[0].trim();

      if (!suggestedName) {
        return c.json({ error: "No name generated" }, 500);
      }

      return c.json({ suggestedName });
    } catch (error: any) {
      console.log("Unexpected error generating unique name:", error);
      return c.json({ error: `Unexpected error: ${error?.message || String(error)}` }, 500);
    }
  });

  app.post("/make-server-918f1e54/names/check-unique", async (c) => {
    try {
      const body = await c.req.json();
      const { name } = body;

      if (!name || typeof name !== "string" || name.trim() === "") {
        return c.json({ error: "Name is required" }, 400);
      }

      const { data, error } = await supabase
        .from("name")
        .select("id")
        .ilike("name", name.trim())
        .eq("status", "On")
        .limit(1);

      if (error) {
        console.log("Error checking name uniqueness:", error);
        return c.json({ error: `Failed to check name: ${error.message}` }, 500);
      }

      return c.json({ isUnique: !data || data.length === 0 });
    } catch (error: any) {
      console.log("Unexpected error checking name uniqueness:", error);
      return c.json({ error: `Unexpected error: ${error?.message || String(error)}` }, 500);
    }
  });

  app.post("/make-server-918f1e54/names/get-item-data", async (c) => {
    try {
      const body = await c.req.json();
      const { nameId } = body;

      if (!nameId) {
        return c.json({ error: "Name ID is required" }, 400);
      }

      const { data, error } = await supabase
        .from("inventory_items")
        .select(`
          category_id,
          subcategory_id,
          brand_id,
          curr_price,
          description,
          category:category_id (id, category, default_image),
          subcategory:subcategory_id (id, subcategory),
          brand:brand_id (id, brand)
        `)
        .eq("name_id", nameId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.log("Error fetching item data by name:", error);
        return c.json({ error: `Failed to fetch item data: ${error.message}` }, 500);
      }

      if (!data || data.length === 0) {
        return c.json({ error: "No item found with this name" }, 404);
      }

      const itemData = data[0];

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      let imageUrl = "";
      if (itemData.category?.default_image && itemData.category.default_image.trim() !== "") {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${itemData.category.default_image}`;
      }

      const response = {
        itemData: {
          category_id: itemData.category_id,
          subcategory_id: itemData.subcategory_id,
          brand_id: itemData.brand_id,
          price: itemData.curr_price,
          image_url: imageUrl,
          description: itemData.description,
          category: itemData.category,
          subcategory: itemData.subcategory,
          brand: itemData.brand,
        }
      };

      return c.json(response);
    } catch (error: any) {
      console.log("Unexpected error fetching item data:", error);
      return c.json({ error: `Unexpected error: ${error?.message || String(error)}` }, 500);
    }
  });
}
