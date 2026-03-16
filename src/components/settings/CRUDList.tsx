import { useState, useMemo } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

interface ListItem {
  id: string;
  value: string;
}

interface CRUDListProps {
  title: string;
  items: ListItem[];
  loading: boolean;
  onAdd: (value: string) => Promise<void>;
  onEdit: (id: string, value: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  searchPlaceholder?: string;
  filterItem?: (item: ListItem) => boolean;
}

export function CRUDList({
  title,
  items,
  loading,
  onAdd,
  onEdit,
  onDelete,
  searchPlaceholder = "Search...",
  filterItem,
}: CRUDListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [addValue, setAddValue] = useState("");
  const [editValue, setEditValue] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ListItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ListItem | null>(null);

  const filteredItems = useMemo(() => items.filter((item) => {
    if (filterItem && !filterItem(item)) return false;
    return item.value.toLowerCase().includes(searchTerm.toLowerCase());
  }), [items, searchTerm, filterItem]);

  const handleSaveAdd = async () => {
    if (!addValue.trim()) return;
    try {
      setSavingAdd(true);
      await onAdd(addValue.trim());
      setAddDialogOpen(false);
      setAddValue("");
    } finally {
      setSavingAdd(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    try {
      setSavingEdit(true);
      await onEdit(editItem.id, editValue);
      setEditItem(null);
      setEditValue("");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteItem) return;
    await onDelete(deleteItem.id);
    setDeleteItem(null);
  };

  return (
    <div className="space-y-0">
      <div className="flex justify-between items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            disabled={loading}
          />
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2" disabled={loading}>
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm ? "No items match your search" : "No items added yet"}
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-center justify-between px-4 py-2 bg-white ${
                index !== filteredItems.length - 1 ? "border-b" : ""
              }`}
            >
              <span className="text-base">{item.value}</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditItem(item);
                    setEditValue(item.value);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteItem(item)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Dialog */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false);
            setAddValue("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>Add a new item to the list of {title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-value">Value</Label>
              <Input
                id="add-value"
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleSaveAdd();
                }}
                placeholder="Enter the value..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={savingAdd}
              onClick={() => {
                setAddDialogOpen(false);
                setAddValue("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAdd} disabled={savingAdd} aria-busy={savingAdd}>
              {savingAdd ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
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
      <Dialog
        open={!!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setEditItem(null);
            setEditValue("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Modify the value of the selected item</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-value">Value</Label>
              <Input
                id="edit-value"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={savingEdit}
              onClick={() => {
                setEditItem(null);
                setEditValue("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit} aria-busy={savingEdit}>
              {savingEdit ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteItem?.value}&quot;. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteItem(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
