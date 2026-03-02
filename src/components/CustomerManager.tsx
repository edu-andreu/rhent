import { useState, useMemo, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Customer, Rental, Reservation } from "../types";
import { Search, Plus, Edit, Trash2, Mail, Phone, User, Wallet } from "lucide-react";
import { formatCurrencyARS } from "../shared/format/currency";
import { formatDateObject } from "../shared/format/date";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface CustomerManagerProps {
  customers: Customer[];
  rentals: Rental[];
  reservations: Reservation[];
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
  onAddNew: () => void;
}

export function CustomerManager({ customers, rentals, reservations, onEdit, onDelete, onAddNew }: CustomerManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const formatCurrency = formatCurrencyARS;

  const hasActiveRentalsOrReservations = useCallback((customerId: string) => {
    const hasRentals = rentals.some(r => r.customerId === customerId);
    const hasReservations = reservations.some(r => r.customerId === customerId);
    return hasRentals || hasReservations;
  }, [rentals, reservations]);

  // Memoize filtered and sorted customers
  const filteredCustomers = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return customers
      .filter((customer) => {
        return (
          customer.name.toLowerCase().includes(searchLower) ||
          customer.surname.toLowerCase().includes(searchLower) ||
          customer.email.toLowerCase().includes(searchLower) ||
          customer.cellPhone.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => a.surname.localeCompare(b.surname));
  }, [customers, searchTerm]);

  return (
    <div id="customers-tab" data-testid="customers-tab" className="flex flex-col h-full">
      {/* Header - Fixed/Static */}
      <div className="flex-shrink-0 space-y-6 mb-6">
        <div className="flex items-center justify-between">
          <div></div>
          <Button id="add-customer-button" data-testid="add-customer-button" onClick={onAddNew} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Add Customer
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            id="customers-search"
            data-testid="customers-search-input"
            placeholder="Search customers by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content - Scrollable */}
      <div id="customers-content" data-testid="customers-content" className="flex-1 overflow-y-auto">
      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? "No customers found" : "No customers yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Get started by adding your first customer"}
            </p>
            {!searchTerm && (
              <Button onClick={onAddNew}>
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredCustomers.length} of {customers.length} customers
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} className="hover:shadow-md transition-shadow flex flex-col">
                <CardHeader className="pb-3 flex-none">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {customer.name} {customer.surname}
                      </CardTitle>
                      <div className="mt-1.5">
                        <Badge variant="outline" className="text-xs">
                          Customer since {formatDateObject(customer.createdAt)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        data-testid={`customer-edit-button-${customer.id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(customer)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        data-testid={`customer-delete-button-${customer.id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomerToDelete(customer)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-1 flex flex-col">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <a 
                        href={`mailto:${customer.email}`}
                        className="truncate hover:underline"
                        title={customer.email}
                      >
                        {customer.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <a 
                        href={`tel:${customer.cellPhone}`}
                        className="hover:underline"
                      >
                        {customer.cellPhone}
                      </a>
                    </div>
                    {customer.creditBalance !== undefined && customer.creditBalance !== 0 && (
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs font-medium ${
                          customer.creditBalance > 0
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                            : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700'
                        }`}>
                          <Wallet className="w-3 h-3 mr-1" />
                          {customer.creditBalance > 0 ? '+' : ''}{formatCurrency(customer.creditBalance)}
                        </Badge>
                      </div>
                    )}
                  </div>
                  {customer.comments && (
                    <div className="border-t pt-3 mt-auto">
                      <p className="text-xs text-muted-foreground font-medium mb-1">
                        Notes:
                      </p>
                      <p className="text-sm line-clamp-2" title={customer.comments}>
                        {customer.comments}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      </div>

      <AlertDialog
        open={!!customerToDelete}
        onOpenChange={() => setCustomerToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {customerToDelete && hasActiveRentalsOrReservations(customerToDelete.id)
                ? 'Cannot Delete Customer'
                : 'Delete Customer'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {customerToDelete && hasActiveRentalsOrReservations(customerToDelete.id) ? (
                <>
                  Cannot delete{" "}
                  <strong>
                    {customerToDelete.name} {customerToDelete.surname}
                  </strong>
                  {" "}because they have active rentals or reservations. Please complete or cancel all active items before deleting this customer.
                </>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <strong>
                    {customerToDelete?.name} {customerToDelete?.surname}
                  </strong>
                  ? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {customerToDelete && hasActiveRentalsOrReservations(customerToDelete.id) ? (
              <AlertDialogCancel>Close</AlertDialogCancel>
            ) : (
              <>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (customerToDelete) {
                      onDelete(customerToDelete.id);
                      setCustomerToDelete(null);
                    }
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
