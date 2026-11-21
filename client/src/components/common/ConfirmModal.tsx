import { tr, useUiLocale } from "@/i18n";
import { Modal, Button } from '@/components/ui';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  error?: string;
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = tr('Confirm'),
  isDestructive = false,
  isLoading = false,
  error,
}: ConfirmModalProps) => {
  useUiLocale();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} size="sm">
      {error && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <div data-dialog-actions className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>{tr("Cancel")}</Button>
        <Button
          variant={isDestructive ? 'danger' : 'primary'}
          size="sm"
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};
