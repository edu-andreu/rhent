import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { formatCurrency, isTransactionEditable, isCashOutTransaction, DrawerTransaction } from "./useCashDrawer";

/** Primary type shown in the outline badge: only Cash Out, Cash In, or Checkout. */
function getPrimaryTypeLabel(t: DrawerTransaction): "Cash Out" | "Cash In" | "Checkout" {
  if (["cash_out", "out", "cancellation"].includes(t.transactionType)) return "Cash Out";
  if (["cash_in", "in"].includes(t.transactionType)) return "Cash In";
  return "Checkout"; // checkout, return_checkout, reservation_checkout
}

/** Secondary badge label (expense, payroll, move money, cart, return, reservation, etc.). */
function getSecondaryBadgeLabel(t: DrawerTransaction): string | null {
  if (t.cashOutType === "payroll") return "Payroll";
  if (t.cashOutType === "move_money") return "Move Money";
  if (t.cashOutType === "expense") return "Expense";
  if (t.transactionType === "checkout") return "Cart";
  if (t.transactionType === "return_checkout") return "Return";
  if (t.transactionType === "reservation_checkout") return "Reservation";
  if (t.transactionType === "cancellation") return "Cancellation";
  return null;
}

interface TransactionTableProps {
  transactions: DrawerTransaction[];
  onEditTransaction: (t: DrawerTransaction) => void;
  onDeleteTransaction: (t: DrawerTransaction) => void;
}

function getDescriptionDisplay(t: DrawerTransaction) {
  if (t.cashOutType === 'move_money') {
    return t.description?.replace(/^Move money:\s*/i, '') || 'Move money';
  }
  if (t.categoryName) {
    if (t.cashOutType === 'payroll' && t.employeeName) {
      return t.employeeName;
    }
    return t.categoryName;
  }
  return t.description || '-';
}

function getNotesDisplay(t: DrawerTransaction) {
  if (t.cashOutType === 'move_money') {
    return t.notes || '-';
  }
  if (t.cashOutType === 'payroll' && t.hoursWorked != null && t.hourlyRate != null) {
    return `${t.hoursWorked}h × $${formatCurrency(t.hourlyRate)}/hr`;
  }
  if (t.categoryName && t.description) {
    return t.description;
  }
  return t.notes || '-';
}

export function TransactionTable({
  transactions,
  onEditTransaction,
  onDeleteTransaction,
}: TransactionTableProps) {
  if (transactions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.transactionId}>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                  {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="capitalize font-normal">
                      {getPrimaryTypeLabel(t)}
                    </Badge>
                    {getSecondaryBadgeLabel(t) != null && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                        {getSecondaryBadgeLabel(t)}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {getDescriptionDisplay(t)}
                </TableCell>
                <TableCell className="max-w-[250px] truncate text-xs">
                  {getNotesDisplay(t)}
                </TableCell>
                <TableCell className={`text-right font-medium ${isCashOutTransaction(t) ? 'text-red-600' : t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {!isCashOutTransaction(t) && t.amount > 0 ? '+' : ''}${formatCurrency(Math.abs(t.amount))}
                </TableCell>
                <TableCell className="px-2">
                  {isTransactionEditable(t) && (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => onEditTransaction(t)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-sm hover:bg-muted"
                        title="Edit transaction"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(t)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-sm hover:bg-destructive/10"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
