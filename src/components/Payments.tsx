import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { PaymentStats } from "./PaymentStats";
import { TransactionHistory } from "./TransactionHistory";
import { PaymentMethodsManager } from "./PaymentMethodsManager";
import { Transaction, PaymentMethod } from "../types";

interface PaymentsProps {
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  onAddPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => void;
  onDeletePaymentMethod: (methodId: string) => void;
  onSetDefaultPaymentMethod: (methodId: string) => void;
}

export function Payments({
  transactions,
  paymentMethods,
  onAddPaymentMethod,
  onDeletePaymentMethod,
  onSetDefaultPaymentMethod,
}: PaymentsProps) {
  return (
    <div className="space-y-6">
      <PaymentStats transactions={transactions} />

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-6">
          <TransactionHistory transactions={transactions} />
        </TabsContent>

        <TabsContent value="methods" className="mt-6">
          <PaymentMethodsManager
            paymentMethods={paymentMethods}
            onAdd={onAddPaymentMethod}
            onDelete={onDeletePaymentMethod}
            onSetDefault={onSetDefaultPaymentMethod}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
