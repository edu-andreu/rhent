import { useMemo } from "react";
import { Plus, Search } from "lucide-react";
import { DressCard } from "../../components/DressCard";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Dress } from "../../types";

const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

interface CatalogTabProps {
  dresses: Dress[];
  loadingDresses: boolean;
  catalogSearchQuery: string;
  onCatalogSearchQueryChange: (value: string) => void;
  catalogEditMode: boolean;
  onCatalogEditModeChange: (value: boolean) => void;
  defaultReturnLocationId: string | null;
  movingToShowroomId: string | null;
  onRent: (dress: Dress) => void;
  onReserve: (dress: Dress) => void;
  onBuy: (dress: Dress) => void;
  onEditDress: (dress: Dress) => void;
  onDeleteDress: (dress: Dress) => void;
  onMoveToShowroom: (dress: Dress) => void;
  onAddNewDress: () => void;
}

export function CatalogTab({
  dresses,
  loadingDresses,
  catalogSearchQuery,
  onCatalogSearchQueryChange,
  catalogEditMode,
  onCatalogEditModeChange,
  defaultReturnLocationId,
  movingToShowroomId,
  onRent,
  onReserve,
  onBuy,
  onEditDress,
  onDeleteDress,
  onMoveToShowroom,
  onAddNewDress,
}: CatalogTabProps) {
  // Memoize filtered dresses based on search query
  const filteredDresses = useMemo(() => {
    if (!catalogSearchQuery.trim()) return dresses;
    
    const searchTerms = removeAccents(catalogSearchQuery.toLowerCase().trim()).split(/\s+/);
    return dresses.filter((dress) => {
      const searchableText = removeAccents(
        [
          dress.name,
          dress.sku ?? "",
          dress.category,
          dress.type ?? "",
          dress.brand ?? "",
          dress.size,
          ...dress.colors,
          dress.description,
          dress.status ?? "",
          dress.availabilityStatus ?? "",
        ].join(" ").toLowerCase()
      );
      return searchTerms.every((term) => searchableText.includes(term));
    });
  }, [dresses, catalogSearchQuery]);

  return (
    <div id="catalog-tab" data-testid="catalog-tab" className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6 flex-shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="catalog-search"
            data-testid="catalog-search-input"
            type="text"
            placeholder="Search by name, SKU, category, brand, type, size, color, location, status, or description..."
            value={catalogSearchQuery}
            onChange={(e) => onCatalogSearchQueryChange(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="edit-mode" className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
              Edit Mode
            </Label>
            <Switch
              id="edit-mode"
              data-testid="catalog-edit-mode-toggle"
              checked={catalogEditMode}
              onCheckedChange={onCatalogEditModeChange}
            />
          </div>
          {catalogEditMode && (
            <Button id="add-dress-button" data-testid="add-dress-button" onClick={onAddNewDress} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Add New
            </Button>
          )}
        </div>
      </div>

      <div id="catalog-content" data-testid="catalog-content" className="flex-1 overflow-y-auto">
        {loadingDresses ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
              <p className="text-muted-foreground">Loading catalog...</p>
            </div>
          </div>
        ) : dresses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No dresses available in the catalog.</p>
            {catalogEditMode && (
              <Button data-testid="add-first-dress-button" onClick={onAddNewDress} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Dress
              </Button>
            )}
          </div>
        ) : filteredDresses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No dresses found matching &quot;{catalogSearchQuery}&quot;</p>
          </div>
        ) : (
          <div data-testid="catalog-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredDresses.map((dress) => (
              <DressCard
                key={dress.id}
                dress={dress}
                onRent={onRent}
                onReserve={onReserve}
                onBuy={onBuy}
                onEdit={onEditDress}
                onDelete={onDeleteDress}
                onMoveToShowroom={onMoveToShowroom}
                isMovingToShowroom={movingToShowroomId === dress.id}
                defaultReturnLocationId={defaultReturnLocationId ?? undefined}
                editMode={catalogEditMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
