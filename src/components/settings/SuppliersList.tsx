import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Pencil, Trash2, Search, Loader2, ChevronsUpDown } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { getFunction, postFunction, putFunction, deleteFunction, ApiError } from "../../shared/api/client";
import { handleApiError } from "../../shared/utils/errorHandler";
import { toast } from "sonner@2.0.3";
import type { TransactionCategory } from "../cash-drawer/useCashDrawer";

const DIRECTION_LABELS: Record<string, string> = {
  in: "Cash In",
  out: "Cash Out",
};

function CategorySelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newValue, setNewValue] = useState("");

  return (
    <Popover open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) { setAddingNew(false); setNewValue(""); }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || "Select category..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {addingNew ? (
          <div className="p-3 space-y-2">
            <p className="text-sm font-medium">New category</p>
            <Input
              placeholder="Category name..."
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = newValue.trim();
                  if (v) { onChange(v); setNewValue(""); setAddingNew(false); setOpen(false); }
                  e.preventDefault();
                }
                if (e.key === "Escape") { setAddingNew(false); setNewValue(""); }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setAddingNew(false); setNewValue(""); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={!newValue.trim()}
                onClick={() => {
                  const v = newValue.trim();
                  if (v) { onChange(v); setNewValue(""); setAddingNew(false); setOpen(false); }
                }}
              >
                Add
              </Button>
            </div>
          </div>
        ) : (
          <Command>
            <CommandInput placeholder="Search category..." />
            <CommandList>
              <CommandEmpty>No category found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => { onChange(opt); setOpen(false); }}
                  >
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="border-t p-1">
              <button
                type="button"
                className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => setAddingNew(true)}
              >
                <Plus className="h-4 w-4" />
                Add new category
              </button>
            </div>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function SuppliersList() {
  const [suppliers, setSuppliers] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<TransactionCategory | null>(null);
  const [deleteItem, setDeleteItem] = useState<TransactionCategory | null>(null);
  const [savingAdd, setSavingAdd] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addDirection, setAddDirection] = useState<"in" | "out">("out");
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDirection, setEditDirection] = useState<"in" | "out">("out");

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFunction<{ categories: TransactionCategory[] }>("drawer/categories");
      setSuppliers(data.categories || []);
    } catch (err) {
      handleApiError(err, "suppliers", "Failed to load suppliers");
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const uniqueCategoryValues = useMemo(
    () => [...new Set(suppliers.map((s) => s.category).filter(Boolean))].sort(),
    [suppliers],
  );

  const filteredSuppliers = useMemo(() => suppliers.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      (s.name || "").toLowerCase().includes(term) ||
      (s.category || "").toLowerCase().includes(term)
    );
  }), [suppliers, searchTerm]);

  const handleOpenAdd = () => {
    setAddName("");
    setAddCategory("");
    setAddDirection("out");
    setAddOpen(true);
  };

  const handleSaveAdd = async () => {
    const name = addName.trim();
    const category = addCategory.trim();
    if (!name || !category) {
      toast.error("Supplier name and category are required");
      return;
    }
    setSavingAdd(true);
    try {
      await postFunction("drawer/categories", { name, category, direction: addDirection });
      toast.success("Supplier added");
      setAddOpen(false);
      await fetchSuppliers();
    } catch (err) {
      handleApiError(err, "add supplier", "Failed to add supplier");
      toast.error(err instanceof Error ? err.message : "Failed to add supplier");
    } finally {
      setSavingAdd(false);
    }
  };

  const handleOpenEdit = (item: TransactionCategory) => {
    setEditItem(item);
    setEditName(item.name);
    setEditCategory(item.category ?? "");
    setEditDirection(item.direction);
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    const name = editName.trim();
    const category = editCategory.trim();
    if (!name || !category) {
      toast.error("Supplier name and category are required");
      return;
    }
    setSavingEdit(true);
    try {
      await putFunction(`drawer/categories/${editItem.id}`, {
        name,
        category,
        direction: editDirection,
      });
      toast.success("Supplier updated");
      setEditItem(null);
      await fetchSuppliers();
    } catch (err) {
      handleApiError(err, "update supplier", "Failed to update supplier");
      toast.error(err instanceof Error ? err.message : "Failed to update supplier");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await deleteFunction(`drawer/categories/${deleteItem.id}`);
      toast.success("Supplier deleted");
      setDeleteItem(null);
      await fetchSuppliers();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Cannot delete: this supplier is used by transactions or expenses.");
      } else {
        handleApiError(err, "delete supplier", "Failed to delete supplier");
        toast.error(err instanceof Error ? err.message : "Failed to delete supplier");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            disabled={loading}
          />
        </div>
        <Button onClick={handleOpenAdd} className="gap-2" disabled={loading}>
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm ? "No suppliers match your search" : "No suppliers yet. Add one to get started."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.category ?? "—"}</TableCell>
                  <TableCell>{DIRECTION_LABELS[s.direction] ?? s.direction}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(s)}
                        aria-label="Edit supplier"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteItem(s)}
                        aria-label="Delete supplier"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add supplier</DialogTitle>
            <DialogDescription>Add a new supplier. Name and category are used in Cash Drawer and Expenses.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Supplier name *</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Ecogas"
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <CategorySelect
                value={addCategory}
                onChange={setAddCategory}
                options={uniqueCategoryValues as string[]}
              />
            </div>
            <div className="space-y-2">
              <Label>Direction *</Label>
              <Select value={addDirection} onValueChange={(v) => setAddDirection(v as "in" | "out")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">{DIRECTION_LABELS.in}</SelectItem>
                  <SelectItem value="out">{DIRECTION_LABELS.out}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={savingAdd}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdd} disabled={savingAdd || !addName.trim() || !addCategory.trim()}>
              {savingAdd ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit supplier</DialogTitle>
            <DialogDescription>Update supplier name, category, or direction.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Supplier name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Ecogas"
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <CategorySelect
                value={editCategory}
                onChange={setEditCategory}
                options={uniqueCategoryValues as string[]}
              />
            </div>
            <div className="space-y-2">
              <Label>Direction *</Label>
              <Select value={editDirection} onValueChange={(v) => setEditDirection(v as "in" | "out")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">{DIRECTION_LABELS.in}</SelectItem>
                  <SelectItem value="out">{DIRECTION_LABELS.out}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit || !editName.trim() || !editCategory.trim()}>
              {savingEdit ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete supplier</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItem && (
                <>
                  Are you sure you want to delete &quot;{deleteItem.name}&quot;? This action cannot be undone.
                  If this supplier is used by any transactions or expenses, deletion will be blocked.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
