import React, { useMemo, useState } from "react";
import { ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { TransactionCategory } from "./useCashDrawer";

interface CategoryComboboxProps {
  categories: TransactionCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddNew: (supplierName: string, category: string) => Promise<TransactionCategory | null>;
  direction: 'in' | 'out';
  disabled?: boolean;
}

export function CategoryCombobox({
  categories,
  selectedId,
  onSelect,
  onAddNew,
  direction,
  disabled,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [creating, setCreating] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [addingNewCategory, setAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const selectedCategory = categories.find(c => c.id === selectedId);

  const uniqueCategoryValues = useMemo(() => {
    const values = categories
      .map((c) => c.category)
      .filter((v): v is string => Boolean(v && String(v).trim() !== ""));
    return [...new Set(values)].sort();
  }, [categories]);

  const handleAddNew = async () => {
    const supplier = newSupplierName.trim();
    const category = newCategory.trim();
    if (!supplier || !category) return;
    setCreating(true);
    const created = await onAddNew(supplier, category);
    if (created) {
      onSelect(created.id);
      setNewSupplierName('');
      setNewCategory('');
      setCategoryPopoverOpen(false);
      setAddingNewCategory(false);
      setNewCategoryInput('');
      setAddingNew(false);
      setOpen(false);
    }
    setCreating(false);
  };

  const cancelAddNew = () => {
    setAddingNew(false);
    setNewSupplierName('');
    setNewCategory('');
    setCategoryPopoverOpen(false);
    setAddingNewCategory(false);
    setNewCategoryInput('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selectedCategory ? selectedCategory.name : "Select supplier..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {addingNew ? (
          <div className="p-3 space-y-2">
            <p className="text-sm font-medium">New {direction === 'in' ? 'Cash In' : 'Cash Out'} Supplier</p>
            <Input
              placeholder="Supplier name..."
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddNew();
                if (e.key === 'Escape') cancelAddNew();
              }}
              autoFocus
            />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Category</label>
              <Popover open={categoryPopoverOpen} onOpenChange={(open) => {
                setCategoryPopoverOpen(open);
                if (!open) {
                  setAddingNewCategory(false);
                  setNewCategoryInput('');
                }
              }}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryPopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    {newCategory || "Select category..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  {addingNewCategory ? (
                    <div className="p-3 space-y-2">
                      <p className="text-sm font-medium">New category</p>
                      <Input
                        placeholder="Category name..."
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const v = newCategoryInput.trim();
                            if (v) {
                              setNewCategory(v);
                              setNewCategoryInput("");
                              setAddingNewCategory(false);
                              setCategoryPopoverOpen(false);
                            }
                            e.preventDefault();
                          }
                          if (e.key === "Escape") {
                            setAddingNewCategory(false);
                            setNewCategoryInput("");
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setAddingNewCategory(false);
                            setNewCategoryInput("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            const v = newCategoryInput.trim();
                            if (v) {
                              setNewCategory(v);
                              setNewCategoryInput("");
                              setAddingNewCategory(false);
                              setCategoryPopoverOpen(false);
                            }
                          }}
                          disabled={!newCategoryInput.trim()}
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
                          {uniqueCategoryValues.map((catVal) => (
                            <CommandItem
                              key={catVal}
                              value={catVal}
                              onSelect={() => {
                                setNewCategory(catVal);
                                setCategoryPopoverOpen(false);
                              }}
                            >
                              {catVal}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                      <div className="border-t p-1">
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                          onClick={() => setAddingNewCategory(true)}
                        >
                          <Plus className="h-4 w-4" />
                          Add new category
                        </button>
                      </div>
                    </Command>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={cancelAddNew}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleAddNew}
                disabled={creating || !newSupplierName.trim() || !newCategory.trim()}
              >
                {creating ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </div>
        ) : (
          <Command>
            <CommandInput placeholder="Search supplier..." />
            <CommandList>
              <CommandEmpty>No supplier found.</CommandEmpty>
              <CommandGroup>
                {categories.map((cat) => (
                  <CommandItem
                    key={cat.id}
                    value={cat.name}
                    onSelect={() => {
                      onSelect(cat.id);
                      setOpen(false);
                    }}
                  >
                    {cat.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="border-t p-1">
              <button
                className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => setAddingNew(true)}
              >
                <Plus className="h-4 w-4" />
                Add new supplier
              </button>
            </div>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}
