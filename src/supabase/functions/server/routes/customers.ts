import type { Hono } from "npm:hono";
import type { SupabaseClient } from "npm:@supabase/supabase-js";
import { getCurrentUserDisplay } from "../helpers/auth.ts";

export function registerCustomersRoutes(app: Hono, supabase: SupabaseClient) {

  app.get("/make-server-918f1e54/customers", async (c) => {
    try {
      const { data: customers, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.log("Error fetching customers:", error);
        return c.json({ error: `Failed to fetch customers: ${error.message}` }, 500);
      }

      return c.json({ customers: customers || [] });
    } catch (error) {
      console.log("Unexpected error fetching customers:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.get("/make-server-918f1e54/customers/:id", async (c) => {
    try {
      const customerId = c.req.param("id");

      const { data: customer, error } = await supabase
        .from("customers")
        .select("*")
        .eq("customer_id", customerId)
        .single();

      if (error) {
        console.log("Error fetching customer:", error);
        return c.json({ error: `Failed to fetch customer: ${error.message}` }, 500);
      }

      if (!customer) {
        return c.json({ error: "Customer not found" }, 404);
      }

      return c.json({ customer });
    } catch (error) {
      console.log("Unexpected error fetching customer:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.post("/make-server-918f1e54/customers", async (c) => {
    try {
      const { firstName, lastName, phone, email, comments } = await c.req.json();

      if (!firstName || !lastName) {
        return c.json({ error: "First name and last name are required" }, 400);
      }

      const customerId = `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { data: customer, error } = await supabase
        .from("customers")
        .insert({
          customer_id: customerId,
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          email: email || null,
          comments: comments || null,
          status: "active",
          created_by: getCurrentUserDisplay(c),
        })
        .select()
        .single();

      if (error) {
        console.log("Error creating customer:", error);
        return c.json({ error: `Failed to create customer: ${error.message}` }, 500);
      }

      return c.json({ customer });
    } catch (error) {
      console.log("Unexpected error creating customer:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.put("/make-server-918f1e54/customers/:id", async (c) => {
    try {
      const customerId = c.req.param("id");
      const { firstName, lastName, phone, email, comments } = await c.req.json();

      if (!firstName || !lastName) {
        return c.json({ error: "First name and last name are required" }, 400);
      }

      const { data: customer, error } = await supabase
        .from("customers")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          email: email || null,
          comments: comments || null,
          updated_at: new Date().toISOString(),
          updated_by: getCurrentUserDisplay(c),
        })
        .eq("customer_id", customerId)
        .select()
        .single();

      if (error) {
        console.log("Error updating customer:", error);
        return c.json({ error: `Failed to update customer: ${error.message}` }, 500);
      }

      return c.json({ customer });
    } catch (error) {
      console.log("Unexpected error updating customer:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.delete("/make-server-918f1e54/customers/:id", async (c) => {
    try {
      const customerId = c.req.param("id");

      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("customer_id", customerId);

      if (error) {
        console.log("Error deleting customer:", error);
        return c.json({ error: `Failed to delete customer: ${error.message}` }, 500);
      }

      return c.json({ success: true });
    } catch (error) {
      console.log("Unexpected error deleting customer:", error);
      return c.json({ error: `Unexpected error: ${error.message}` }, 500);
    }
  });

  app.get("/make-server-918f1e54/customers/:id/credit-history", async (c) => {
    try {
      const customerId = c.req.param("id");

      const { data: entries, error } = await supabase
        .from("store_credit_ledger")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) {
        console.log("Error fetching credit history:", error);
        return c.json({ error: `Failed to fetch credit history: ${error.message}` }, 500);
      }

      return c.json({ entries: entries || [] });
    } catch (error: any) {
      console.log("Unexpected error fetching credit history:", error);
      return c.json({ error: `Unexpected error: ${error?.message || String(error)}` }, 500);
    }
  });
}
