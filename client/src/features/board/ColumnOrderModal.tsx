import { useState } from "react";
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useReorderColumns } from "@/hooks/board/useReorderColumns";
import { apiError } from "@/lib/apiError";
import type { BoardColumn } from "@/types";
function ColumnOrderRow({column,index,total,disabled,move}:{column:BoardColumn;index:number;total:number;disabled:boolean;move:(from:number,to:number)=>void}) {
  const {attributes,listeners,setNodeRef,setActivatorNodeRef,transform,transition,isDragging} = useSortable({id:column.id,disabled});
  return <li ref={setNodeRef} style={{transform:CSS.Transform.toString(transform),transition}} className={"flex items-center gap-3 rounded-xl border border-border bg-card p-2 " + (isDragging?"relative z-10 shadow-xl ring-2 ring-primary/40":"")}>
    <Button ref={setActivatorNodeRef} type="button" variant="ghost" size="icon" className="touch-none cursor-grab active:cursor-grabbing" disabled={disabled} {...attributes} {...listeners} aria-label={"Drag column: "+column.name}><GripVertical size={16}/></Button>
    <span className="min-w-0 flex-1 text-sm font-medium break-words">{column.name}</span>
    <Button type="button" size="icon" variant="ghost" disabled={disabled || index===0} aria-label={"Move "+column.name+" earlier"} onClick={()=>move(index,index-1)}><ArrowUp size={16}/></Button>
    <Button type="button" size="icon" variant="ghost" disabled={disabled || index===total-1} aria-label={"Move "+column.name+" later"} onClick={()=>move(index,index+1)}><ArrowDown size={16}/></Button>
  </li>;
}
export function ColumnOrderModal({columns,boardId,projectId,onClose}:{columns:BoardColumn[];boardId:string;projectId:string;onClose:()=>void}) {
  const [draft,setDraft] = useState(() => [...columns]);
  const reorder = useReorderColumns(projectId,boardId);
  const sensors = useSensors(useSensor(PointerSensor,{activationConstraint:{distance:6}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
  const move = (from:number,to:number) => setDraft(current=>arrayMove(current,from,to));
  const dragEnd = ({active,over}:DragEndEvent) => { if(over && active.id!==over.id) { const from=draft.findIndex(c=>c.id===active.id),to=draft.findIndex(c=>c.id===over.id); if(from>=0 && to>=0) move(from,to); }};
  const close = () => {if(!reorder.isPending)onClose();};
  const changed = draft.some((column,index)=>column.id!==columns[index]?.id);
  return <Modal isOpen title="Reorder columns" onClose={close} size="lg" description="Drag a handle or use the arrows. Top to bottom becomes left to right on the board.">
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
        <SortableContext items={draft.map(c=>c.id)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2" aria-label="Column order">{draft.map((column,index)=><ColumnOrderRow key={column.id} column={column} index={index} total={draft.length} disabled={reorder.isPending} move={move}/>)}</ol>
        </SortableContext>
      </DndContext>
      {reorder.error && <p role="alert" className="text-sm text-danger">{apiError(reorder.error)}</p>}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" disabled={reorder.isPending} onClick={close}>Cancel</Button>
        <Button size="sm" disabled={!changed} isLoading={reorder.isPending} onClick={()=>reorder.mutate(draft.map(c=>c.id),{onSuccess:onClose})}>Save order</Button>
      </div>
    </div>
  </Modal>;
}
