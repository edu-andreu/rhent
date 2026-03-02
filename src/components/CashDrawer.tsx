import React from "react";
import { AlertCircle, Unlock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useCashDrawer, formatDateTimeShort, DrawerTransaction } from "./cash-drawer/useCashDrawer";
import { DrawerSummaryCards } from "./cash-drawer/DrawerSummaryCards";
import { TransactionTable } from "./cash-drawer/TransactionTable";
import { AuditLogSection } from "./cash-drawer/AuditLogSection";
import { DrawerHistory } from "./cash-drawer/DrawerHistory";
import { CashDrawerDialogs } from "./cash-drawer/CashDrawerDialogs";

export function CashDrawer() {
  const drawer = useCashDrawer();

  const handleEditTransactionClick = (t: DrawerTransaction) => {
    drawer.setEditingTransaction(t);
    drawer.setEditTransactionAmount(Math.abs(t.amount).toString());
    drawer.setEditTransactionNotes(t.description || t.notes || '');
    drawer.setShowEditTransactionDialog(true);
  };

  const handleDeleteTransactionClick = (t: DrawerTransaction) => {
    drawer.setDeletingTransaction(t);
    drawer.setShowDeleteConfirmDialog(true);
  };

  return (
    <div className="space-y-6">
      {drawer.error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{drawer.error}</p>
          </div>
        </div>
      )}

      <Tabs value={drawer.activeTab} onValueChange={drawer.setActiveTab} className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <TabsList>
            <TabsTrigger value="current">Current Session</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {drawer.currentDrawer && (
            <div className="flex items-center gap-2 px-3 py-2">
              <p className="text-sm text-muted-foreground">
                {formatDateTimeShort(drawer.currentDrawer.openedAt)} by {drawer.currentDrawer.openedBy}
              </p>
              <div className="p-1.5 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full">
                <Unlock className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        <TabsContent value="current" className="space-y-6">
          {drawer.initialLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading drawer session...</p>
            </div>
          ) : (
            <>
              <DrawerSummaryCards
                currentDrawer={drawer.currentDrawer}
                drawerSummary={drawer.drawerSummary}
                onOpenDialog={() => drawer.setShowOpenDialog(true)}
                onCloseDialog={(expectedBalance) => {
                  drawer.setCountedCash(expectedBalance);
                  drawer.setShowCloseDialog(true);
                }}
                onCashIn={() => {
                  drawer.setTransactionType('in');
                  drawer.setShowCashTransactionDialog(true);
                }}
                onCashOut={() => {
                  drawer.setTransactionType('out');
                  drawer.setShowCashTransactionDialog(true);
                }}
                onEditOpeningCash={(currentAmount) => {
                  drawer.setEditOpeningCashAmount(currentAmount.toString());
                  drawer.setShowEditOpeningCashDialog(true);
                }}
              />

              {drawer.currentDrawer && (
                <TransactionTable
                  transactions={drawer.transactions}
                  onEditTransaction={handleEditTransactionClick}
                  onDeleteTransaction={handleDeleteTransactionClick}
                />
              )}

              {drawer.currentDrawer && (
                <AuditLogSection
                  auditLog={drawer.auditLog}
                  showAuditLog={drawer.showAuditLog}
                  setShowAuditLog={drawer.setShowAuditLog}
                  formatAuditEntry={drawer.formatAuditEntry}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history">
          <DrawerHistory
            drawerHistory={drawer.drawerHistory}
            expandedDrawerId={drawer.expandedDrawerId}
            drawerDetails={drawer.drawerDetails}
            loadingDetail={drawer.loadingDetail}
            toggleDrawerExpansion={drawer.toggleDrawerExpansion}
          />
        </TabsContent>
      </Tabs>

      <CashDrawerDialogs
        loading={drawer.loading}
        drawerSummary={drawer.drawerSummary}
        showOpenDialog={drawer.showOpenDialog}
        setShowOpenDialog={drawer.setShowOpenDialog}
        openingCash={drawer.openingCash}
        setOpeningCash={drawer.setOpeningCash}
        handleOpenDrawer={drawer.handleOpenDrawer}
        showCloseDialog={drawer.showCloseDialog}
        setShowCloseDialog={drawer.setShowCloseDialog}
        countedCash={drawer.countedCash}
        setCountedCash={drawer.setCountedCash}
        closeNotes={drawer.closeNotes}
        setCloseNotes={drawer.setCloseNotes}
        handleCloseDrawer={drawer.handleCloseDrawer}
        showCashTransactionDialog={drawer.showCashTransactionDialog}
        setShowCashTransactionDialog={drawer.setShowCashTransactionDialog}
        transactionType={drawer.transactionType}
        transactionAmount={drawer.transactionAmount}
        setTransactionAmount={drawer.setTransactionAmount}
        transactionNotes={drawer.transactionNotes}
        setTransactionNotes={drawer.setTransactionNotes}
        handleAddCashTransaction={drawer.handleAddCashTransaction}
        showEditOpeningCashDialog={drawer.showEditOpeningCashDialog}
        setShowEditOpeningCashDialog={drawer.setShowEditOpeningCashDialog}
        editOpeningCashAmount={drawer.editOpeningCashAmount}
        setEditOpeningCashAmount={drawer.setEditOpeningCashAmount}
        showEditOpeningCashConfirm={drawer.showEditOpeningCashConfirm}
        setShowEditOpeningCashConfirm={drawer.setShowEditOpeningCashConfirm}
        handleEditOpeningCash={drawer.handleEditOpeningCash}
        showAlert={drawer.showAlert}
        showEditTransactionDialog={drawer.showEditTransactionDialog}
        setShowEditTransactionDialog={drawer.setShowEditTransactionDialog}
        editingTransaction={drawer.editingTransaction}
        editTransactionAmount={drawer.editTransactionAmount}
        setEditTransactionAmount={drawer.setEditTransactionAmount}
        editTransactionNotes={drawer.editTransactionNotes}
        setEditTransactionNotes={drawer.setEditTransactionNotes}
        showEditTransactionConfirm={drawer.showEditTransactionConfirm}
        setShowEditTransactionConfirm={drawer.setShowEditTransactionConfirm}
        handleEditTransaction={drawer.handleEditTransaction}
        showDeleteConfirmDialog={drawer.showDeleteConfirmDialog}
        setShowDeleteConfirmDialog={drawer.setShowDeleteConfirmDialog}
        deletingTransaction={drawer.deletingTransaction}
        handleDeleteTransaction={drawer.handleDeleteTransaction}
        alertDialogOpen={drawer.alertDialogOpen}
        setAlertDialogOpen={drawer.setAlertDialogOpen}
        alertDialogContent={drawer.alertDialogContent}
      />
    </div>
  );
}
