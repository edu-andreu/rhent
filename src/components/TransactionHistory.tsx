import { useState, useMemo, useCallback } from "react";
import { Receipt, Search, Filter, Download, ChevronRight } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Transaction } from "../types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter(t => {
      const matchesSearch = t.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || t.status === filterStatus;
      const matchesType = filterType === "all" || t.type === filterType;
      return matchesSearch && matchesStatus && matchesType;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return b.date.getTime() - a.date.getTime();
        case "date-asc":
          return a.date.getTime() - b.date.getTime();
        case "amount-desc":
          return b.amount - a.amount;
        case "amount-asc":
          return a.amount - b.amount;
        default:
          return 0;
      }
    });
  }, [transactions, searchQuery, filterStatus, filterType, sortBy]);

  const getStatusBadge = useCallback((status: Transaction['status']) => {
    const variants: Record<Transaction['status'], any> = {
      completed: 'default',
      pending: 'secondary',
      failed: 'destructive',
      refunded: 'outline',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  }, []);

  const getTypeBadge = useCallback((type: Transaction['type']) => {
    const colors: Record<Transaction['type'], string> = {
      rental: 'bg-blue-500/10 text-blue-500',
      reservation: 'bg-purple-500/10 text-purple-500',
      refund: 'bg-green-500/10 text-green-500',
      late_fee: 'bg-red-500/10 text-red-500',
    };
    return (
      <Badge variant="outline" className={colors[type]}>
        {type.replace('_', ' ')}
      </Badge>
    );
  }, []);

  const downloadReceipt = (transaction: Transaction) => {
    // Mock receipt download
    const receiptData = `
DRESS RENTAL RECEIPT
=====================
Transaction ID: ${transaction.id}
Date: ${transaction.date.toLocaleString()}
Type: ${transaction.type}
Item: ${transaction.itemName}
Amount: $${transaction.amount.toFixed(2)}
Payment Method: ${transaction.paymentMethod}
Status: ${transaction.status}

Description:
${transaction.description}

Thank you for your business!
    `.trim();

    const blob = new Blob([receiptData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${transaction.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="mb-2">No Transactions Yet</h3>
        <p className="text-muted-foreground">Your payment history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="rental">Rentals</SelectItem>
              <SelectItem value="reservation">Reservations</SelectItem>
              <SelectItem value="refund">Refunds</SelectItem>
              <SelectItem value="late_fee">Late Fees</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Date (Newest)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest)</SelectItem>
              <SelectItem value="amount-desc">Amount (High)</SelectItem>
              <SelectItem value="amount-asc">Amount (Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No transactions match your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((transaction) => (
            <Card 
              key={transaction.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedTransaction(transaction)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base">{transaction.itemName}</h3>
                      {getTypeBadge(transaction.type)}
                      {getStatusBadge(transaction.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {transaction.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{transaction.date.toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{transaction.paymentMethod}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl">
                        {transaction.type === 'refund' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Transaction Details
            </DialogTitle>
            <DialogDescription>
              Transaction ID: {selectedTransaction?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Item</p>
                  <p>{selectedTransaction.itemName}</p>
                </div>
                <div className="flex gap-2">
                  {getTypeBadge(selectedTransaction.type)}
                  {getStatusBadge(selectedTransaction.status)}
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p>{selectedTransaction.description}</p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p>{selectedTransaction.date.toLocaleDateString()}</p>
                  <p className="text-sm">{selectedTransaction.date.toLocaleTimeString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p>{selectedTransaction.paymentMethod}</p>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <p>Total Amount</p>
                <p className="text-2xl">
                  {selectedTransaction.type === 'refund' ? '+' : '-'}${selectedTransaction.amount.toFixed(2)}
                </p>
              </div>

              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => downloadReceipt(selectedTransaction)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
