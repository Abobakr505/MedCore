import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "تأكيد",
  danger = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center gap-3">
        <div className={`rounded-full p-3 ${danger ? "bg-red-50" : "bg-brand-50"}`}>
          <AlertTriangle className={`w-6 h-6 ${danger ? "text-red-500" : "text-brand-500"}`} />
        </div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
        <div className="flex w-full gap-3 mt-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            إلغاء
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            className="flex-1"
            isLoading={isLoading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
