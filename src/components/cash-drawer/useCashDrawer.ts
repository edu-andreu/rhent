import { useState, useEffect } from "react";
import { ApiError, deleteFunction, getFunction, postFunction, putFunction } from "../../shared/api/client";
import { handleApiError } from "../../shared/utils/errorHandler";

export interface DrawerData {
  drawerId: string;
  businessDate: string;
  location: string;
  openedBy: string;
  openedAt: string;
  openingCash: number;
  status: 'open' | 'closed';
  closedBy?: string;
  closedAt?: string;
  countedCash?: number;
  expectedCash?: number;
  difference?: number;
  notes?: string;
}

export interface DrawerSummary {
  openingCash: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedBalance: number;
}

export interface DrawerTransaction {
  transactionId: string;
  transactionType: 'checkout' | 'return_checkout' | 'reservation_checkout' | 'cancellation' | 'cash_in' | 'cash_out' | 'in' | 'out';
  amount: number;
  createdAt: string;
  referenceId: string;
  referenceType: string;
  paymentMethod: string;
  notes?: string;
  description?: string;
}

export interface DrawerHistoryItem {
  drawer_id: string;
  business_date: string;
  location: string;
  opened_by: string;
  opened_at: string;
  opening_cash: number;
  closed_by: string | null;
  closed_at: string | null;
  counted_cash: number | null;
  expected_cash: number | null;
  difference: number | null;
  notes: string | null;
  status: 'open' | 'closed';
  openingMismatch?: number;
}

export interface AuditEntry {
  audit_id: string;
  drawer_id: string;
  txn_id: string | null;
  action: string;
  old_values: Record<string, any>;
  new_values: Record<string, any> | null;
  performed_by: string;
  created_at: string;
}

export const formatCurrency = (amount: number) => {
  return Math.round(amount).toLocaleString('es-AR');
};

export const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateTimeShort = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatBusinessDate = (dateString: string) => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

export const isTransactionEditable = (t: DrawerTransaction) => {
  return ['cash_in', 'cash_out', 'in', 'out'].includes(t.transactionType) && t.referenceType === 'Manual';
};

/** True if the transaction represents money leaving the drawer (e.g. refund, cash out, cancellation). */
export const isCashOutTransaction = (t: DrawerTransaction) => {
  return ['cancellation', 'cash_out', 'out'].includes(t.transactionType);
};

export function useCashDrawer() {
  const [currentDrawer, setCurrentDrawer] = useState<DrawerData | null>(null);
  const [drawerSummary, setDrawerSummary] = useState<DrawerSummary | null>(null);
  const [transactions, setTransactions] = useState<DrawerTransaction[]>([]);
  const [drawerHistory, setDrawerHistory] = useState<DrawerHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("current");

  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertDialogContent, setAlertDialogContent] = useState({ title: "", description: "" });

  const showAlert = (title: string, description: string) => {
    setAlertDialogContent({ title, description });
    setAlertDialogOpen(true);
  };

  // Open Drawer Dialog
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [openingCash, setOpeningCash] = useState('');

  // Close Drawer Dialog
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  // Cash Transaction Dialog
  const [showCashTransactionDialog, setShowCashTransactionDialog] = useState(false);
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionCategory, setTransactionCategory] = useState('');
  const [transactionNotes, setTransactionNotes] = useState('');

  // Edit Opening Cash Dialog
  const [showEditOpeningCashDialog, setShowEditOpeningCashDialog] = useState(false);
  const [editOpeningCashAmount, setEditOpeningCashAmount] = useState('');
  const [showEditOpeningCashConfirm, setShowEditOpeningCashConfirm] = useState(false);

  // Edit Transaction Dialog
  const [showEditTransactionDialog, setShowEditTransactionDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<DrawerTransaction | null>(null);
  const [editTransactionAmount, setEditTransactionAmount] = useState('');
  const [editTransactionNotes, setEditTransactionNotes] = useState('');
  const [showEditTransactionConfirm, setShowEditTransactionConfirm] = useState(false);

  // Delete Transaction Confirmation
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<DrawerTransaction | null>(null);

  // History detail expansion
  const [expandedDrawerId, setExpandedDrawerId] = useState<string | null>(null);
  const [drawerDetails, setDrawerDetails] = useState<Record<string, { transactions: DrawerTransaction[]; summary: DrawerSummary & { countedCash: number | null; difference: number | null } }>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  // Audit trail
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);

  const fetchAuditLog = async (drawerId: string) => {
    try {
      const data = await getFunction<Record<string, any>>(`drawer/audit?drawerId=${drawerId}`);
      setAuditLog(data.auditLog || []);
    } catch (err) {
      console.error('Error fetching audit log:', err);
    }
  };

  const fetchCurrentDrawer = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFunction<Record<string, any>>("drawer/current");
      setCurrentDrawer(data.drawer);
      setDrawerSummary(data.summary);
      setTransactions(data.transactions || []);
      if (data.drawer?.drawerId) {
        fetchAuditLog(data.drawer.drawerId);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setCurrentDrawer(null);
        setDrawerSummary(null);
        setTransactions([]);
      } else {
        handleApiError(err, "current drawer");
        setError(err instanceof Error ? err.message : "Failed to fetch current drawer");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDrawerHistory = async () => {
    try {
      const data = await getFunction<Record<string, any>>("drawer/history?limit=10&offset=0");
      setDrawerHistory(data.drawers || []);
    } catch (err) {
      console.error('Error fetching drawer history:', err);
    }
  };

  const fetchDrawerDetail = async (drawerId: string) => {
    if (drawerDetails[drawerId]) return;
    setLoadingDetail(drawerId);
    try {
      const data = await getFunction<any>(`drawer/${drawerId}/detail`);
      setDrawerDetails(prev => ({ ...prev, [drawerId]: data }));
    } catch (err) {
      console.error('Error fetching drawer detail:', err);
    } finally {
      setLoadingDetail(null);
    }
  };

  const toggleDrawerExpansion = (drawerId: string) => {
    if (expandedDrawerId === drawerId) {
      setExpandedDrawerId(null);
    } else {
      setExpandedDrawerId(drawerId);
      fetchDrawerDetail(drawerId);
    }
  };

  const formatAuditEntry = (entry: AuditEntry) => {
    const oldV = entry.old_values || {};
    const newV = entry.new_values || {};
    switch (entry.action) {
      case 'edit_opening_cash':
        return `Opening cash changed from $${formatCurrency(oldV.opening_cash)} to $${formatCurrency(newV.opening_cash)}`;
      case 'edit_transaction': {
        const txnType = (oldV.txn_type || '').replace(/_/g, ' ');
        const descChanged = oldV.description !== newV.description;
        return `${txnType} edited: $${formatCurrency(Math.abs(oldV.amount))} → $${formatCurrency(Math.abs(newV.amount))}${descChanged ? ` (description: "${oldV.description}" → "${newV.description}")` : ''}`;
      }
      case 'delete_transaction': {
        const txnType = (oldV.txn_type || '').replace(/_/g, ' ');
        return `${txnType} deleted: $${formatCurrency(Math.abs(oldV.amount))} "${oldV.description}"`;
      }
      default:
        return JSON.stringify(oldV);
    }
  };

  const handleOpenDrawer = async () => {
    if (!openingCash) {
      showAlert("Missing Information", "Please enter the opening cash amount");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await postFunction<Record<string, any>>("drawer/open", {
        openingCash: parseFloat(openingCash),
        location: 'Showroom',
        openedBy: 'user',
      });
      if (data.warning) {
        showAlert("Warning", data.warning);
      }

      setShowOpenDialog(false);
      setOpeningCash('');
      await fetchCurrentDrawer();
      await fetchDrawerHistory();
    } catch (err) {
      handleApiError(err, "drawer opening", "Failed to open drawer");
      showAlert("Error", err instanceof Error ? err.message : "Failed to open drawer");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDrawer = async () => {
    if (!countedCash) {
      showAlert("Missing Information", "Please enter the counted cash amount");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await postFunction("drawer/close", {
        countedCash: parseFloat(countedCash),
        closedBy: 'user',
        notes: closeNotes || undefined,
      });

      setShowCloseDialog(false);
      setCountedCash('');
      setCloseNotes('');
      await fetchCurrentDrawer();
      await fetchDrawerHistory();
    } catch (err) {
      handleApiError(err, "drawer closing", "Failed to close drawer");
      showAlert("Error", err instanceof Error ? err.message : "Failed to close drawer");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCashTransaction = async () => {
    if (!transactionAmount || !transactionNotes) {
      showAlert("Missing Information", "Please fill in amount and description");
      return;
    }

    setLoading(true);
    try {
      const amount = transactionType === 'in'
        ? parseFloat(transactionAmount)
        : -parseFloat(transactionAmount);

      await postFunction("drawer/transaction", {
        amount,
        category: transactionType === 'in' ? 'cash_in' : 'cash_out',
        notes: transactionNotes,
      });

      setShowCashTransactionDialog(false);
      setTransactionAmount('');
      setTransactionNotes('');
      await fetchCurrentDrawer();
    } catch (err) {
      handleApiError(err, "cash transaction", "Failed to add cash transaction");
      showAlert("Error", err instanceof Error ? err.message : "Failed to add cash transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpeningCash = async () => {
    if (!editOpeningCashAmount) {
      showAlert("Missing Information", "Please enter the new opening cash amount");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await putFunction("drawer/opening-cash", {
        openingCash: parseFloat(editOpeningCashAmount),
      });

      setShowEditOpeningCashDialog(false);
      setEditOpeningCashAmount('');
      await fetchCurrentDrawer();
    } catch (err) {
      handleApiError(err, "opening cash", "Failed to edit opening cash");
      showAlert("Error", err instanceof Error ? err.message : "Failed to edit opening cash");
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransaction = async () => {
    if (!editTransactionAmount || !editTransactionNotes || !editingTransaction) {
      showAlert("Missing Information", "Please fill in amount and description");
      return;
    }

    setLoading(true);
    try {
      const isCashOut = editingTransaction.transactionType === 'cash_out';
      const rawAmount = parseFloat(editTransactionAmount);
      const amount = isCashOut ? -Math.abs(rawAmount) : Math.abs(rawAmount);

      await putFunction(`drawer/transaction/${editingTransaction.transactionId}`, {
        amount,
        notes: editTransactionNotes,
      });

      setShowEditTransactionDialog(false);
      setEditingTransaction(null);
      setEditTransactionAmount('');
      setEditTransactionNotes('');
      await fetchCurrentDrawer();
    } catch (err) {
      handleApiError(err, "transaction", "Failed to edit transaction");
      showAlert("Error", err instanceof Error ? err.message : "Failed to edit transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTransaction) {
      showAlert("Missing Information", "No transaction selected for deletion");
      return;
    }

    setLoading(true);
    try {
      await deleteFunction(`drawer/transaction/${deletingTransaction.transactionId}`);

      setShowDeleteConfirmDialog(false);
      setDeletingTransaction(null);
      await fetchCurrentDrawer();
    } catch (err) {
      handleApiError(err, "transaction deletion", "Failed to delete transaction");
      showAlert("Error", err instanceof Error ? err.message : "Failed to delete transaction");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchCurrentDrawer(), fetchDrawerHistory()]);
      setInitialLoading(false);
    };
    loadInitialData();
  }, []);

  return {
    // Core data
    currentDrawer,
    drawerSummary,
    transactions,
    drawerHistory,
    loading,
    initialLoading,
    error,
    activeTab,
    setActiveTab,

    // Alert dialog
    alertDialogOpen,
    setAlertDialogOpen,
    alertDialogContent,
    showAlert,

    // Open drawer dialog
    showOpenDialog,
    setShowOpenDialog,
    openingCash,
    setOpeningCash,

    // Close drawer dialog
    showCloseDialog,
    setShowCloseDialog,
    countedCash,
    setCountedCash,
    closeNotes,
    setCloseNotes,

    // Cash transaction dialog
    showCashTransactionDialog,
    setShowCashTransactionDialog,
    transactionType,
    setTransactionType,
    transactionAmount,
    setTransactionAmount,
    transactionCategory,
    setTransactionCategory,
    transactionNotes,
    setTransactionNotes,

    // Edit opening cash dialog
    showEditOpeningCashDialog,
    setShowEditOpeningCashDialog,
    editOpeningCashAmount,
    setEditOpeningCashAmount,
    showEditOpeningCashConfirm,
    setShowEditOpeningCashConfirm,

    // Edit transaction dialog
    showEditTransactionDialog,
    setShowEditTransactionDialog,
    editingTransaction,
    setEditingTransaction,
    editTransactionAmount,
    setEditTransactionAmount,
    editTransactionNotes,
    setEditTransactionNotes,
    showEditTransactionConfirm,
    setShowEditTransactionConfirm,

    // Delete transaction dialog
    showDeleteConfirmDialog,
    setShowDeleteConfirmDialog,
    deletingTransaction,
    setDeletingTransaction,

    // History detail expansion
    expandedDrawerId,
    drawerDetails,
    loadingDetail,
    toggleDrawerExpansion,

    // Audit trail
    auditLog,
    showAuditLog,
    setShowAuditLog,

    // Handlers
    handleOpenDrawer,
    handleCloseDrawer,
    handleAddCashTransaction,
    handleEditOpeningCash,
    handleEditTransaction,
    handleDeleteTransaction,
    fetchCurrentDrawer,
    fetchDrawerHistory,
    fetchDrawerDetail,
    fetchAuditLog,
    formatAuditEntry,
  };
}

export type UseCashDrawerReturn = ReturnType<typeof useCashDrawer>;
