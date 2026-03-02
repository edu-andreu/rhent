import { useState, useEffect } from "react";
import { Customer } from "../../types";
import { ApiCustomer, ApiCustomerResponse } from "../../types/api";
import { getFunction, postFunction, putFunction, deleteFunction } from "../../shared/api/client";
import { toast } from "sonner@2.0.3";
import { handleApiError } from "../../shared/utils/errorHandler";

/**
 * Maps an API customer response to the Customer type used in the application.
 * 
 * @param c - API customer object from the server
 * @returns Customer object with mapped properties
 */
function mapCustomer(c: ApiCustomer): Customer {
  return {
    id: c.customer_id,
    name: c.first_name,
    surname: c.last_name,
    cellPhone: c.phone || "",
    email: c.email || "",
    comments: c.comments || "",
    createdAt: new Date(c.created_at),
    status: c.status,
    creditBalance: typeof c.credit_balance === "string" ? parseFloat(c.credit_balance) : (c.credit_balance || 0),
  };
}

/**
 * Hook for managing customer data and operations.
 * Handles loading, adding, updating, and deleting customers.
 * 
 * @param enabled - Whether to automatically load customers on mount (default: true)
 * @returns Object containing:
 * - customers: Array of all customers
 * - setCustomers: Function to update the customers array
 * - loadingCustomers: Boolean indicating if customers are being loaded
 * - loadCustomers: Function to reload customers from the server
 * - addCustomer: Function to add a new customer
 * - updateCustomer: Function to update an existing customer
 * - deleteCustomer: Function to delete a customer
 */
export function useCustomers(enabled: boolean = true) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const data = await getFunction<ApiCustomerResponse>("customers");
      setCustomers((data.customers || []).map(mapCustomer));
    } catch (error) {
      handleApiError(error, "customers");
    } finally {
      setLoadingCustomers(false);
    }
  };

  const addCustomer = async (customer: Omit<Customer, "id" | "createdAt">): Promise<boolean> => {
    try {
      await postFunction("customers", {
        firstName: customer.name,
        lastName: customer.surname,
        phone: customer.cellPhone,
        email: customer.email,
        comments: customer.comments,
      });
      await loadCustomers();
      toast.success("Customer added successfully!");
      return true;
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error("Failed to save customer");
      return false;
    }
  };

  const updateCustomer = async (customerId: string, customer: Omit<Customer, "id" | "createdAt">): Promise<boolean> => {
    try {
      await putFunction(`customers/${customerId}`, {
        firstName: customer.name,
        lastName: customer.surname,
        phone: customer.cellPhone,
        email: customer.email,
        comments: customer.comments,
      });
      await loadCustomers();
      toast.success("Customer updated successfully!");
      return true;
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error("Failed to save customer");
      return false;
    }
  };

  useEffect(() => {
    if (enabled) {
      loadCustomers();
    }
  }, [enabled]);

  const deleteCustomer = async (customerId: string): Promise<boolean> => {
    try {
      await deleteFunction(`customers/${customerId}`);
      await loadCustomers();
      toast.success("Customer deleted successfully!");
      return true;
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
      return false;
    }
  };

  return {
    customers,
    setCustomers,
    loadingCustomers,
    loadCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
