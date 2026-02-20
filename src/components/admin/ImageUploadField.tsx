import { useState, useRef } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";

interface ImageUploadFieldProps {
  label?: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  onRemove?: () => void;
  bucket?: string;
  folder?: string;
}

export default function ImageUploadField({
  label = "Foto",
  currentUrl,
  onUploaded,
  onRemove,
  folder = "products",
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPEG ou WebP.");
      return;
    }

    setUploading(true);
    setPreview(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const { data, error } = await invokeAuth("upload-logo", formData);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        onUploaded(data.url);
        setPreview(data.url);
        toast.success("Imagem enviada!");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar imagem");
      setPreview(currentUrl ?? null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onRemove?.();
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="relative w-16 h-16 rounded-xl border border-dashed border-border bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden flex-shrink-0"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        {preview && !uploading && (
          <button type="button" onClick={handleRemove} className="p-1 rounded-lg hover:bg-destructive/10 transition-colors">
            <X className="w-4 h-4 text-destructive" />
          </button>
        )}
        {!preview && !uploading && (
          <span className="text-[11px] text-muted-foreground">Clique para adicionar</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}
