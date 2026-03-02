import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { ColorMultiSelect } from "../ColorMultiSelect";
import type { AddMode, SaleType, AddDressFormData } from "./types";

interface AddDressFormFieldsProps {
  addMode: AddMode;
  saleType: SaleType;
  formData: AddDressFormData;
  editDress: boolean;
  categories: Array<{ id: string; category: string }>;
  subcategories: Array<{ id: string; subcategory: string }>;
  brands: Array<{ id: string; brand: string }>;
  sizes: Array<{ id: string; size: string }>;
  names: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; location: string }>;
  customNameInput: string;
  nameValidation: { isValid: boolean; message: string } | null;
  generatingName: boolean;
  checkingUniqueness: boolean;
  onFormDataChange: (updates: Partial<AddDressFormData>) => void;
  onCustomNameInputChange: (value: string) => void;
  onGenerateUniqueName: () => void;
  shouldDisableField: (field: string) => boolean;
}

export function AddDressFormFields({
  addMode,
  saleType,
  formData,
  editDress,
  categories,
  subcategories,
  brands,
  sizes,
  names,
  locations,
  customNameInput,
  nameValidation,
  generatingName,
  checkingUniqueness,
  onFormDataChange,
  onCustomNameInputChange,
  onGenerateUniqueName,
  shouldDisableField,
}: AddDressFormFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Item Name Field */}
      <div className="col-span-2">
        <Label htmlFor="name" className="mb-1">
          Item Name *
        </Label>

        {!editDress && addMode === "unique" ? (
          <>
            <div className="relative">
              <Input
                id="name"
                value={customNameInput}
                onChange={(e) => onCustomNameInputChange(e.target.value)}
                placeholder="Enter unique name or click to generate"
                disabled={generatingName}
                aria-required="true"
                aria-invalid={nameValidation && !nameValidation.isValid}
                aria-describedby={nameValidation ? "name-validation" : undefined}
                aria-busy={generatingName || checkingUniqueness}
              />
              {(generatingName || checkingUniqueness) && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onGenerateUniqueName}
              disabled={generatingName}
              className="mt-2"
              aria-busy={generatingName}
              aria-label={generatingName ? "Generating unique name" : "Generate unique name"}
            >
              {generatingName ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" aria-hidden="true" />
                  Generating...
                </>
              ) : (
                "Generate Unique Name"
              )}
            </Button>

            {nameValidation && (
              <Alert
                id="name-validation"
                role="status"
                aria-live="polite"
                className={`mt-2 ${nameValidation.isValid ? "border-green-500 bg-green-50" : "border-destructive bg-destructive/10"}`}
              >
                {nameValidation.isValid ? (
                  <CheckCircle2 className="text-green-600" aria-hidden="true" />
                ) : (
                  <AlertCircle className="text-destructive" aria-hidden="true" />
                )}
                <AlertDescription className={nameValidation.isValid ? "text-green-700" : "text-destructive"}>
                  {nameValidation.message}
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <Select
            value={formData.nameId}
            onValueChange={(value) => {
              const selectedName = names.find((n) => n.id === value);
              onFormDataChange({ nameId: value, name: selectedName?.name || "" });
            }}
          >
            <SelectTrigger id="name">
              <SelectValue placeholder={!editDress && addMode === "variant" ? "Select existing name" : "Select name"} />
            </SelectTrigger>
            <SelectContent>
              {names.length > 0 ? (
                names.map((name) => (
                  <SelectItem key={name.id} value={name.id}>
                    {name.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No names available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      <div>
        <Label htmlFor="category" className="mb-1">
          Category *
        </Label>
        <Select
          value={formData.categoryId}
          onValueChange={(value) => onFormDataChange({ categoryId: value })}
          disabled={shouldDisableField("category")}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.length > 0 ? (
              categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.category}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                No categories available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="subcategory" className="mb-1">
          Type *
        </Label>
        <Select
          value={formData.subcategoryId}
          onValueChange={(value) => onFormDataChange({ subcategoryId: value })}
          disabled={shouldDisableField("subcategory")}
        >
          <SelectTrigger id="subcategory">
            <SelectValue placeholder="Select subcategory" />
          </SelectTrigger>
          <SelectContent>
            {subcategories.length > 0 ? (
              subcategories.map((subcategory) => (
                <SelectItem key={subcategory.id} value={subcategory.id}>
                  {subcategory.subcategory}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                No subcategories available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="brand" className="mb-1">
          Brand *
        </Label>
        <Select
          value={formData.brandId}
          onValueChange={(value) => onFormDataChange({ brandId: value })}
          disabled={shouldDisableField("brand")}
        >
          <SelectTrigger id="brand">
            <SelectValue placeholder="Select brand" />
          </SelectTrigger>
          <SelectContent>
            {brands.length > 0 ? (
              brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.brand}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                No brands available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="size" className="mb-1">
          Size *
        </Label>
        <Select value={formData.sizeId} onValueChange={(value) => onFormDataChange({ sizeId: value })}>
          <SelectTrigger id="size">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            {sizes.length > 0 ? (
              sizes.map((size) => (
                <SelectItem key={size.id} value={size.id}>
                  {size.size}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                No sizes available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-2">
        <ColorMultiSelect value={formData.colorIds || []} onChange={(colorIds) => onFormDataChange({ colorIds })} />
      </div>

      <div className="col-span-2">
        <Label htmlFor="description" className="mb-1">
          Description
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onFormDataChange({ description: e.target.value })}
          placeholder="Enter item description (optional)"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="price" className="mb-1">
          {saleType === "rent" ? "Rental Price ($) *" : "Sale Price ($) *"}
        </Label>
        <Input
          id="price"
          type="number"
          step="1000"
          value={formData.pricePerDay}
          onChange={(e) => onFormDataChange({ pricePerDay: e.target.value })}
          placeholder="0"
        />
        <p className="text-xs text-muted-foreground mt-1">Rounded to the nearest thousand</p>
      </div>

      <div>
        <Label htmlFor="location" className="mb-1">
          Status *
        </Label>
        <Select value={formData.locationId} onValueChange={(value) => onFormDataChange({ locationId: value })}>
          <SelectTrigger id="location">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {locations.length > 0 ? (
              locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.location}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                No statuses available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Stock fields - Only shown for Sale (Product) */}
      {saleType === "product" && (
        <>
          <div>
            <Label htmlFor="stockQuantity" className="mb-1">
              Stock Quantity *
            </Label>
            <Input
              id="stockQuantity"
              type="number"
              min="0"
              step="1"
              value={formData.stockQuantity}
              onChange={(e) => onFormDataChange({ stockQuantity: e.target.value })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">Current available units in stock</p>
          </div>

          <div>
            <Label htmlFor="lowStockThreshold" className="mb-1">
              Min Stock (Low Alert) *
            </Label>
            <Input
              id="lowStockThreshold"
              type="number"
              min="0"
              step="1"
              value={formData.lowStockThreshold}
              onChange={(e) => onFormDataChange({ lowStockThreshold: e.target.value })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">Alert when stock falls below this number</p>
          </div>
        </>
      )}
    </div>
  );
}
