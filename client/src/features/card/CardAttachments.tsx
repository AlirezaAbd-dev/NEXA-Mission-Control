import React, { useRef } from 'react';
import { Paperclip, Upload, Trash2, Image, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useUpdateCard } from '@/hooks/card/useUpdateCard';
import apiClient from '@/lib/api/client';
import type { Card } from '@/types';

interface CardAttachmentsProps {
  card: Card;
  projectId: string;
}

export const CardAttachments: React.FC<CardAttachmentsProps> = ({ card, projectId }) => {
  const [isUploading, setIsUploading] = React.useState(false);
  const [deleteCoverConfirmOpen, setDeleteCoverConfirmOpen] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateCard = useUpdateCard(projectId);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post<{ url: string; filename: string }>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // If image, automatically offer setting as cover
      if (file.type.startsWith('image/')) {
        updateCard.mutate({
          id: card.id,
          cover_url: res.data.url,
        });
      }
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveCover = () => {
    updateCard.mutate(
      {
        id: card.id,
        cover_url: '',
      },
      {
        onSuccess: () => setDeleteCoverConfirmOpen(false),
      }
    );
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Paperclip className="w-4 h-4 text-teal-500" />
            <span>Attachments & Media</span>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploading}
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              Attach File
            </Button>
          </div>
        </div>

        {card.cover_url && !card.cover_url.startsWith('#') && (
          <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-[#183035] bg-slate-50 dark:bg-[#091316]">
            <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-[#132428] shrink-0">
              <img
                src={card.cover_url}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                <Image className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <span className="truncate">Card Cover Image</span>
              </div>
              <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                Active Cover
              </span>
            </div>

            <div className="flex items-center gap-1">
              <a
                href={card.cover_url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#132428]"
                title="View image"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setDeleteCoverConfirmOpen(true)}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-[#132428]"
                title="Remove cover"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteCoverConfirmOpen}
        onClose={() => setDeleteCoverConfirmOpen(false)}
        onConfirm={handleRemoveCover}
        title="Remove cover image?"
        description="Are you sure you want to remove the cover from this card?"
        confirmLabel="Remove Cover"
        isDestructive={true}
        isLoading={updateCard.isPending}
      />
    </>
  );
};
