import React from "react";
import { DollarSign, ArrowRight, LogIn, LogOut, Receipt, Users } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { formatCurrency, DrawerSummary, DrawerTransaction, TransactionCategory } from "./useCashDrawer";
import { CategoryCombobox } from "./CategoryCombobox";
import { TimePicker } from "./TimePicker";

interface CashDrawerDialogsProps {
  loading: boolean;
  drawerSummary: DrawerSummary | null;

  // Open drawer dialog
  showOpenDialog: boolean;
  setShowOpenDialog: (open: boolean) => void;
  openingCash: string;
  setOpeningCash: (val: string) => void;
  handleOpenDrawer: () => void;

  // Close drawer dialog
  showCloseDialog: boolean;
  setShowCloseDialog: (open: boolean) => void;
  countedCash: string;
  setCountedCash: (val: string) => void;
  closeNotes: string;
  setCloseNotes: (val: string) => void;
  handleCloseDrawer: () => void;

  // Cash transaction dialog
  showCashTransactionDialog: boolean;
  setShowCashTransactionDialog: (open: boolean) => void;
  transactionType: 'in' | 'out';
  transactionAmount: string;
  setTransactionAmount: (val: string) => void;
  transactionNotes: string;
  setTransactionNotes: (val: string) => void;
  handleAddCashTransaction: () => void;

  // Categories & payroll
  categories: TransactionCategory[];
  selectedCategoryId: string;
  setSelectedCategoryId: (id: string) => void;
  cashOutType: 'expense' | 'payroll';
  setCashOutType: (type: 'expense' | 'payroll') => void;
  employeeName: string;
  setEmployeeName: (name: string) => void;
  shiftStart: string;
  setShiftStart: (time: string) => void;
  shiftEnd: string;
  setShiftEnd: (time: string) => void;
  hourlyRate: number;
  createCategory: (name: string, direction: 'in' | 'out') => Promise<TransactionCategory | null>;
  resetTransactionDialog: () => void;

  // Edit opening cash dialog
  showEditOpeningCashDialog: boolean;
  setShowEditOpeningCashDialog: (open: boolean) => void;
  editOpeningCashAmount: string;
  setEditOpeningCashAmount: (val: string) => void;
  showEditOpeningCashConfirm: boolean;
  setShowEditOpeningCashConfirm: (show: boolean) => void;
  handleEditOpeningCash: () => void;
  showAlert: (title: string, description: string) => void;

  // Edit transaction dialog
  showEditTransactionDialog: boolean;
  setShowEditTransactionDialog: (open: boolean) => void;
  editingTransaction: DrawerTransaction | null;
  editTransactionAmount: string;
  setEditTransactionAmount: (val: string) => void;
  editTransactionNotes: string;
  setEditTransactionNotes: (val: string) => void;
  showEditTransactionConfirm: boolean;
  setShowEditTransactionConfirm: (show: boolean) => void;
  handleEditTransaction: () => void;

  // Delete transaction dialog
  showDeleteConfirmDialog: boolean;
  setShowDeleteConfirmDialog: (open: boolean) => void;
  deletingTransaction: DrawerTransaction | null;
  handleDeleteTransaction: () => void;

  // Alert dialog
  alertDialogOpen: boolean;
  setAlertDialogOpen: (open: boolean) => void;
  alertDialogContent: { title: string; description: string };
}

export function CashDrawerDialogs({
  loading,
  drawerSummary,
  showOpenDialog,
  setShowOpenDialog,
  openingCash,
  setOpeningCash,
  handleOpenDrawer,
  showCloseDialog,
  setShowCloseDialog,
  countedCash,
  setCountedCash,
  closeNotes,
  setCloseNotes,
  handleCloseDrawer,
  showCashTransactionDialog,
  setShowCashTransactionDialog,
  transactionType,
  transactionAmount,
  setTransactionAmount,
  transactionNotes,
  setTransactionNotes,
  handleAddCashTransaction,
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  cashOutType,
  setCashOutType,
  employeeName,
  setEmployeeName,
  shiftStart,
  setShiftStart,
  shiftEnd,
  setShiftEnd,
  hourlyRate,
  createCategory,
  resetTransactionDialog,
  showEditOpeningCashDialog,
  setShowEditOpeningCashDialog,
  editOpeningCashAmount,
  setEditOpeningCashAmount,
  showEditOpeningCashConfirm,
  setShowEditOpeningCashConfirm,
  handleEditOpeningCash,
  showAlert,
  showEditTransactionDialog,
  setShowEditTransactionDialog,
  editingTransaction,
  editTransactionAmount,
  setEditTransactionAmount,
  editTransactionNotes,
  setEditTransactionNotes,
  showEditTransactionConfirm,
  setShowEditTransactionConfirm,
  handleEditTransaction,
  showDeleteConfirmDialog,
  setShowDeleteConfirmDialog,
  deletingTransaction,
  handleDeleteTransaction,
  alertDialogOpen,
  setAlertDialogOpen,
  alertDialogContent,
}: CashDrawerDialogsProps) {
  return (
    <>
      {/* Open Drawer Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Cash Drawer</DialogTitle>
            <DialogDescription>
              Start a new cash drawer session for today
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openingCash">Opening Cash Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="openingCash"
                  type="number"
                  step="1000"
                  className="pl-8"
                  placeholder="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleOpenDrawer} disabled={loading}>
              {loading ? 'Opening...' : 'Open Drawer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Drawer Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Cash Drawer</DialogTitle>
            <DialogDescription>
              Count the cash and close the drawer session
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {drawerSummary && (
              <div className="bg-muted/50 rounded-lg p-4 border">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">Expected Balance</p>
                    <p className="text-xs text-muted-foreground">Based on transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      ${formatCurrency(drawerSummary.expectedBalance)}
                    </p>
                    {countedCash && (
                      <p className={`text-sm font-medium mt-1 ${
                        (parseFloat(countedCash) - drawerSummary.expectedBalance) === 0
                          ? 'text-green-600 dark:text-green-500'
                          : 'text-amber-600 dark:text-amber-500'
                      }`}>
                        {(parseFloat(countedCash) - drawerSummary.expectedBalance) > 0 ? '+' : ''}
                        ${formatCurrency(Math.abs(parseFloat(countedCash) - drawerSummary.expectedBalance))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="countedCash">Counted Cash Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="countedCash"
                  type="number"
                  step="1000"
                  className="pl-8"
                  placeholder="0"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="closeNotes">Notes (Optional)</Label>
              <Textarea
                id="closeNotes"
                placeholder="Any discrepancies or comments..."
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleCloseDrawer} disabled={loading}>
              {loading ? 'Closing...' : 'Close Drawer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash Transaction Dialog */}
      <Dialog open={showCashTransactionDialog} onOpenChange={(open) => {
        if (!open) resetTransactionDialog();
        else setShowCashTransactionDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transactionType === 'in' ? 'Add Cash In' : 'Add Cash Out'}
            </DialogTitle>
            <DialogDescription>
              Record a manual cash {transactionType === 'in' ? 'deposit' : 'withdrawal'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cash Out: Type toggle (Expense / Payroll) */}
            {transactionType === 'out' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Type *</Label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setCashOutType('expense')}
                    className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                      cashOutType === 'expense'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Expense</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashOutType('payroll')}
                    className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                      cashOutType === 'payroll'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Payroll</span>
                  </button>
                </div>
              </div>
            )}

            {/* Payroll fields */}
            {transactionType === 'out' && cashOutType === 'payroll' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="employeeName">Employee Name *</Label>
                  <Input
                    id="employeeName"
                    placeholder="Enter employee name..."
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="shiftStart">Shift Start *</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-muted/50 text-muted-foreground">
                        <LogIn className="h-4 w-4" aria-hidden />
                      </div>
                      <TimePicker
                        id="shiftStart"
                        value={shiftStart}
                        onChange={setShiftStart}
                        aria-label="Shift start"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shiftEnd">Shift End *</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-muted/50 text-muted-foreground">
                        <LogOut className="h-4 w-4" aria-hidden />
                      </div>
                      <TimePicker
                        id="shiftEnd"
                        value={shiftEnd}
                        onChange={setShiftEnd}
                        aria-label="Shift end"
                      />
                    </div>
                  </div>
                </div>

                {shiftStart && shiftEnd && shiftEnd > shiftStart && (() => {
                  const [sh, sm] = shiftStart.split(':').map(Number);
                  const [eh, em] = shiftEnd.split(':').map(Number);
                  const hours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;
                  const total = hours * hourlyRate;
                  return (
                    <div className="bg-muted/50 rounded-lg p-3 border space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Hours</span>
                        <span className="font-medium">{hours}h</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rate</span>
                        <span className="font-medium">${formatCurrency(hourlyRate)}/hr</span>
                      </div>
                      <div className="flex justify-between text-sm pt-1 border-t">
                        <span className="font-medium">Total</span>
                        <span className="font-bold text-red-600">${formatCurrency(total)}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  <Label htmlFor="transactionNotes">Description (optional)</Label>
                  <Textarea
                    id="transactionNotes"
                    placeholder="Additional notes..."
                    value={transactionNotes}
                    onChange={(e) => setTransactionNotes(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Category combobox (Expense / Cash-in) */}
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <CategoryCombobox
                    categories={categories}
                    selectedId={selectedCategoryId}
                    onSelect={setSelectedCategoryId}
                    onAddNew={(name) => createCategory(name, transactionType === 'in' ? 'in' : 'out')}
                    direction={transactionType === 'in' ? 'in' : 'out'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionAmount">Amount *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="transactionAmount"
                      type="number"
                      step="1000"
                      className="pl-8"
                      placeholder="0"
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionNotes">
                    Description {categories.find(c => c.id === selectedCategoryId)?.name.toLowerCase() === 'otro' ? '*' : '(optional)'}
                  </Label>
                  <Textarea
                    id="transactionNotes"
                    placeholder="Details about this transaction..."
                    value={transactionNotes}
                    onChange={(e) => setTransactionNotes(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetTransactionDialog}>
              Cancel
            </Button>
            <Button onClick={handleAddCashTransaction} disabled={loading}>
              {loading ? 'Processing...' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Opening Cash Dialog */}
      <Dialog open={showEditOpeningCashDialog} onOpenChange={(open) => {
        setShowEditOpeningCashDialog(open);
        if (!open) setShowEditOpeningCashConfirm(false);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Opening Cash</DialogTitle>
            <DialogDescription>
              Update the opening cash amount for the current session
            </DialogDescription>
          </DialogHeader>

          {!showEditOpeningCashConfirm ? (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editOpeningCashAmount">New Opening Cash Amount *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="editOpeningCashAmount"
                      type="number"
                      step="1000"
                      className="pl-8"
                      placeholder="0"
                      value={editOpeningCashAmount}
                      onChange={(e) => setEditOpeningCashAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditOpeningCashDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!editOpeningCashAmount) {
                      showAlert("Missing Information", "Please enter the new opening cash amount");
                      return;
                    }
                    setShowEditOpeningCashConfirm(true);
                  }}
                >
                  Continue
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Are you sure you want to change the opening cash?</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">From:</span>
                  <span className="font-medium">${formatCurrency(drawerSummary?.openingCash || 0)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">${formatCurrency(parseFloat(editOpeningCashAmount) || 0)}</span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditOpeningCashConfirm(false)}>
                  Back
                </Button>
                <Button onClick={handleEditOpeningCash} disabled={loading}>
                  {loading ? 'Updating...' : 'Confirm Update'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={showEditTransactionDialog} onOpenChange={(open) => {
        setShowEditTransactionDialog(open);
        if (!open) setShowEditTransactionConfirm(false);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update the {editingTransaction?.transactionType.replace(/_/g, ' ')} transaction
            </DialogDescription>
          </DialogHeader>

          {!showEditTransactionConfirm ? (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editTransactionAmount">Amount *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="editTransactionAmount"
                      type="number"
                      step="1000"
                      className="pl-8"
                      placeholder="0"
                      value={editTransactionAmount}
                      onChange={(e) => setEditTransactionAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editTransactionNotes">Description *</Label>
                  <Textarea
                    id="editTransactionNotes"
                    placeholder="Details about this transaction..."
                    value={editTransactionNotes}
                    onChange={(e) => setEditTransactionNotes(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditTransactionDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!editTransactionAmount || !editTransactionNotes) {
                      showAlert("Missing Information", "Please fill in amount and description");
                      return;
                    }
                    setShowEditTransactionConfirm(true);
                  }}
                >
                  Continue
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Confirm changes to this transaction:</p>
                {editingTransaction && (
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-16">Amount:</span>
                      <span>${formatCurrency(Math.abs(editingTransaction.amount))}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">${formatCurrency(parseFloat(editTransactionAmount) || 0)}</span>
                    </div>
                    {(editingTransaction.description || editingTransaction.notes || '') !== editTransactionNotes && (
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground w-16 shrink-0">Desc:</span>
                        <span className="truncate">{editingTransaction.description || editingTransaction.notes || '-'}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="font-medium truncate">{editTransactionNotes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditTransactionConfirm(false)}>
                  Back
                </Button>
                <Button onClick={handleEditTransaction} disabled={loading}>
                  {loading ? 'Updating...' : 'Confirm Update'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Transaction Confirmation */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTransaction && (
                <>
                  Are you sure you want to delete this <span className="font-medium">{deletingTransaction.transactionType.replace(/_/g, ' ')}</span> transaction
                  of <span className="font-medium">${formatCurrency(Math.abs(deletingTransaction.amount))}</span>
                  {deletingTransaction.description && <> ({deletingTransaction.description})</>}?
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransaction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generic Alert Dialog */}
      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertDialogOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
