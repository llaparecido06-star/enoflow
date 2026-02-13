import { X, AlertTriangle } from "lucide-react";

interface DeleteConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function DeleteConfirmModal({ title, message, onConfirm, onCancel, loading }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card w-full max-w-sm mx-4 rounded-2xl border border-border animate-scale-in">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 mx-auto mb-3 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="font-display text-lg font-semibold mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="p-4 border-t border-border flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50">
            {loading ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}
