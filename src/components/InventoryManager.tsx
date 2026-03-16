import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Package, Search, Filter } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Dress } from "../types";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface InventoryManagerProps {
  dresses: Dress[];
  onEdit: (dress: Dress) => void;
  onDelete: (dressId: string) => void;
  onAddNew: () => void;
}

export function InventoryManager({ dresses, onEdit, onDelete, onAddNew }: InventoryManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dressToDelete, setDressToDelete] = useState<Dress | null>(null);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(dresses.map(d => d.category)))],
    [dresses],
  );

  const removeAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filteredDresses = useMemo(() => dresses.filter(dress => {
    const normalizedQuery = removeAccents(searchQuery.toLowerCase());
    const matchesSearch = removeAccents(dress.name.toLowerCase()).includes(normalizedQuery) ||
                         removeAccents(dress.description.toLowerCase()).includes(normalizedQuery) ||
                         dress.colors.some(color => removeAccents(color.toLowerCase()).includes(normalizedQuery));
    const matchesCategory = categoryFilter === 'all' || dress.category === categoryFilter;
    const matchesAvailability = availabilityFilter === 'all' || 
                               (availabilityFilter === 'available' && dress.available) ||
                               (availabilityFilter === 'unavailable' && !dress.available);
    
    return matchesSearch && matchesCategory && matchesAvailability;
  }), [dresses, searchQuery, categoryFilter, availabilityFilter]);

  const handleDeleteClick = (dress: Dress) => {
    setDressToDelete(dress);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (dressToDelete) {
      onDelete(dressToDelete.id);
      setDeleteDialogOpen(false);
      setDressToDelete(null);
    }
  };

  const stats = useMemo(() => ({
    total: dresses.length,
    available: dresses.filter(d => d.available).length,
    rented: dresses.filter(d => !d.available).length,
  }), [dresses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div></div>
        <Button onClick={onAddNew} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Add New
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Total Dresses</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Available</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl text-green-600">{stats.available}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Currently Rented</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl text-orange-600">{stats.rented}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search dresses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Rented</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dress List */}
      {filteredDresses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="mb-2">No dresses found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== 'all' || availabilityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Start by adding your first dress to the inventory'}
            </p>
            <Button onClick={onAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add New
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDresses.map((dress) => (
            <Card key={dress.id} className="overflow-hidden">
              <CardHeader className="p-0">
                <div className="relative h-48">
                  <ImageWithFallback
                    src={dress.imageUrl}
                    alt={dress.name}
                    className="w-full h-full object-cover"
                  />
                  <Badge 
                    variant={dress.available ? 'default' : 'secondary'}
                    className="absolute top-2 right-2"
                  >
                    {dress.available ? 'Available' : 'Rented'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <h3 className="mb-2">{dress.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {dress.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline">{dress.category}</Badge>
                  <Badge variant="outline">Size {dress.size}</Badge>
                  {dress.colors.map((color, idx) => (
                    <Badge key={idx} variant="outline">{color}</Badge>
                  ))}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl">${dress.pricePerDay}</span>
                  <span className="text-sm text-muted-foreground">/day</span>
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => onEdit(dress)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => handleDeleteClick(dress)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{dressToDelete?.name}" from your inventory.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}