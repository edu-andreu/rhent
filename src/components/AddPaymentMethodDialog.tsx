import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { CreditCard } from "lucide-react";

interface AddPaymentMethodDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (method: {
    type: 'credit_card' | 'debit_card' | 'paypal';
    cardLast4?: string;
    cardBrand?: string;
    expiryMonth?: string;
    expiryYear?: string;
    isDefault: boolean;
    holderName: string;
  }) => void;
}

export function AddPaymentMethodDialog({ open, onClose, onAdd }: AddPaymentMethodDialogProps) {
  const [type, setType] = useState<'credit_card' | 'debit_card' | 'paypal'>('credit_card');
  const [holderName, setHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (type === 'paypal') {
      onAdd({
        type: 'paypal',
        holderName,
        isDefault,
      });
    } else {
      const last4 = cardNumber.slice(-4);
      const brand = detectCardBrand(cardNumber);
      
      onAdd({
        type,
        cardLast4: last4,
        cardBrand: brand,
        expiryMonth,
        expiryYear,
        holderName,
        isDefault,
      });
    }

    // Reset form
    setHolderName("");
    setCardNumber("");
    setExpiryMonth("");
    setExpiryYear("");
    setCvv("");
    setIsDefault(false);
    onClose();
  };

  const detectCardBrand = (number: string): string => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.startsWith('4')) return 'Visa';
    if (cleaned.startsWith('5')) return 'Mastercard';
    if (cleaned.startsWith('3')) return 'Amex';
    return 'Card';
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ') : cleaned;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '');
    if (/^\d*$/.test(value) && value.length <= 16) {
      setCardNumber(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Add Payment Method
          </DialogTitle>
          <DialogDescription>
            Add a new payment method to your account
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-type">Payment Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger id="payment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="holder-name">Cardholder Name</Label>
              <Input
                id="holder-name"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            {type !== 'paypal' && (
              <>
                <div>
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input
                    id="card-number"
                    value={formatCardNumber(cardNumber)}
                    onChange={handleCardNumberChange}
                    placeholder="1234 5678 9012 3456"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="expiry-month">Month</Label>
                    <Select value={expiryMonth} onValueChange={setExpiryMonth} required>
                      <SelectTrigger id="expiry-month">
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = String(i + 1).padStart(2, '0');
                          return (
                            <SelectItem key={month} value={month}>
                              {month}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="expiry-year">Year</Label>
                    <Select value={expiryYear} onValueChange={setExpiryYear} required>
                      <SelectTrigger id="expiry-year">
                        <SelectValue placeholder="YY" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = String(new Date().getFullYear() + i).slice(-2);
                          return (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      type="password"
                      value={cvv}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value) && value.length <= 4) {
                          setCvv(value);
                        }
                      }}
                      placeholder="123"
                      maxLength={4}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-default"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked as boolean)}
              />
              <Label htmlFor="is-default" className="text-sm">
                Set as default payment method
              </Label>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Payment Method</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
