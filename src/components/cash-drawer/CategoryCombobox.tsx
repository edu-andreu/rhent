import React, { useState } from "react";
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
  onAddNew: (name: string) => Promise<TransactionCategory | null>;
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
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedCategory = categories.find(c => c.id === selectedId);

  const handleAddNew = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const created = await onAddNew(newName.trim());
    if (created) {
      onSelect(created.id);
      setNewName('');
      setAddingNew(false);
      setOpen(false);
    }
    setCreating(false);
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
          {selectedCategory ? selectedCategory.name : "Select category..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {addingNew ? (
          <div className="p-3 space-y-2">
            <p className="text-sm font-medium">New {direction === 'in' ? 'Cash In' : 'Cash Out'} Category</p>
            <Input
              placeholder="Category name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddNew();
                if (e.key === 'Escape') { setAddingNew(false); setNewName(''); }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => { setAddingNew(false); setNewName(''); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleAddNew}
                disabled={creating || !newName.trim()}
              >
                {creating ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </div>
        ) : (
          <Command>
            <CommandInput placeholder="Search category..." />
            <CommandList>
              <CommandEmpty>No category found.</CommandEmpty>
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
                Add new category
              </button>
            </div>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}
