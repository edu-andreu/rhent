import { Label } from "../ui/label";
import { Copy, Sparkles } from "lucide-react";
import type { AddMode } from "./types";

interface AddDressModeSelectionProps {
  addMode: AddMode;
  onModeChange: (mode: AddMode) => void;
  editDress: boolean;
}

export function AddDressModeSelection({ addMode, onModeChange, editDress }: AddDressModeSelectionProps) {
  if (editDress) return null;

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">Item Type</Label>
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-lg">
        <button
          type="button"
          onClick={() => onModeChange("variant")}
          className={`relative flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium text-sm transition-all duration-200 ${
            addMode === "variant" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Copy className="w-4 h-4" />
          <span>Add Variant</span>
        </button>
        <button
          type="button"
          onClick={() => onModeChange("unique")}
          className={`relative flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium text-sm transition-all duration-200 ${
            addMode === "unique" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Create Unique</span>
        </button>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {addMode === "variant"
          ? "Add a variant (different size/color) of an existing item or create a duplicate"
          : "Create a completely new item with AI-generated unique name"}
      </p>
    </div>
  );
}
