import { useState, useEffect } from "react";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { X, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Check } from "lucide-react";
import { getFunction } from "../shared/api/client";
import { handleApiError } from "../shared/utils/errorHandler";
import { toast } from "sonner@2.0.3";

interface ColorMultiSelectProps {
  value: string[]; // Array of selected color IDs
  onChange: (colors: string[]) => void;
  required?: boolean;
  disabled?: boolean;
}

interface Color {
  id: string;
  color: string;
  status: string;
}

export function ColorMultiSelect({ value, onChange, required = false, disabled = false }: ColorMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [colors, setColors] = useState<Color[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchColors();
  }, []);

  const fetchColors = async () => {
    setLoading(true);
    try {
      const data = await getFunction<{ colors?: Color[] }>("colors");
      setColors(data.colors || []);
    } catch (error) {
      handleApiError(error, "colors");
      setColors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleColor = (colorId: string) => {
    if (value.includes(colorId)) {
      onChange(value.filter((c) => c !== colorId));
    } else {
      onChange([...value, colorId]);
    }
  };

  const handleRemoveColor = (colorId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(value.filter((c) => c !== colorId));
    return false;
  };

  const filteredColors = colors.filter((color) => {
    if (!searchQuery) return false;
    return color.color.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-2">
      <Label htmlFor="colors" className="mb-1">
        Colors {required && "*"}
      </Label>

      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[40px] py-2"
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1.5 flex-1">
              {value.length === 0 ? (
                <span className="text-muted-foreground">Select colors...</span>
              ) : (
                value.map((colorId) => {
                  const color = colors.find(c => c.id === colorId);
                  return color ? (
                    <Badge
                      key={colorId}
                      variant="secondary"
                      className="px-2 py-0.5 text-xs font-normal pointer-events-none"
                    >
                      {color.color}
                      <span
                        className="ml-1.5 pointer-events-auto inline-flex"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveColor(colorId, e);
                        }}
                      >
                        <X className="h-3 w-3 cursor-pointer hover:text-destructive" />
                      </span>
                    </Badge>
                  ) : null;
                })
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Search colors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading colors...
              </div>
            ) : filteredColors.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No colors found
              </div>
            ) : (
              <div className="p-1">
                {filteredColors.map((color) => {
                  const isSelected = value.includes(color.id);
                  return (
                    <div
                      key={color.id}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      onClick={() => handleToggleColor(color.id)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className="h-4 w-4 rounded-full border border-gray-300 bg-white flex items-center justify-center">
                          {isSelected && (
                            <Check className="h-3 w-3 text-primary" />
                          )}
                        </div>
                        <span>{color.color}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
