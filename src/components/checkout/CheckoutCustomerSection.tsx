import React from "react";
import { User, UserPlus, Search, Phone, Wallet, X } from "lucide-react";
import { Customer } from "../../types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { formatCurrencyARS } from "../../shared/format/currency";

interface CheckoutCustomerSectionProps {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  customerSearchOpen: boolean;
  setCustomerSearchOpen: (open: boolean) => void;
  customerSearchQuery: string;
  setCustomerSearchQuery: (query: string) => void;
  customers: Customer[];
  customerCreditBalance: number;
  onAddNewCustomer: () => void;
  onClose: () => void;
  creditApplied?: number;
  showCreditSection?: boolean;
  tempCreditAmount?: string;
  totalAfterDiscount?: number;
  onShowCreditSection?: () => void;
  onHideCreditSection?: () => void;
  onTempCreditAmountChange?: (value: string) => void;
  onApplyCredit?: () => void;
  onCancelCredit?: () => void;
  onRemoveCredit?: () => void;
  onEditCredit?: () => void;
}

export function CheckoutCustomerSection({
  selectedCustomer,
  setSelectedCustomer,
  customerSearchOpen,
  setCustomerSearchOpen,
  customerSearchQuery,
  setCustomerSearchQuery,
  customers,
  customerCreditBalance,
  onAddNewCustomer,
  onClose,
  creditApplied = 0,
  showCreditSection = false,
  tempCreditAmount = "",
  totalAfterDiscount = 0,
  onShowCreditSection,
  onHideCreditSection,
  onTempCreditAmountChange,
  onApplyCredit,
  onCancelCredit,
  onRemoveCredit,
  onEditCredit,
}: CheckoutCustomerSectionProps) {
  const formatCurrency = formatCurrencyARS;
  const hasCreditUI = typeof onApplyCredit === "function" && totalAfterDiscount !== undefined;

  return (
    <>
      <div>
        <Label className="mb-2 block font-semibold">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            Customer
            <span className="text-destructive ml-0.5">*</span>
          </span>
        </Label>

        {!selectedCustomer ? (
          <div className="flex gap-2">
            <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
              <PopoverTrigger asChild>
                <Button id="customer-search-button" data-testid="customer-search-button" variant="outline" role="combobox" className="flex-1 justify-start h-10">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Search customer...
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[450px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Search by name, phone, or email..." value={customerSearchQuery} onValueChange={setCustomerSearchQuery} />
                  <ScrollArea className="max-h-[300px]">
                    <CommandList>
                      <CommandEmpty>No customers found.</CommandEmpty>
                      <CommandGroup>
                        {customers
                          .filter(c => c.status !== 'inactive')
                          .filter(customer => {
                            if (!customerSearchQuery) return false;
                            const query = customerSearchQuery.toLowerCase();
                            return customer.name?.toLowerCase().includes(query) || customer.surname?.toLowerCase().includes(query) || customer.cellPhone?.toLowerCase().includes(query) || customer.email?.toLowerCase().includes(query);
                          })
                          .map((customer) => (
                            <CommandItem key={customer.id} value={customer.id} onSelect={() => { setSelectedCustomer(customer); setCustomerSearchOpen(false); setCustomerSearchQuery(''); }}>
                              <div className="flex items-center gap-2 flex-1">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <div className="flex-1">
                                  <div className="font-medium">{customer.name} {customer.surname}</div>
                                  {customer.cellPhone && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {customer.cellPhone}
                                    </div>
                                  )}
                                </div>
                                {customer.creditBalance !== undefined && customer.creditBalance !== 0 && (
                                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${customer.creditBalance > 0 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'}`}>
                                    {customer.creditBalance > 0 ? '+' : ''}{formatCurrency(customer.creditBalance)}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </ScrollArea>
                </Command>
              </PopoverContent>
            </Popover>

            <Button id="add-customer-button" data-testid="add-customer-button" variant="outline" onClick={() => { onAddNewCustomer(); onClose(); }} className="h-10 px-3">
              <UserPlus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border bg-primary/5 border-primary/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{selectedCustomer.name} {selectedCustomer.surname}</div>
                  {selectedCustomer.cellPhone && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {selectedCustomer.cellPhone}
                    </div>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)} className="h-8 text-xs flex-shrink-0">
                Change
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Credit Balance Info Banner + Apply store credit */}
      {selectedCustomer && customerCreditBalance !== 0 && (
        <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${customerCreditBalance > 0 ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" : "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800"}`}>
          <Wallet className={`w-4 h-4 mt-0.5 flex-shrink-0 ${customerCreditBalance > 0 ? "text-blue-600 dark:text-blue-400" : "text-purple-600 dark:text-purple-400"}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${customerCreditBalance > 0 ? "text-blue-700 dark:text-blue-300" : "text-purple-700 dark:text-purple-300"}`}>
              {customerCreditBalance > 0 ? `Store credit: ${formatCurrency(customerCreditBalance)}` : `Store debit: ${formatCurrency(Math.abs(customerCreditBalance))}`}
            </p>
            <p className={`text-xs mt-0.5 ${customerCreditBalance > 0 ? "text-blue-600 dark:text-blue-400" : "text-purple-600 dark:text-purple-400"}`}>
              {hasCreditUI
                ? (customerCreditBalance > 0 ? "You can apply this credit to reduce the amount due below." : "You can settle this debit with the payment below.")
                : (customerCreditBalance > 0 ? "This credit can be applied when the item is returned." : "This debit can be settled when the item is returned.")}
            </p>
            {hasCreditUI && (
              <>
                {!showCreditSection && creditApplied === 0 && (
                  <button
                    type="button"
                    onClick={onShowCreditSection}
                    className="mt-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Apply store credit
                  </button>
                )}
                {showCreditSection && creditApplied === 0 && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={tempCreditAmount}
                        onChange={(e) => onTempCreditAmountChange?.(e.target.value)}
                        placeholder="0"
                        className="h-9 w-28"
                        min={0}
                        max={customerCreditBalance > 0 ? Math.min(customerCreditBalance, totalAfterDiscount) : undefined}
                      />
                      <Button type="button" size="sm" onClick={onApplyCredit} disabled={!tempCreditAmount || parseFloat(tempCreditAmount) <= 0}>
                        Apply
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={onCancelCredit}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {creditApplied !== 0 && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      {creditApplied > 0 ? "Store credit applied: -" : "Store debit applied: +"}
                      {formatCurrency(Math.abs(creditApplied))}
                    </span>
                    {onEditCredit && (
                      <button type="button" onClick={onEditCredit} className="text-primary hover:underline text-xs">
                        Edit
                      </button>
                    )}
                    {onRemoveCredit && (
                      <button type="button" onClick={onRemoveCredit} className="text-muted-foreground hover:underline text-xs">
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
