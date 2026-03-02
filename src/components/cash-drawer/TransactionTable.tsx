import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { formatCurrency, isTransactionEditable, DrawerTransaction } from "./useCashDrawer";

interface TransactionTableProps {
  transactions: DrawerTransaction[];
  onEditTransaction: (t: DrawerTransaction) => void;
  onDeleteTransaction: (t: DrawerTransaction) => void;
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
                  <Badge variant="outline" className="capitalize font-normal">
                    {t.transactionType.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {t.description || '-'}
                </TableCell>
                <TableCell className="max-w-[250px] truncate text-xs">
                  {t.notes || '-'}
                </TableCell>
                <TableCell className={`text-right font-medium ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {t.amount > 0 ? '+' : ''}${formatCurrency(Math.abs(t.amount))}
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
