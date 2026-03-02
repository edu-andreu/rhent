import React from "react";
import { DollarSign, Lock, Unlock, Plus, Minus, Wallet, TrendingUp, TrendingDown, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { formatCurrency, DrawerData, DrawerSummary } from "./useCashDrawer";

interface DrawerSummaryCardsProps {
  currentDrawer: DrawerData | null;
  drawerSummary: DrawerSummary | null;
  onOpenDialog: () => void;
  onCloseDialog: (expectedBalance: string) => void;
  onCashIn: () => void;
  onCashOut: () => void;
  onEditOpeningCash: (currentAmount: number) => void;
}

export function DrawerSummaryCards({
  currentDrawer,
  drawerSummary,
  onOpenDialog,
  onCloseDialog,
  onCashIn,
  onCashOut,
  onEditOpeningCash,
}: DrawerSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Opening Cash</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center gap-1.5 text-2xl mb-2">
            ${formatCurrency(drawerSummary?.openingCash || 0)}
            {currentDrawer && (
              <button
                onClick={() => onEditOpeningCash(drawerSummary?.openingCash || 0)}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-sm hover:bg-muted"
                title="Edit opening cash"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button
            variant={currentDrawer ? "outline" : "default"}
            size="sm"
            className="w-full h-8"
            onClick={onOpenDialog}
            disabled={!!currentDrawer}
          >
            <Unlock className="w-3.5 h-3.5 mr-1.5" />
            Open
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Cash In</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-2xl mb-2">${formatCurrency(drawerSummary?.totalCashIn || 0)}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8"
            onClick={onCashIn}
            disabled={!currentDrawer}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Cash Out</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-2xl mb-2">${formatCurrency(Math.abs(drawerSummary?.totalCashOut || 0))}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8"
            onClick={onCashOut}
            disabled={!currentDrawer}
          >
            <Minus className="w-3.5 h-3.5 mr-1.5" />
            Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Expected Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-2xl mb-2">${formatCurrency(drawerSummary?.expectedBalance || 0)}</div>
          <Button
            variant={currentDrawer ? "default" : "outline"}
            size="sm"
            className="w-full h-8"
            onClick={() => onCloseDialog(drawerSummary?.expectedBalance.toString() || '')}
            disabled={!currentDrawer}
          >
            <Lock className="w-3.5 h-3.5 mr-1.5" />
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
