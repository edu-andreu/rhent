import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../test/utils/renderWithProviders";
import { AddDressDialog } from "../AddDressDialog";

const mockOnClose = vi.fn();
const mockOnAdd = vi.fn();

vi.mock("../add-dress/hooks/useAddDressForm", () => ({
  useAddDressForm: vi.fn(),
}));

import { useAddDressForm } from "../add-dress/hooks/useAddDressForm";

const defaultHookReturn = {
  loadingItemDetails: false,
  addMode: "variant" as const,
  setAddMode: vi.fn(),
  saleType: "rent" as const,
  setSaleType: vi.fn(),
  formData: {},
  setFormData: vi.fn(),
  categories: [],
  subcategories: [],
  brands: [],
  sizes: [],
  names: [],
  locations: [],
  customNameInput: "",
  setCustomNameInput: vi.fn(),
  nameValidation: null,
  generatingName: false,
  checkingUniqueness: false,
  onFormDataChange: vi.fn(),
  onCustomNameInputChange: vi.fn(),
  generateUniqueName: vi.fn(),
  shouldDisableField: () => false,
  imagePreview: "",
  isDragging: false,
  fileInputRef: { current: null },
  handleDragOver: vi.fn(),
  handleDragLeave: vi.fn(),
  handleDrop: vi.fn(),
  handleFileSelect: vi.fn(),
  removeImage: vi.fn(),
  handleSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
  handleClose: vi.fn(),
  loading: false,
};

describe("AddDressDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAddDressForm).mockReturnValue(defaultHookReturn as ReturnType<typeof useAddDressForm>);
  });

  it("should render dialog with Add New Item title when open and not editing", () => {
    render(
      <AddDressDialog open={true} onClose={mockOnClose} onAdd={mockOnAdd} />
    );
    expect(screen.getByRole("dialog", { name: /add new item/i })).toBeInTheDocument();
    expect(screen.getByText("Add New Item")).toBeInTheDocument();
  });

  it("should render dialog with Edit Item title when open and editDress provided", () => {
    const editDress = {
      id: "1",
      name: "Dress",
      description: "",
      size: "M",
      colors: ["Red"],
      pricePerDay: 10000,
      imageUrl: "",
      category: "Formal",
      available: true,
    };
    render(
      <AddDressDialog open={true} onClose={mockOnClose} onAdd={mockOnAdd} editDress={editDress} />
    );
    expect(screen.getByText("Edit Item")).toBeInTheDocument();
  });

  it("should render Sale Type and form when not loading item details", () => {
    render(
      <AddDressDialog open={true} onClose={mockOnClose} onAdd={mockOnAdd} />
    );
    expect(screen.getByText("Sale Type")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rent/i })).toBeInTheDocument();
  });
});
