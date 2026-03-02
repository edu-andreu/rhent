import { lazy, Suspense } from "react";
import { TabErrorBoundary } from "./TabErrorBoundary";
import { useAppState } from "../providers/AppStateProvider";
import { Dress, Customer } from "../types";

// Lazy-load tab components for code splitting
const CatalogTab = lazy(() => import("../features/catalog/CatalogTab").then((m) => ({ default: m.CatalogTab })));
const RentalsTab = lazy(() => import("../features/rentals/RentalsTab").then((m) => ({ default: m.RentalsTab })));
const ReservationsTab = lazy(() => import("../features/reservations/ReservationsTab").then((m) => ({ default: m.ReservationsTab })));
const CustomersTab = lazy(() => import("../features/customers/CustomersTab").then((m) => ({ default: m.CustomersTab })));
const CashTab = lazy(() => import("../features/cash/CashTab").then((m) => ({ default: m.CashTab })));
const SettingsTab = lazy(() => import("../features/settings/SettingsTab").then((m) => ({ default: m.SettingsTab })));

interface TabRouterProps {
  // Catalog props
  dresses: Dress[];
  loadingDresses: boolean;
  defaultReturnLocationId: string | null;
  movingToShowroomId: string | null;
  onRent: (dress: Dress) => void;
  onReserve: (dress: Dress) => void;
  onBuy: (dress: Dress) => void;
  onEditDress: (dress: Dress) => void;
  onDeleteDress: (dress: Dress) => void;
  onMoveToShowroom: (dress: Dress) => void;
  onAddNewDress: () => void;
  
  // Rentals props
  rentals: any[];
  onReturn: (rentalItemId: string) => void;
  
  // Reservations props
  reservations: any[];
  onCancel: (reservationId: string) => void;
  onReschedule: (reservationId: string, newDate: Date) => void;
  onConvertToRental: () => Promise<void>;
  onConfirm: (reservationId: string) => void;
  
  // Customers props
  customers: Customer[];
  loadingCustomers: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
  onAddNew: () => void;
  
  // Cash props
  isDebugMode: boolean;
}

export function TabRouter({
  dresses,
  loadingDresses,
  defaultReturnLocationId,
  movingToShowroomId,
  onRent,
  onReserve,
  onBuy,
  onEditDress,
  onDeleteDress,
  onMoveToShowroom,
  onAddNewDress,
  rentals,
  onReturn,
  reservations,
  onCancel,
  onReschedule,
  onConvertToRental,
  onConfirm,
  customers,
  loadingCustomers,
  onEdit,
  onDelete,
  onAddNew,
  isDebugMode,
}: TabRouterProps) {
  const { activeTab, catalogEditMode, catalogSearchQuery, setCatalogEditMode, setCatalogSearchQuery } = useAppState();

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-3">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <TabErrorBoundary tabName={activeTab} key={activeTab}>
        {activeTab === "catalog" && (
          <CatalogTab
            dresses={dresses}
            loadingDresses={loadingDresses}
            catalogSearchQuery={catalogSearchQuery}
            onCatalogSearchQueryChange={setCatalogSearchQuery}
            catalogEditMode={catalogEditMode}
            onCatalogEditModeChange={setCatalogEditMode}
            defaultReturnLocationId={defaultReturnLocationId}
            movingToShowroomId={movingToShowroomId}
            onRent={onRent}
            onReserve={onReserve}
            onBuy={onBuy}
            onEditDress={onEditDress}
            onDeleteDress={onDeleteDress}
            onMoveToShowroom={onMoveToShowroom}
            onAddNewDress={onAddNewDress}
          />
        )}

        {activeTab === "rentals" && (
          <RentalsTab rentals={rentals} onReturn={onReturn} />
        )}

        {activeTab === "reservations" && (
          <ReservationsTab
            reservations={reservations}
            onCancel={onCancel}
            onReschedule={onReschedule}
            onConvertToRental={onConvertToRental}
            onConfirm={onConfirm}
          />
        )}

        {activeTab === "cash" && <CashTab isDebugMode={isDebugMode} />}

        {activeTab === "customers" && (
          <CustomersTab
            customers={customers}
            loadingCustomers={loadingCustomers}
            rentals={rentals}
            reservations={reservations}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddNew={onAddNew}
          />
        )}

        {activeTab === "settings" && <SettingsTab />}
      </TabErrorBoundary>
    </Suspense>
  );
}
