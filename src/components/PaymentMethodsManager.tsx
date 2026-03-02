import { useState } from "react";
import { CreditCard, Plus, Trash2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { PaymentMethod } from "../types";
import { AddPaymentMethodDialog } from "./AddPaymentMethodDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";

interface PaymentMethodsManagerProps {
  paymentMethods: PaymentMethod[];
  onAdd: (method: Omit<PaymentMethod, 'id'>) => void;
  onDelete: (methodId: string) => void;
  onSetDefault: (methodId: string) => void;
}

export function PaymentMethodsManager({
  paymentMethods,
  onAdd,
  onDelete,
  onSetDefault,
}: PaymentMethodsManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteMethod, setDeleteMethod] = useState<PaymentMethod | null>(null);

  const getCardIcon = (brand?: string) => {
    return <CreditCard className="w-5 h-5" />;
  };

  const getPaymentMethodDisplay = (method: PaymentMethod) => {
    if (method.type === 'paypal') {
      return {
        title: 'PayPal',
        subtitle: method.holderName,
      };
    }
    return {
      title: `${method.cardBrand} •••• ${method.cardLast4}`,
      subtitle: `Expires ${method.expiryMonth}/${method.expiryYear}`,
    };
  };

  const handleDeleteConfirm = () => {
    if (deleteMethod) {
      onDelete(deleteMethod.id);
      setDeleteMethod(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2>Payment Methods</h2>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="mb-2">No Payment Methods</h3>
            <p className="text-muted-foreground mb-4">
              Add a payment method to complete rentals and reservations
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Payment Method
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {paymentMethods.map((method) => {
            const display = getPaymentMethodDisplay(method);
            return (
              <Card key={method.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getCardIcon(method.cardBrand)}
                      </div>
                      <div>
                        <p className="text-base">{display.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {display.subtitle}
                        </p>
                      </div>
                    </div>
                    {method.isDefault && (
                      <Badge variant="default">Default</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {!method.isDefault && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => onSetDefault(method.id)}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      className={method.isDefault ? 'flex-1' : ''}
                      onClick={() => setDeleteMethod(method)}
                      disabled={method.isDefault && paymentMethods.length === 1}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddPaymentMethodDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={onAdd}
      />

      <AlertDialog open={!!deleteMethod} onOpenChange={() => setDeleteMethod(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Method?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment method? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
