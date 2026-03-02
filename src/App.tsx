import React, { useEffect } from "react";
import { AppHeader } from "./components/AppHeader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "sonner";
import { AppStateProvider, useAppState } from "./providers/AppStateProvider";
import { DialogProvider, useDialog } from "./providers/DialogProvider";
import { TabRouter } from "./components/TabRouter";
import { useCatalog } from "./features/catalog/useCatalog";
import { useCustomers } from "./features/customers/useCustomers";
import { useRentals } from "./features/rentals/useRentals";
import { useReservations } from "./features/reservations/useReservations";
import { useReservationActions } from "./features/reservations/useReservationActions";

function AppContent() {
  const { activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen } = useAppState();
  const isDebugMode = new URLSearchParams(window.location.search).get("debug") === "true";

  const catalog = useCatalog();
  const {
    dresses,
    loadingDresses,
    defaultReturnLocationId,
    movingToShowroomId,
    loadDresses,
    deleteDress,
    moveToShowroom,
  } = catalog;

  const customersHook = useCustomers(true);
  const {
    customers,
    loadingCustomers,
    loadCustomers,
    addCustomer: apiAddCustomer,
    updateCustomer: apiUpdateCustomer,
    deleteCustomer: apiDeleteCustomer,
  } = customersHook;

  const rentalsHook = useRentals();
  const { rentals, setRentals, loadRentals } = rentalsHook;

  const reservationsHook = useReservations();
  const { reservations, setReservations, loadReservations } = reservationsHook;

  const reservationActions = useReservationActions({
    reservations,
    setReservations,
    onConvertToRental: async () => {
      await Promise.all([loadRentals(), loadDresses(), loadReservations(), loadCustomers()]);
    },
  });

  useEffect(() => {
    loadRentals();
  }, []);

  const handleDeleteCustomer = async (customerId: string) => {
    await apiDeleteCustomer(customerId);
  };

  return (
    <DialogProvider
      customers={customers}
      onPaymentSuccess={async () => {
        await Promise.all([loadDresses(), loadRentals(), loadReservations(), loadCustomers()]);
      }}
      onDressAdded={loadDresses}
      onDressDeleted={deleteDress}
      onCustomerAdded={async (customer) => {
        await apiAddCustomer(customer);
        return true;
      }}
      onCustomerUpdated={async (customerId, customer) => {
        await apiUpdateCustomer(customerId, customer);
        return true;
      }}
      onReturnComplete={async () => {
        await Promise.all([loadRentals(), loadDresses(), loadReservations(), loadCustomers()]);
      }}
    >
      <AppInner
        dresses={dresses}
        loadingDresses={loadingDresses}
        defaultReturnLocationId={defaultReturnLocationId}
        movingToShowroomId={movingToShowroomId}
        moveToShowroom={moveToShowroom}
        rentals={rentals}
        reservations={reservations}
        reservationActions={reservationActions}
        customers={customers}
        loadingCustomers={loadingCustomers}
        handleDeleteCustomer={handleDeleteCustomer}
      />
    </DialogProvider>
  );
}

interface AppInnerProps {
  dresses: any[];
  loadingDresses: boolean;
  defaultReturnLocationId: string | null;
  movingToShowroomId: string | null;
  moveToShowroom: (dress: any) => void;
  rentals: any[];
  reservations: any[];
  reservationActions: {
    handleCancelReservation: (id: string) => void;
    handleRescheduleReservation: (id: string, date: Date) => void;
    handleConvertToRental: () => Promise<void>;
    handleConfirmReservation: (id: string) => void;
  };
  customers: any[];
  loadingCustomers: boolean;
  handleDeleteCustomer: (id: string) => Promise<void>;
}

function AppInner({
  dresses,
  loadingDresses,
  defaultReturnLocationId,
  movingToShowroomId,
  moveToShowroom,
  rentals,
  reservations,
  reservationActions,
  customers,
  loadingCustomers,
  handleDeleteCustomer,
}: AppInnerProps) {
  const { activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen } = useAppState();
  const isDebugMode = new URLSearchParams(window.location.search).get("debug") === "true";
  const dialog = useDialog();

  return (
    <div className="h-screen flex flex-col bg-background">
      <AppHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuOpenChange={setMobileMenuOpen}
        cartItemCount={dialog.cartItems.length}
        onOpenCart={dialog.openCart}
      />

      <main className="container mx-auto px-4 py-8 flex-1 overflow-hidden">
        <div className="h-full">
          <TabRouter
            dresses={dresses}
            loadingDresses={loadingDresses}
            defaultReturnLocationId={defaultReturnLocationId}
            movingToShowroomId={movingToShowroomId}
            onRent={dialog.handleRent}
            onReserve={dialog.handleReserve}
            onBuy={dialog.handleBuy}
            onEditDress={dialog.handleEditDress}
            onDeleteDress={dialog.handleDeleteDress}
            onMoveToShowroom={moveToShowroom}
            onAddNewDress={dialog.handleAddNewDress}
            rentals={rentals}
            onReturn={dialog.handleReturn}
            reservations={reservations}
            onCancel={reservationActions.handleCancelReservation}
            onReschedule={reservationActions.handleRescheduleReservation}
            onConvertToRental={reservationActions.handleConvertToRental}
            onConfirm={reservationActions.handleConfirmReservation}
            customers={customers}
            loadingCustomers={loadingCustomers}
            onEdit={dialog.handleEditCustomer}
            onDelete={handleDeleteCustomer}
            onAddNew={dialog.handleAddNewCustomer}
            isDebugMode={isDebugMode}
          />
        </div>
      </main>

      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppStateProvider>
        <AppContent />
      </AppStateProvider>
    </ErrorBoundary>
  );
}
