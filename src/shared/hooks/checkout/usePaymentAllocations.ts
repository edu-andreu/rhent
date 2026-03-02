import { useState, useCallback } from "react";

export interface PaymentAllocation {
  methodId: string;
  amount: number;
}

interface UsePaymentAllocationsOptions {
  balanceDue: number;
  minimumRequired?: number;
}

export function usePaymentAllocations({ balanceDue, minimumRequired = 0 }: UsePaymentAllocationsOptions) {
  const [paymentAllocations, setPaymentAllocations] = useState<PaymentAllocation[]>([]);

  const allocatedTotal = paymentAllocations.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = balanceDue - allocatedTotal;

  const togglePaymentMethod = useCallback((methodId: string) => {
    setPaymentAllocations(prev => {
      const exists = prev.find(p => p.methodId === methodId);
      if (exists) {
        return prev.filter(p => p.methodId !== methodId);
      }
      const currentTotal = prev.reduce((sum, p) => sum + p.amount, 0);
      const remaining = Math.max(0, balanceDue - currentTotal);
      const defaultAmount = minimumRequired > 0 && currentTotal < minimumRequired
        ? Math.max(0, minimumRequired - currentTotal)
        : remaining;
      return [...prev, { methodId, amount: defaultAmount }];
    });
  }, [balanceDue, minimumRequired]);

  const updatePaymentAmount = useCallback((methodId: string, amount: number) => {
    setPaymentAllocations(prev =>
      prev.map(p => p.methodId === methodId ? { ...p, amount: Math.max(0, amount) } : p)
    );
  }, []);

  const isMethodSelected = useCallback(
    (methodId: string) => paymentAllocations.some(p => p.methodId === methodId),
    [paymentAllocations]
  );

  const getMethodAmount = useCallback(
    (methodId: string) => paymentAllocations.find(p => p.methodId === methodId)?.amount || 0,
    [paymentAllocations]
  );

  const resetAllocations = useCallback(() => {
    setPaymentAllocations([]);
  }, []);

  return {
    paymentAllocations,
    setPaymentAllocations,
    allocatedTotal,
    remainingAmount,
    togglePaymentMethod,
    updatePaymentAmount,
    isMethodSelected,
    getMethodAmount,
    resetAllocations,
  };
}
