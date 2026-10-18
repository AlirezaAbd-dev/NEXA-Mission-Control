import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useUpdateColumn } from "@/hooks/board/useUpdateColumn";
import { apiError } from "@/lib/apiError";
import type { BoardColumn } from "@/types";
export function ColumnRenameModal({column,projectId,onClose}:{column:BoardColumn;projectId:string;onClose:()=>void}) {
  const [name,setName] = useState(column.name);
  const update = useUpdateColumn(projectId);
  const close = () => { if (!update.isPending) onClose(); };
  return <Modal isOpen onClose={close} title="Rename column" size="sm">
    <form className="space-y-4" onSubmit={event => {event.preventDefault(); if(name.trim()) update.mutate({columnId:column.id,name:name.trim()},{onSuccess:onClose});}}>
      <Input label="Column name" value={name} maxLength={50} autoFocus disabled={update.isPending} onChange={event=>setName(event.target.value)} />
      {update.error && <p role="alert" className="text-sm text-danger">{apiError(update.error)}</p>}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={close} disabled={update.isPending}>Cancel</Button>
        <Button size="sm" type="submit" disabled={!name.trim()} isLoading={update.isPending}>Save name</Button>
      </div>
    </form>
  </Modal>;
}
