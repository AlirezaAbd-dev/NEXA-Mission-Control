import { CardSubtasks } from "./CardSubtasks";
import { CardNotes } from "./CardNotes";
import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CardHeader } from "./CardHeader";
import { CardDescription } from "./CardDescription";
import { CardChecklists } from "./CardChecklists";
import { CardAttachments } from "./CardAttachments";
import { CardDependencies } from "./CardDependencies";
import { CardActivityStream } from "./CardActivityStream";
import { CardComments } from "./CardComments";
import { CardSidebar } from "./CardSidebar";
import { useCard } from "@/hooks/card/useCard";
import { useBoard } from "@/hooks/board/useBoard";
import { useUiStore } from "@/stores/ui.store";

export const CardDetailModal: React.FC = () => {
  const activeCardId = useUiStore((s) => s.activeCardId);
  const closeCardModal = useUiStore((s) => s.closeCardModal);
  const [activeTab, setActiveTab] = React.useState<"comments" | "activity">(
    "comments",
  );

  const [pane, setPane] = React.useState<"details" | "properties">("details");
  const { data: card, isLoading } = useCard(activeCardId || "");
  const { data: board } = useBoard(card?.project_id || "");

  if (!activeCardId) return null;

  return (
    <Modal
      isOpen={!!activeCardId}
      onClose={closeCardModal}
      size="full"
      className="w-[96vw] max-w-[1720px] h-[94vh] max-h-[96vh] md:bg-card md:backdrop-blur-none"
      hideHeaderClose={!!card}
      header={
        card ? <CardHeader card={card} onClose={closeCardModal} /> : undefined
      }
      contentClassName="p-0 sm:p-0 flex flex-col overflow-hidden"
    >
      {isLoading || !card ? (
        <div className="p-12 text-center text-slate-500 animate-pulse">
          Loading card details...
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <div
            role="group"
            aria-label="Task sections"
            className="flex gap-1 border-b border-border bg-muted/20 px-4 py-2 lg:hidden"
          >
            <Button
              variant={pane === "details" ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={pane === "details"}
              onClick={() => setPane("details")}
            >
              Details & activity
            </Button>
            <Button
              data-task-properties
              variant={pane === "properties" ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={pane === "properties"}
              onClick={() => setPane("properties")}
            >
              Properties
            </Button>
          </div>

          {/* Main Body */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
            {/* Left Column (Main content) */}
            <div
              role="region"
              aria-label="Task details and activity"
              className={
                "min-w-0 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8 space-y-6 lg:block " +
                (pane === "details" ? "block" : "hidden")
              }
            >
              <CardDescription card={card} />
              <CardSubtasks card={card} />
              <CardChecklists cardId={card.id} projectId={card.project_id} />
              <CardAttachments card={card} projectId={card.project_id} />
              <CardDependencies card={card} />
              <CardNotes key={card.id} card={card} />

              {/* Tabs for Comments & Activity History */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-[#183035]">
                <div className="flex items-center gap-4 border-b border-slate-200/80 dark:border-[#183035]">
                  <button
                    type="button"
                    onClick={() => setActiveTab("comments")}
                    className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors relative cursor-pointer ${
                      activeTab === "comments"
                        ? "text-teal-600 dark:text-teal-400 font-bold"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    }`}
                  >
                    Comments
                    {activeTab === "comments" && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-full" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("activity")}
                    className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors relative cursor-pointer ${
                      activeTab === "activity"
                        ? "text-teal-600 dark:text-teal-400 font-bold"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    }`}
                  >
                    Audit History
                    {activeTab === "activity" && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-full" />
                    )}
                  </button>
                </div>

                {activeTab === "comments" ? (
                  <CardComments cardId={card.id} projectId={card.project_id} />
                ) : (
                  <CardActivityStream cardId={card.id} />
                )}
              </div>
            </div>

            {/* Right Column (1/3 width) */}
            <aside
              aria-label="Task properties"
              className={
                "min-w-0 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 bg-muted/20 lg:border-s border-border lg:block " +
                (pane === "properties" ? "block" : "hidden")
              }
            >
              <CardSidebar card={card} columns={board?.columns} />
            </aside>
          </div>
        </div>
      )}
    </Modal>
  );
};
