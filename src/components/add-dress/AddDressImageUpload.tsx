import { Button } from "../ui/button";
import { Upload, Image as ImageIcon, X } from "lucide-react";

interface AddDressImageUploadProps {
  imagePreview: string;
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}

export function AddDressImageUpload({
  imagePreview,
  isDragging,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onRemoveImage,
}: AddDressImageUploadProps) {

  return (
    <div className="col-span-2">
      <label className="mb-1 block text-sm font-medium">Image</label>
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging ? "border-primary bg-primary/10" : "border-border"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {imagePreview ? (
          <div className="relative">
            <div className="w-full h-32 rounded-lg overflow-hidden" style={{ backgroundColor: "#D8DAD5" }}>
              <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={onRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">Drag and drop an image here, or click to select</p>
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Select Image
            </Button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelect} />
      </div>
    </div>
  );
}
