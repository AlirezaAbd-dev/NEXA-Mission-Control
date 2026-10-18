import type { Card } from "@/types";
export interface CardDropTarget {
  columnId: string;
  laneId?: string;
  beforeId: string | null;
  position: number;
}
export function cardDropTarget(cards: Pick<Card,"id"|"column_id"|"position">[], activeId: string, columnId: string, overCardId: string | null, after: boolean, laneId?: string): CardDropTarget | null {
  const destination = cards.filter(card => card.column_id === columnId && card.id !== activeId).sort((a,b)=>a.position-b.position);
  let index = overCardId ? destination.findIndex(card=>card.id===overCardId) : destination.length;
  if (index < 0) return null;
  if(overCardId && after) index++;
  const previous = destination[index-1]?.position, next = destination[index]?.position;
  const position = previous !== undefined && next !== undefined ? (previous+next)/2 : previous !== undefined ? previous+65536 : next !== undefined ? next-65536 : 65536;
  return {columnId,laneId,beforeId:destination[index]?.id || null,position};
}

export function applyCardPlacement<T extends Pick<Card,"id"|"column_id"|"position">>(cards:T[],id:string,columnId:string,beforeId:string|null):T[] {
  const target=cardDropTarget(cards,id,columnId,beforeId,false);
  if(!target)return cards;
  const destination=cards.filter(card=>card.column_id===columnId && card.id!==id).sort((a,b)=>a.position-b.position);
  const index=beforeId ? destination.findIndex(card=>card.id===beforeId) : destination.length;
  const previous=destination[index-1]?.position,next=destination[index]?.position;
  const rebalance=(previous!==undefined && target.position<=previous) || (next!==undefined && target.position>=next) || !Number.isFinite(target.position);
  if(rebalance) {
    const moved=cards.find(card=>card.id===id);
    if(!moved)return cards;
    destination.splice(index,0,moved);
    const positions=new Map(destination.map((card,index)=>[card.id,(index+1)*1000]));
    return cards.map(card=>positions.has(card.id)?{...card,column_id:columnId,position:positions.get(card.id)!}:card);
  }
  return cards.map(card=>card.id===id?{...card,column_id:columnId,position:target.position}:card);
}
