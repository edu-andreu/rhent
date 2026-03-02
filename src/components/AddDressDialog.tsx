import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import { Dress } from "../types";
import { AddDressModeSelection } from "./add-dress/AddDressModeSelection";
import { AddDressSaleTypeSelection } from "./add-dress/AddDressSaleTypeSelection";
import { AddDressImageUpload } from "./add-dress/AddDressImageUpload";
import { AddDressFormFields } from "./add-dress/AddDressFormFields";
import { useAddDressForm } from "./add-dress/hooks/useAddDressForm";

interface AddDressDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (dress: Omit<Dress, 'id'>) => void;
  editDress?: Dress;
}

export function AddDressDialog({ open, onClose, onAdd, editDress }: AddDressDialogProps) {
  const hook = useAddDressForm({ open, editDress, onAdd, onClose });

  return (
    <Dialog open={open} onOpenChange={hook.handleClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-labelledby="add-dress-dialog-title"
        aria-describedby={editDress ? "add-dress-dialog-description-edit" : "add-dress-dialog-description"}
      >
        <DialogHeader>
          <DialogTitle id="add-dress-dialog-title">{editDress ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          {editDress ? (
            <DialogDescription id="add-dress-dialog-description-edit">
              Update the item information below. All required fields are marked with an asterisk (*).
            </DialogDescription>
          ) : (
            <DialogDescription id="add-dress-dialog-description">
              Add a new item to your inventory. Choose between adding a unique item or a variant/duplicate of an existing item. All required fields are marked with an asterisk (*).
            </DialogDescription>
          )}
        </DialogHeader>

        {hook.loadingItemDetails ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading item details...</div>
          </div>
        ) : (
          <form onSubmit={hook.handleSubmit} className="space-y-4">
            <AddDressModeSelection addMode={hook.addMode} onModeChange={hook.setAddMode} editDress={!!editDress} />
            <AddDressSaleTypeSelection saleType={hook.saleType} onSaleTypeChange={hook.setSaleType} />

            <AddDressFormFields
              addMode={hook.addMode}
              saleType={hook.saleType}
              formData={hook.formData}
              editDress={!!editDress}
              categories={hook.categories}
              subcategories={hook.subcategories}
              brands={hook.brands}
              sizes={hook.sizes}
              names={hook.names}
              locations={hook.locations}
              customNameInput={hook.customNameInput}
              nameValidation={hook.nameValidation}
              generatingName={hook.generatingName}
              checkingUniqueness={hook.checkingUniqueness}
              onFormDataChange={(updates) => hook.setFormData((prev) => ({ ...prev, ...updates }))}
              onCustomNameInputChange={hook.setCustomNameInput}
              onGenerateUniqueName={hook.generateUniqueName}
              shouldDisableField={hook.shouldDisableField}
            />

            <AddDressImageUpload
              imagePreview={hook.imagePreview}
              isDragging={hook.isDragging}
              fileInputRef={hook.fileInputRef}
              onDragOver={hook.handleDragOver}
              onDragLeave={hook.handleDragLeave}
              onDrop={hook.handleDrop}
              onFileSelect={hook.handleFileSelect}
              onRemoveImage={hook.removeImage}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={hook.handleClose}
                disabled={hook.loading}
                aria-label="Cancel and close dialog"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={hook.loading}
                aria-busy={hook.loading}
                aria-label={hook.loading ? (editDress ? "Updating item" : "Adding item") : editDress ? "Update item" : "Add item"}
              >
                {hook.loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    {editDress ? "Updating..." : "Adding..."}
                  </>
                ) : editDress ? (
                  "Update Item"
                ) : (
                  "Add Item"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
