import { useState, useEffect } from "react";
import { ApiError, deleteFunction, getFunction, postFunction, putFunction } from "../../shared/api/client";
import { handleApiError } from "../../shared/utils/errorHandler";
import { useAuth } from "../../providers/AuthProvider";

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
  categoryId?: string | null;
  categoryName?: string | null;
  cashOutType?: 'expense' | 'payroll' | 'move_money' | null;
  employeeName?: string | null;
  shiftStart?: string | null;
  shiftEnd?: string | null;
  hoursWorked?: number | null;
  hourlyRate?: number | null;
  /** True when payment is cash (or manual in/out); false for card etc. Used to show only cash in Cash Drawer tab. */
  isCash?: boolean;
}

export interface TransactionCategory {
  id: string;
  name: string;
  direction: 'in' | 'out';
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

  // Categories & payroll
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [cashOutType, setCashOutType] = useState<'expense' | 'payroll' | 'move_money'>('expense');
  const [employeeName, setEmployeeName] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employees, setEmployees] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [hourlyRate, setHourlyRate] = useState(5000);

  const { appUser } = useAuth();

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

  const fetchCategories = async (direction: 'in' | 'out') => {
    try {
      const data = await getFunction<Record<string, any>>(`drawer/categories?direction=${direction}`);
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const createCategory = async (name: string, direction: 'in' | 'out'): Promise<TransactionCategory | null> => {
    try {
      const data = await postFunction<Record<string, any>>("drawer/categories", { name, direction });
      if (data.category) {
        await fetchCategories(direction);
        return data.category;
      }
      return null;
    } catch (err) {
      handleApiError(err, "category creation", "Failed to create category");
      return null;
    }
  };

  const fetchHourlyRate = async () => {
    try {
      const data = await getFunction<Record<string, any>>("get-configuration");
      const rate = parseFloat(data.config?.storeAssistantWageByHour || "5000");
      setHourlyRate(rate);
    } catch (err) {
      console.error('Error fetching hourly rate:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await getFunction<{ employees: { id: string; full_name: string | null; email: string }[] }>("users/employees");
      setEmployees(data.employees || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

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
    // Move Money path
    if (transactionType === 'out' && cashOutType === 'move_money') {
      if (!transactionAmount || parseFloat(transactionAmount) <= 0) {
        showAlert("Missing Information", "Please enter a valid amount");
        return;
      }
      setLoading(true);
      try {
        await postFunction("drawer/transaction", {
          cash_out_type: 'move_money',
          amount: parseFloat(transactionAmount),
          notes: transactionNotes || undefined,
        });
        resetTransactionDialog();
        await fetchCurrentDrawer();
      } catch (err) {
        handleApiError(err, "move money transaction", "Failed to add move money transaction");
        showAlert("Error", err instanceof Error ? err.message : "Failed to add move money transaction");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Payroll path
    if (transactionType === 'out' && cashOutType === 'payroll') {
      const name = selectedEmployeeId ? (employees.find((e) => e.id === selectedEmployeeId)?.full_name ?? '').trim() : employeeName.trim();
      if (!name) {
        showAlert("Missing Information", "Please select an employee");
        return;
      }
      if (!shiftStart || !shiftEnd) {
        showAlert("Missing Information", "Please enter shift start and end times");
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const startISO = new Date(`${today}T${shiftStart}`).toISOString();
      const endISO = new Date(`${today}T${shiftEnd}`).toISOString();

      setLoading(true);
      try {
        await postFunction("drawer/transaction", {
          cash_out_type: 'payroll',
          employee_name: name,
          shift_start: startISO,
          shift_end: endISO,
          notes: transactionNotes || undefined,
        });

        resetTransactionDialog();
        await fetchCurrentDrawer();
      } catch (err) {
        handleApiError(err, "payroll transaction", "Failed to add payroll transaction");
        showAlert("Error", err instanceof Error ? err.message : "Failed to add payroll transaction");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Expense / Cash-in path
    if (!selectedCategoryId) {
      showAlert("Missing Information", "Please select a category");
      return;
    }
    if (!transactionAmount) {
      showAlert("Missing Information", "Please enter an amount");
      return;
    }

    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    const isOtro = selectedCategory?.name.toLowerCase() === 'otro';
    if (isOtro && !transactionNotes.trim()) {
      showAlert("Missing Information", "Description is required when category is 'Otro'");
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
        category_id: selectedCategoryId,
        cash_out_type: transactionType === 'out' ? 'expense' : undefined,
        notes: transactionNotes || undefined,
      });

      resetTransactionDialog();
      await fetchCurrentDrawer();
    } catch (err) {
      handleApiError(err, "cash transaction", "Failed to add cash transaction");
      showAlert("Error", err instanceof Error ? err.message : "Failed to add cash transaction");
    } finally {
      setLoading(false);
    }
  };

  const resetTransactionDialog = () => {
    setShowCashTransactionDialog(false);
    setTransactionAmount('');
    setTransactionNotes('');
    setSelectedCategoryId('');
    setCashOutType('expense');
    setEmployeeName('');
    setSelectedEmployeeId('');
    setShiftStart('');
    setShiftEnd('');
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
    if (!editTransactionAmount || !editingTransaction) {
      showAlert("Missing Information", "Please fill in amount");
      return;
    }
    if (editingTransaction.cashOutType !== 'move_money' && !editTransactionNotes) {
      showAlert("Missing Information", "Please fill in description");
      return;
    }

    setLoading(true);
    try {
      const isCashOut = editingTransaction.transactionType === 'cash_out';
      const rawAmount = parseFloat(editTransactionAmount);
      // Move money: server expects positive amount and negates it
      const amount =
        editingTransaction.cashOutType === 'move_money'
          ? Math.abs(rawAmount)
          : isCashOut
            ? -Math.abs(rawAmount)
            : Math.abs(rawAmount);

      await putFunction(`drawer/transaction/${editingTransaction.transactionId}`, {
        amount,
        notes: editTransactionNotes || undefined,
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
      await Promise.all([fetchCurrentDrawer(), fetchDrawerHistory(), fetchHourlyRate(), fetchEmployees()]);
      setInitialLoading(false);
    };
    loadInitialData();
  }, []);

  // Default selected employee when switching to payroll: current user if employee
  useEffect(() => {
    if (cashOutType === 'payroll' && appUser?.role === 'employee') {
      setSelectedEmployeeId(appUser.id);
      setEmployeeName(appUser.full_name ?? '');
    } else if (cashOutType === 'payroll') {
      setSelectedEmployeeId('');
      setEmployeeName('');
    }
  }, [cashOutType, appUser?.id, appUser?.role, appUser?.full_name]);

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

    // Categories & payroll
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    cashOutType,
    setCashOutType,
    employees,
    selectedEmployeeId,
    setSelectedEmployeeId,
    employeeName,
    setEmployeeName,
    shiftStart,
    setShiftStart,
    shiftEnd,
    setShiftEnd,
    hourlyRate,
    fetchCategories,
    createCategory,
    resetTransactionDialog,

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
