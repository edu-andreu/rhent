import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { getFunction, postFunction } from "../../shared/api/client";
import { handleApiError } from "../../shared/utils/errorHandler";
import { formatPriceRounded } from "../../shared/format/formatPrice";

interface CategoryPriceStat {
  id: string;
  category: string;
  min_price: number | null;
  max_price: number | null;
  avg_price: number | null;
}

export function PricesTab() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/449c6984-1ec0-466d-b72a-98a32a359bcc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hypothesisId:'H1',location:'PricesTab.tsx:entry',message:'PricesTab rendering',data:{},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const [categoryStats, setCategoryStats] = useState<CategoryPriceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  
  // Update prices dialog state
  const [updateCategory, setUpdateCategory] = useState("All");
  const [updatePercentage, setUpdatePercentage] = useState("10");
  const [applyingPriceUpdate, setApplyingPriceUpdate] = useState(false);

  // Fetch category price statistics from server
  useEffect(() => {
    fetchCategoryPriceStats();
  }, []);

  const fetchCategoryPriceStats = async () => {
    setLoading(true);
    try {
      const data = await getFunction<any>("category-price-stats");
      setCategoryStats(data.categoryStats);
    } catch (error) {
      handleApiError(error, "category price statistics");
    } finally {
      setLoading(false);
    }
  };

  const filteredStats = selectedCategory === "All"
    ? categoryStats
    : categoryStats.filter(s => s.category === selectedCategory);

  // Get unique categories for the filter dropdown
  const categories = ["All", ...categoryStats.map(s => s.category)];

  const handleOpenUpdateDialog = () => {
    setUpdateCategory("All");
    setUpdatePercentage("10");
    setIsUpdateDialogOpen(true);
  };

  const handleApplyPriceUpdate = async () => {
    try {
      setApplyingPriceUpdate(true);
      const percentage = parseFloat(updatePercentage) / 100;
      const categoryIds = updateCategory === "All"
        ? categoryStats.map(s => s.id)
        : categoryStats.filter(s => s.category === updateCategory).map(s => s.id);

      const data = await postFunction<any>("update-inventory-prices", {
        categoryIds,
        percentage,
      });
      
      setIsUpdateDialogOpen(false);
      toast.success(`Successfully updated ${data.updatedCount} items`);
      
      // Refresh the stats
      fetchCategoryPriceStats();
    } catch (error) {
      handleApiError(error, "prices", "Failed to update prices");
    } finally {
      setApplyingPriceUpdate(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Filter and Actions */}
      <div className="flex items-center justify-between">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button onClick={handleOpenUpdateDialog}>
            Update Prices
          </Button>
          <Button variant="outline" onClick={fetchCategoryPriceStats}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Category Price Statistics Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Min</TableHead>
              <TableHead className="text-right">Max</TableHead>
              <TableHead className="text-right">Average</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredStats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No categories found
                </TableCell>
              </TableRow>
            ) : (
              filteredStats.map((stat) => (
                <TableRow key={stat.id}>
                  <TableCell className="font-medium">{stat.category}</TableCell>
                  <TableCell className="text-right">{formatPriceRounded(stat.min_price)}</TableCell>
                  <TableCell className="text-right">{formatPriceRounded(stat.max_price)}</TableCell>
                  <TableCell className="text-right">{formatPriceRounded(stat.avg_price)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Update Prices Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Update Prices</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={updateCategory} onValueChange={setUpdateCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Adjustment percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={updatePercentage}
                    onChange={(e) => setUpdatePercentage(e.target.value)}
                    className="flex-1"
                  />
                  <span>%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use negative numbers to reduce prices. This will update all inventory items in the selected category.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={applyingPriceUpdate} onClick={() => setIsUpdateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApplyPriceUpdate} disabled={applyingPriceUpdate} aria-busy={applyingPriceUpdate}>
                {applyingPriceUpdate ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Apply Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
