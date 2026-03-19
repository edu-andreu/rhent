import { useState, useRef, useEffect } from "react";
import { toast } from "sonner@2.0.3";
import { buildStorageUrl } from "../../../shared/config/env";
import { getFunction, postFunction, putFunction } from "../../../shared/api/client";
import { handleApiError } from "../../../shared/utils/errorHandler";
import { ApiItemDataResponse, ApiItemDetailsResponse, ApiNameResponse } from "../../../types/api";
import type { AddMode, SaleType, ItemDetails, AddDressFormData } from "../types";
import type { Dress } from "../../../types";

interface UseAddDressFormProps {
  open: boolean;
  editDress?: Dress;
  onAdd: (dress: Omit<Dress, "id">) => void;
  onClose: () => void;
}

export function useAddDressForm({ open, editDress, onAdd, onClose }: UseAddDressFormProps) {
  const [addMode, setAddMode] = useState<AddMode>("variant");
  const [saleType, setSaleType] = useState<SaleType>("rent");
  const [formData, setFormData] = useState<AddDressFormData>({
    name: "",
    nameId: "",
    description: "",
    categoryId: "",
    subcategoryId: "",
    brandId: "",
    sizeId: "",
    colorIds: [],
    pricePerDay: "",
    imageUrl: "",
    locationId: "",
    stockQuantity: "",
    lowStockThreshold: "",
  });

  const [imagePreview, setImagePreview] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImageFile = useRef<File | null>(null);

  const [categories, setCategories] = useState<Array<{ id: string; category: string; default_image?: string }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; subcategory: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: string; brand: string }>>([]);
  const [sizes, setSizes] = useState<Array<{ id: string; size: string }>>([]);
  const [names, setNames] = useState<Array<{ id: string; name: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; location: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [loadingItemDetails, setLoadingItemDetails] = useState(false);
  const [generatingName, setGeneratingName] = useState(false);
  const [checkingUniqueness, setCheckingUniqueness] = useState(false);
  const [nameValidation, setNameValidation] = useState<{ isValid: boolean; message: string } | null>(null);
  const [customNameInput, setCustomNameInput] = useState("");

  const validationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (open && editDress?.id) {
      fetchItemDetails(editDress.id);
    } else if (open && !editDress) {
      resetForm();
    }
  }, [open, editDress?.id]);

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchSubcategories();
      fetchBrands();
      fetchSizes();
      fetchNames();
      fetchLocations();
    }
  }, [open]);

  useEffect(() => {
    if (editDress) return; // In edit mode, preserve the item's existing image
    if (formData.categoryId && categories.length > 0) {
      const isCurrentImageCategoryDefault = imagePreview && imagePreview.includes("/storage/v1/object/public/photos/");
      const hasCustomImageInSession = pendingImageFile.current !== null;

      if (!hasCustomImageInSession && (!imagePreview || isCurrentImageCategoryDefault)) {
        const selectedCategory = categories.find((c) => c.id === formData.categoryId);
        if (selectedCategory?.default_image) {
          const defaultImageUrl = buildStorageUrl("photos", selectedCategory.default_image);
          setImagePreview(defaultImageUrl);
          setFormData((prev) => ({ ...prev, imageUrl: defaultImageUrl }));
        } else {
          setImagePreview("");
          setFormData((prev) => ({ ...prev, imageUrl: "" }));
        }
      }
    }
  }, [formData.categoryId, categories]);

  useEffect(() => {
    if (open && addMode === "unique" && !editDress && names.length > 0 && !customNameInput) {
      generateUniqueName();
    }
  }, [addMode, open, editDress, names.length]);

  useEffect(() => {
    if (addMode === "unique" && customNameInput.trim() !== "" && !editDress) {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
      validationTimerRef.current = window.setTimeout(() => {
        checkNameUniqueness(customNameInput.trim());
      }, 300);
    } else {
      setNameValidation(null);
    }
    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, [customNameInput, addMode, editDress]);

  useEffect(() => {
    if (addMode === "variant" && formData.nameId && !editDress) {
      fetchItemDataByName(formData.nameId);
    }
  }, [addMode, formData.nameId, editDress]);

  const generateUniqueName = async () => {
    try {
      setGeneratingName(true);
      setNameValidation(null);
      const data = await postFunction<ApiNameResponse>("names/generate-unique");
      if (data.suggestedName) {
        setCustomNameInput(data.suggestedName);
        setNameValidation({ isValid: true, message: "This name is unique and available" });
      }
    } catch (error) {
      handleApiError(error, "name generation", "Failed to generate name. Please enter manually.");
    } finally {
      setGeneratingName(false);
    }
  };

  const checkNameUniqueness = async (name: string) => {
    try {
      setCheckingUniqueness(true);
      const data = await postFunction<ApiNameResponse>("names/check-unique", { name });
      if (data.isUnique) {
        setNameValidation({ isValid: true, message: "This name is unique and available" });
      } else {
        setNameValidation({
          isValid: false,
          message: "This name already exists. Please choose a different name or select \"Add Variant/Duplicate\" above.",
        });
      }
    } catch (error) {
      handleApiError(error, "name uniqueness check");
      setNameValidation(null);
    } finally {
      setCheckingUniqueness(false);
    }
  };

  const fetchItemDataByName = async (nameId: string) => {
    try {
      setLoading(true);
      const data = await postFunction<ApiItemDataResponse>("names/get-item-data", { nameId });
      if (!data.itemData) {
        throw new Error("No item data returned from server");
      }
      const itemData = data.itemData;
      setFormData((prev) => ({
        ...prev,
        categoryId: itemData.category_id || "",
        subcategoryId: itemData.subcategory_id || "",
        brandId: itemData.brand_id || "",
        pricePerDay: itemData.price?.toString() || "",
        imageUrl: itemData.image_url || "",
        description: itemData.description || "",
        sizeId: "",
        colorIds: [],
        locationId: "",
      }));
      setImagePreview(itemData.image_url || "");
      toast.success("Item data loaded. Please select size, colors, and status.");
    } catch (error) {
      handleApiError(error, "item data");
    } finally {
      setLoading(false);
    }
  };

  const fetchItemDetails = async (itemId: string) => {
    try {
      setLoadingItemDetails(true);
      const data = await getFunction<ApiItemDetailsResponse>(`inventory-items/${itemId}`);
      const item = data.item as ItemDetails;

      if (item.isForSale) {
        setSaleType(item.isStockTracked ? "product" : "service");
      } else {
        setSaleType("rent");
      }

      setFormData({
        name: item.name || "",
        nameId: item.nameId || "",
        description: item.description || "",
        categoryId: item.categoryId || "",
        subcategoryId: item.subcategoryId || "",
        brandId: item.brandId || "",
        sizeId: item.sizeId || "",
        colorIds: item.colors?.map((c) => c.id) || [],
        pricePerDay: (item.isForSale ? (item.salePrice ?? item.pricePerDay) : item.pricePerDay)?.toString() || "",
        imageUrl: item.imageUrl || "",
        locationId: item.locationId || "",
        stockQuantity: item.stockQuantity?.toString() || "",
        lowStockThreshold: item.lowStockThreshold?.toString() || "",
      });
      setImagePreview(item.imageUrl || "");
    } catch (error) {
      handleApiError(error, "item details");
    } finally {
      setLoadingItemDetails(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getFunction<Record<string, any>>("categories");
      setCategories(data.categories || []);
    } catch (error) {
      handleApiError(error, "categories");
    }
  };

  const fetchSubcategories = async () => {
    try {
      const data = await getFunction<Record<string, any>>("subcategories");
      setSubcategories(data.subcategories || []);
    } catch (error) {
      handleApiError(error, "subcategories");
    }
  };

  const fetchBrands = async () => {
    try {
      const data = await getFunction<Record<string, any>>("brands");
      setBrands(data.brands || []);
    } catch (error) {
      handleApiError(error, "brands");
    }
  };

  const fetchSizes = async () => {
    try {
      const data = await getFunction<Record<string, any>>("sizes");
      setSizes(data.sizes || []);
    } catch (error) {
      handleApiError(error, "sizes");
    }
  };

  const fetchNames = async () => {
    try {
      const data = await getFunction<Record<string, any>>("names");
      setNames(data.names || []);
    } catch (error) {
      handleApiError(error, "names");
    }
  };

  const fetchLocations = async () => {
    try {
      const data = await getFunction<Record<string, any>>("statuses");
      setLocations(data.statuses || []);
    } catch (error) {
      handleApiError(error, "locations");
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadImageForItem = async (itemId: string) => {
    if (!pendingImageFile.current) return;
    try {
      const base64 = await readFileAsBase64(pendingImageFile.current);
      await postFunction("upload-image", { itemId, imageData: base64 });
    } catch (uploadError) {
      console.error("Failed to upload image:", uploadError);
    }
  };

  const buildItemPayload = (isForSale: boolean) => ({
    nameId: formData.nameId,
    categoryId: formData.categoryId,
    subcategoryId: formData.subcategoryId,
    brandId: formData.brandId,
    sizeId: formData.sizeId,
    colorIds: formData.colorIds,
    price: isForSale ? 0 : parseFloat(formData.pricePerDay),
    imageUrl: formData.imageUrl,
    locationId: formData.locationId,
    description: formData.description.toLowerCase(),
    isForSale,
    salePrice: isForSale ? parseFloat(formData.pricePerDay) : null,
    isStockTracked: saleType === "product",
    stockQuantity: saleType === "product" ? (parseInt(formData.stockQuantity) || 0) : 0,
    lowStockThreshold: saleType === "product" ? (parseInt(formData.lowStockThreshold) || 0) : 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missingFields: string[] = [];

    if (!editDress && addMode === "unique") {
      if (!customNameInput.trim()) missingFields.push("Item Name");
      if (nameValidation && !nameValidation.isValid) {
        toast.error("Please fix the name validation error before submitting");
        return;
      }
    } else {
      if (!formData.nameId) missingFields.push("Item Name");
    }

    if (!formData.categoryId) missingFields.push("Category");
    if (!formData.subcategoryId) missingFields.push("Type");
    if (!formData.brandId) missingFields.push("Brand");
    if (!formData.sizeId) missingFields.push("Size");
    if (!formData.locationId) missingFields.push("Status");
    if (!formData.pricePerDay) missingFields.push("Price");
    if (formData.colorIds.length === 0) missingFields.push("Color");

    if (missingFields.length > 0) {
      toast.error(`Please fill in the following required fields: ${missingFields.join(", ")}`);
      return;
    }

    try {
      setLoading(true);
      const isForSale = saleType !== "rent";

      if (editDress?.id) {
        await putFunction<Record<string, any>>(`inventory-items/${editDress.id}`, buildItemPayload(isForSale));
        await uploadImageForItem(editDress.id);
        toast.success("Item updated successfully!");
      } else {
        let finalNameId = formData.nameId;

        if (addMode === "unique") {
          const nameData = await postFunction<Record<string, any>>("names", {
            value: customNameInput.trim(),
          });
          finalNameId = nameData.name.id;
        }

        const data = await postFunction<Record<string, any>>("inventory-items", {
          ...buildItemPayload(isForSale),
          nameId: finalNameId,
        });
        await uploadImageForItem(data.item.id);
        toast.success("Item added successfully!");
      }

      onAdd({} as any);
      handleClose();
    } catch (error) {
      console.error("Error saving item:", error);
      handleApiError(error, "item", "Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAddMode("variant");
    setSaleType("rent");
    setFormData({
      name: "",
      nameId: "",
      description: "",
      categoryId: "",
      subcategoryId: "",
      brandId: "",
      sizeId: "",
      colorIds: [],
      pricePerDay: "",
      imageUrl: "",
      locationId: "",
      stockQuantity: "",
      lowStockThreshold: "",
    });
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImagePreview("");
    pendingImageFile.current = null;
    setCustomNameInput("");
    setNameValidation(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((file) => file.type.startsWith("image/"));
    if (imageFile) selectImage(imageFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectImage(file);
  };

  const selectImage = (file: File) => {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    pendingImageFile.current = file;
    const blobUrl = URL.createObjectURL(file);
    setImagePreview(blobUrl);
    setFormData((prev) => ({ ...prev, imageUrl: blobUrl }));
  };

  const removeImage = () => {
    const hasPendingBlob = pendingImageFile.current !== null;
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    pendingImageFile.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (hasPendingBlob) {
      // User is removing a newly uploaded image → restore to category default
      const selectedCategory = categories.find((c) => c.id === formData.categoryId);
      if (selectedCategory?.default_image) {
        const defaultImageUrl = buildStorageUrl("photos", selectedCategory.default_image);
        setImagePreview(defaultImageUrl);
        setFormData((prev) => ({ ...prev, imageUrl: "" }));
      } else {
        setImagePreview("");
        setFormData((prev) => ({ ...prev, imageUrl: "" }));
      }
    } else {
      // User is removing an existing server image → clear to show upload UI
      setImagePreview("");
      setFormData((prev) => ({ ...prev, imageUrl: "" }));
    }
  };

  const shouldDisableField = (field: string) => {
    if (editDress || addMode === "unique") return false;
    if (addMode === "variant" && formData.nameId) {
      return ["category", "subcategory", "brand"].includes(field);
    }
    return false;
  };

  return {
    addMode,
    setAddMode,
    saleType,
    setSaleType,
    formData,
    setFormData,
    imagePreview,
    isDragging,
    fileInputRef,
    generatingName,
    checkingUniqueness,
    nameValidation,
    customNameInput,
    setCustomNameInput,
    categories,
    subcategories,
    brands,
    sizes,
    names,
    locations,
    loading,
    loadingItemDetails,
    handleSubmit,
    handleClose,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    removeImage,
    shouldDisableField,
    generateUniqueName,
  };
}
