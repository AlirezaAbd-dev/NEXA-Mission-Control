import { formatNumber } from "@/i18n";
import { setLocale } from "@/i18n";
import { uiLabel } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
import React, { useState } from "react";
import {
  Users,
  Tag,
  Moon,
  Sun,
  UserPlus,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Shield,
  Sliders,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { AuthenticatorSettings } from "./AuthenticatorSettings";
import { DesktopNotificationSettings } from "./DesktopNotificationSettings";
import { ThemePicker } from "./ThemePicker";
import { PersonalTokens } from "@/features/enterprise/PersonalTokens";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";
import { useActiveWorkspace } from "@/hooks/workspace/useActiveWorkspace";
import { ProfileSettings } from "./ProfileSettings";
import { useWorkspaceMembers } from "@/hooks/workspace/useWorkspaceMembers";
import { useAddWorkspaceMember } from "@/hooks/workspace/useAddWorkspaceMember";
import { useUpdateWorkspace } from "@/hooks/workspace/useUpdateWorkspace";
import { useDeleteWorkspace } from "@/hooks/workspace/useDeleteWorkspace";
import { useLabels } from "@/hooks/label/useLabels";
import { useCreateLabel } from "@/hooks/label/useCreateLabel";
import { useUpdateLabel } from "@/hooks/label/useUpdateLabel";
import { useDeleteLabel } from "@/hooks/label/useDeleteLabel";
import { useUiStore } from "@/stores/ui.store";
import { apiError } from "@/lib/apiError";
import { useNavigate } from "react-router";
import type { Label } from "@/types";

const PRESET_COLORS = [
  "#0d9488", // Teal
  "#2dd4bf", // Cyan
  "#0284c7", // Sky
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Amber
  "#10b981", // Emerald
  "#64748b", // Slate
];

export const SettingsPage: React.FC = () => {
  const locale = useUiLocale();
  const { data: currentUser } = useCurrentUser();
  const {workspaces,currentWorkspaceId,currentWorkspace,selectWorkspace}=useActiveWorkspace();

  const [activeTab, setActiveTab] = useState<"profile" | "workspace" | "labels" | "members" | "security">("profile");

  const [roleChange, setRoleChange] = useState<{
    email: string;
    role: string;
  } | null>(null);
  const [memberRole, setMemberRole] = useState("member");
  const [memberError, setMemberError] = useState("");

  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const navigate = useNavigate();

  const { data: members = [] } = useWorkspaceMembers(currentWorkspaceId);
  const { data: labels = [] } = useLabels(currentWorkspaceId);

  const addMember = useAddWorkspaceMember(currentWorkspaceId);
  const createLabel = useCreateLabel(currentWorkspaceId);
  const updateLabel = useUpdateLabel(currentWorkspaceId);
  const deleteLabel = useDeleteLabel(currentWorkspaceId);
  const updateWorkspaceMutation = useUpdateWorkspace(currentWorkspaceId);
  const deleteWorkspaceMutation = useDeleteWorkspace();

  // Workspace settings state
  const [wsName, setWsName] = useState(currentWorkspace?.name || "");
  const [wsDescription, setWsDescription] = useState(currentWorkspace?.description || "");
  const [wsUpdateError, setWsUpdateError] = useState("");
  const [wsUpdateSuccess, setWsUpdateSuccess] = useState(false);
  const [deleteWsModalOpen, setDeleteWsModalOpen] = useState(false);
  const [wsDeleteError, setWsDeleteError] = useState<string | null>(null);

  React.useEffect(() => {
    if (currentWorkspace) {
      setWsName(currentWorkspace.name || "");
      setWsDescription(currentWorkspace.description || "");
      setWsUpdateError("");
      setWsUpdateSuccess(false);
    }
  }, [currentWorkspace?.id, currentWorkspace?.name, currentWorkspace?.description]);

  const roleInWorkspace = currentWorkspace?.user_role || "";
  const canEditWorkspace = ["owner", "admin"].includes(roleInWorkspace);
  const canDeleteWorkspace = roleInWorkspace === "owner";

  const handleUpdateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim() || !currentWorkspaceId) return;
    setWsUpdateError("");
    setWsUpdateSuccess(false);

    updateWorkspaceMutation.mutate(
      {
        name: wsName.trim(),
        description: wsDescription.trim() || undefined,
      },
      {
        onSuccess: () => {
          setWsUpdateSuccess(true);
          setTimeout(() => setWsUpdateSuccess(false), 3000);
        },
        onError: (err: any) => {
          setWsUpdateError(apiError(err));
        },
      }
    );
  };

  const handleDeleteWorkspaceConfirm = () => {
    if (!currentWorkspaceId) return;
    setWsDeleteError(null);
    deleteWorkspaceMutation.mutate(currentWorkspaceId, {
      onSuccess: () => {
        setDeleteWsModalOpen(false);
        const remaining = workspaces.filter((w) => w.id !== currentWorkspaceId);
        if (remaining.length > 0) {
          selectWorkspace(remaining[0].id);
          navigate(`/w/${remaining[0].id}`);
        } else {
          navigate("/");
        }
      },
      onError: (err: any) => {
        setWsDeleteError(apiError(err));
      },
    });
  };

  // Member invite form state
  const [newMemberEmail, setNewMemberEmail] = useState("");

  // Label creation state
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#0d9488");
  const [labelError, setLabelError] = useState("");

  // Label edit & delete states
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [labelToDelete, setLabelToDelete] = useState<Label | null>(null);

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !currentWorkspaceId) return;
    setMemberError("");
    addMember.mutate(
      {
        email: newMemberEmail.trim(),
        role: memberRole,
      },
      {
        onSuccess: () => {
          setNewMemberEmail("");
          setMemberError("");
        },
        onError: (e) => setMemberError(apiError(e)),
      },
    );
  };

  const handleCreateLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim() || !currentWorkspaceId) return;
    setLabelError("");
    createLabel.mutate(
      {
        name: newLabelName.trim(),
        color: newLabelColor,
      },
      {
        onSuccess: () => {
          setNewLabelName("");
          setLabelError("");
        },
        onError: (e) => setLabelError(apiError(e)),
      },
    );
  };

  const startEditLabel = (lbl: Label) => {
    setEditingLabelId(lbl.id);
    setEditName(lbl.name);
    setEditColor(lbl.color);
  };

  const cancelEditLabel = () => {
    setEditingLabelId(null);
    setEditName("");
    setEditColor("");
  };

  const handleSaveEditLabel = (id: string) => {
    if (!editName.trim()) return;
    updateLabel.mutate(
      {
        id,
        name: editName.trim(),
        color: editColor,
      },
      {
        onSuccess: () => {
          setEditingLabelId(null);
        },
      },
    );
  };

  const handleDeleteLabelConfirm = () => {
    if (!labelToDelete) return;
    deleteLabel.mutate(labelToDelete.id, {
      onSuccess: () => setLabelToDelete(null),
    });
  };

  const canManageWorkspace = ["owner", "admin"].includes(
    currentWorkspace?.user_role || "",
  );

  return (
    <div className="min-h-full flex-1 flex flex-col p-4 sm:p-6 space-y-5 max-w-5xl mx-auto w-full">
      {/* Header & Workspace Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--nexa-divider)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">{tr("Settings")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tr("Manage your profile, workspace, team, security, and preferences.")}</p>
        </div>

        {workspaces.length > 0 && (
          <div className="w-full sm:w-64">
            <CustomSelect
              label={tr("Active Workspace")}
              value={currentWorkspaceId}
              options={workspaces.map((w) => ({ value: w.id, label: w.name }))}
              onChange={selectWorkspace}
            />
          </div>
        )}
      </div>

      {/* Modern Responsive Tabs Navigation */}
      <div role="tablist" className="flex items-center gap-1.5 border-b border-[var(--nexa-divider)] overflow-x-auto scrollbar-none pb-2 shrink-0">
        <button
          type="button"
          role="tab"
          data-nexa-tab="default"
          aria-selected={activeTab === "profile"}
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl shrink-0 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "profile"
              ? "font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <span>{tr("My profile")}</span>
        </button>

        <button
          type="button"
          role="tab"
          data-nexa-tab="default"
          aria-selected={activeTab === "workspace"}
          onClick={() => setActiveTab("workspace")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl shrink-0 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "workspace"
              ? "font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Sliders className="w-3.5 h-3.5 shrink-0" />
          <span>{tr("General & Appearance")}</span>
        </button>

        <button
          type="button"
          role="tab"
          data-nexa-tab="default"
          aria-selected={activeTab === "labels"}
          onClick={() => setActiveTab("labels")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl shrink-0 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "labels"
              ? "font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Tag className="w-3.5 h-3.5 shrink-0" />
          <span>{tr("Labels")}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 dark:bg-white/15">
            {formatNumber(labels.length)}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          data-nexa-tab="default"
          aria-selected={activeTab === "members"}
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl shrink-0 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "members"
              ? "font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>{tr("Team Members")}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 dark:bg-white/15">
            {formatNumber(members.length)}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          data-nexa-tab="default"
          aria-selected={activeTab === "security"}
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl shrink-0 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "security"
              ? "font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Shield className="w-3.5 h-3.5 shrink-0" />
          <span>{tr("Security & Access")}</span>
        </button>
      </div>

      {activeTab==="profile" && <ProfileSettings />}

      {/* TAB 1: GENERAL & APPEARANCE */}
      {activeTab === "workspace" && (
        <div className="space-y-6">
          <ThemePicker />
          <Card><CardContent className="p-5"><CustomSelect label={tr("Interface language")} value={locale} onChange={value => setLocale(value === "fa" ? "fa" : "en")} options={[{ value: "en", label: "English" }, { value: "fa", label: "فارسی" }]} /></CardContent></Card>
          {/* Workspace Settings (Rename & Info) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />{tr("Workspace Details")}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--nexa-surface-l2)] text-muted-foreground font-mono">{tr("Role:")} {uiLabel(roleInWorkspace || "member")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleUpdateWorkspace} className="space-y-4">
                {wsUpdateError && (
                  <div className="p-3 text-xs rounded-xl bg-[var(--nexa-status-danger-surface)] text-[var(--nexa-status-danger-text)]">
                    {wsUpdateError}
                  </div>
                )}
                {wsUpdateSuccess && (
                  <div className="p-3 text-xs rounded-xl bg-[var(--nexa-status-success-surface)] text-[var(--nexa-status-success-text)]">{tr("Workspace details updated successfully!")}</div>
                )}

                <div className="space-y-1.5">
                  <label className="text-field-label font-medium text-foreground">{tr("Workspace Name")}<span className="text-danger">*</span>
                  </label>
                  <Input
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    placeholder={tr("e.g. Acme Corporation")}
                    disabled={!canEditWorkspace || updateWorkspaceMutation.isPending}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-field-label font-medium text-foreground">{tr("Description")}</label>
                  <textarea
                    data-nexa-field=""
                    value={wsDescription}
                    onChange={(e) => setWsDescription(e.target.value)}
                    rows={2}
                    placeholder={tr("Optional workspace description...")}
                    disabled={!canEditWorkspace || updateWorkspaceMutation.isPending}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--nexa-field-border)] bg-[var(--nexa-field-fill)] text-foreground placeholder:text-muted-foreground focus:outline-none resize-none disabled:opacity-50"
                  />
                </div>

                {canEditWorkspace && (
                  <div className="flex justify-end pt-1">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={updateWorkspaceMutation.isPending}
                      disabled={!wsName.trim() || (wsName === currentWorkspace?.name && wsDescription === (currentWorkspace?.description || ""))}
                    >{tr("Save Workspace")}</Button>
                  </div>
                )}

                {!canEditWorkspace && (
                  <p className="text-xs text-muted-foreground italic">{tr("Only workspace owners and admins can rename or edit workspace details.")}</p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Theme & Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />{tr("Appearance & Theme")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--nexa-surface-l2)] border border-[var(--nexa-divider)]">
                <div>
                  <div className="text-sm font-semibold text-foreground">{tr("Interface Theme")}</div>
                  <div className="text-xs text-muted-foreground">{tr("Switch between cyber dark and high-contrast light mode")}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {theme === "dark" ? (
                    <Moon className="w-4 h-4 text-primary" />
                  ) : (
                    <Sun className="w-4 h-4 text-warning" />
                  )}
                  {theme === "dark" ? tr("Dark Mode") : tr("Light Mode")}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--nexa-surface-l2)] border border-[var(--nexa-divider)]">
                <div>
                  <div className="text-sm font-semibold text-foreground">{tr("Signed In As")}</div>
                  <div className="text-xs text-muted-foreground">
                    {currentUser?.display_name || currentUser?.username} ({currentUser?.email})
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-md bg-primary/10 border border-primary/25 font-mono font-semibold text-primary uppercase">
                  {uiLabel(currentUser?.role?.toLowerCase() || "member")}
                </span>
              </div>
            </CardContent>
          </Card>

          <DesktopNotificationSettings />

          {/* Danger Zone: Workspace Deletion */}
          <Card className="border-danger/30">
            <CardHeader>
              <CardTitle className="text-base text-danger flex items-center gap-2">
                <Trash2 className="w-4 h-4" />{tr("Danger Zone")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-danger/5 border border-danger/20">
                <div>
                  <div className="text-sm font-semibold text-foreground">{tr("Delete Workspace")}</div>
                  <div className="text-xs text-muted-foreground">{tr("Permanently delete this workspace (")}{currentWorkspace?.name}{tr("), all of its projects, tasks, and data.")}</div>
                </div>
                {canDeleteWorkspace ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setWsDeleteError(null);
                      setDeleteWsModalOpen(true);
                    }}
                    className="cursor-pointer shrink-0"
                  >{tr("Delete Workspace")}</Button>
                ) : (
                  <span className="text-xs text-muted-foreground italic shrink-0">{tr("Only the workspace owner can delete this workspace")}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: LABELS MANAGEMENT */}
      {activeTab === "labels" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />{tr("Workspace Labels (")}{formatNumber(labels.length)})
                </span>
                <span className="text-xs font-normal text-muted-foreground">{tr("Labels are shared across all project boards in this workspace")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create New Label Form */}
              <form
                onSubmit={handleCreateLabel}
                className="p-4 rounded-xl bg-[var(--nexa-surface-l2)] border border-[var(--nexa-divider)] space-y-3"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("Create New Label")}</div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <Input
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder={tr("Label title (e.g. Bug, Feature, Urgent, High Priority)")}
                      required
                    />
                  </div>

                  {/* Color picker & presets */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 p-1 rounded-lg border border-[var(--nexa-divider)] bg-[var(--nexa-surface-l1)]">
                      {PRESET_COLORS.slice(0, 7).map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewLabelColor(color)}
                          className={`w-6 h-6 rounded-md transition-all cursor-pointer ${
                            newLabelColor === color
                              ? "ring-2 ring-primary scale-110"
                              : "hover:scale-105 opacity-80 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                      <input
                        type="color"
                        value={newLabelColor}
                        onChange={(e) => setNewLabelColor(e.target.value)}
                        className="w-6 h-6 rounded border-0 cursor-pointer p-0 bg-transparent"
                        title={tr("Custom color")}
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={createLabel.isPending}
                      className="cursor-pointer"
                    >
                      <Plus className="w-4 h-4 me-1.5" />{tr("Add Label")}</Button>
                  </div>
                </div>

                {labelError && (
                  <p role="alert" className="text-xs text-danger font-medium">
                    {labelError}
                  </p>
                )}
              </form>

              {/* Labels List & Inline Editors */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("Existing Labels")}</div>

                {labels.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm italic border border-dashed border-[var(--nexa-divider)] rounded-xl">{tr("No labels created yet. Add your first label above.")}</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {labels.map((lbl) => {
                      const isEditing = editingLabelId === lbl.id;

                      if (isEditing) {
                        return (
                          <div
                            key={lbl.id}
                            className="p-3 rounded-xl border-2 border-primary/50 bg-[var(--nexa-surface-l1)] shadow-sm space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={editColor}
                                onChange={(e) => setEditColor(e.target.value)}
                                className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                              />
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-8 text-xs flex-1"
                                placeholder={tr("Label name")}
                                autoFocus
                              />
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              {/* Color presets for quick selection */}
                              <div className="flex gap-1 overflow-x-auto max-w-[160px]">
                                {PRESET_COLORS.slice(0, 6).map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setEditColor(c)}
                                    className="w-4 h-4 rounded-full cursor-pointer hover:scale-125 transition-transform"
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={cancelEditLabel}
                                  className="h-7 px-2 text-xs"
                                >
                                  <X className="w-3.5 h-3.5 me-1" />{tr("Cancel")}</Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleSaveEditLabel(lbl.id)}
                                  isLoading={updateLabel.isPending}
                                  className="h-7 px-2 text-xs"
                                >
                                  <Check className="w-3.5 h-3.5 me-1" />{tr("Save")}</Button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={lbl.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--nexa-divider)] bg-[var(--nexa-surface-l1)] hover:border-primary/40 transition-all group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: lbl.color }}
                            />
                            <span
                              className="px-2.5 py-0.5 rounded-md text-xs font-semibold truncate border"
                              style={{
                                backgroundColor: `${lbl.color}18`,
                                borderColor: `${lbl.color}40`,
                                color: lbl.color,
                              }}
                            >
                              {lbl.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => startEditLabel(lbl)}
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-[var(--nexa-surface-l2)] rounded-md transition-colors cursor-pointer"
                              title={tr("Edit label")}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setLabelToDelete(lbl)}
                              className="p-1.5 text-muted-foreground hover:text-danger hover:bg-[var(--nexa-surface-l2)] rounded-md transition-colors cursor-pointer"
                              title={tr("Delete label")}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: TEAM MEMBERS */}
      {activeTab === "members" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />{tr("Workspace Team (")}{formatNumber(members.length)})
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {currentWorkspace?.name}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canManageWorkspace && (
                <form onSubmit={handleInviteMember} className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="colleague@domain.com"
                    type="email"
                    className="flex-1"
                    required
                  />
                  <CustomSelect
                    className="w-full sm:w-36"
                    value={memberRole}
                    onChange={setMemberRole}
                    options={[
                      { value: "admin", label: tr("Admin") },
                      { value: "member", label: tr("Member") },
                      { value: "viewer", label: tr("Viewer") },
                    ]}
                  />
                  <Button type="submit" size="sm" isLoading={addMember.isPending} className="cursor-pointer">
                    <UserPlus className="w-4 h-4 me-1.5" />{tr("Add Member")}</Button>
                </form>
              )}

              {memberError && (
                <p role="alert" className="text-sm text-danger font-medium">
                  {memberError}
                </p>
              )}

              <div className="divide-y divide-[var(--nexa-divider)] pt-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        displayName={member.display_name || member.username}
                        avatarUrl={member.avatar_url}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {member.display_name || member.username}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                      </div>
                    </div>

                    <CustomSelect
                      className="w-36 shrink-0"
                      value={member.role}
                      disabled={
                        member.role === "owner" || !canManageWorkspace
                      }
                      options={(member.role === "owner"
                        ? ["owner"]
                        : ["admin", "member", "viewer"]
                      ).map((value) => ({ value, label: uiLabel(value) }))}
                      onChange={(role) =>
                        setRoleChange({ email: member.email, role })
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: SECURITY & ACCESS */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <PersonalTokens />
          <AuthenticatorSettings />
        </div>
      )}

      {/* Confirm Role Change Modal */}
      <ConfirmModal
        isOpen={!!roleChange}
        onClose={() => setRoleChange(null)}
        title={tr("Change member permissions?")}
        description={
          roleChange
            ? tr("{value0} will now have the '{value1}' role in this workspace.", { value0: (roleChange.email), value1: uiLabel(roleChange.role) })
            : ""
        }
        confirmLabel={tr("Update Role")}
        onConfirm={() =>
          roleChange &&
          addMember.mutate(roleChange, {
            onSuccess: () => setRoleChange(null),
            onError: (e) => setMemberError(apiError(e)),
          })
        }
        isLoading={addMember.isPending}
      />

      {/* Confirm Delete Label Modal */}
      <ConfirmModal
        isOpen={!!labelToDelete}
        onClose={() => setLabelToDelete(null)}
        title={tr("Delete label \"{value0}\"?", { value0: (labelToDelete?.name) })}
        description={tr("Are you sure you want to permanently delete this label? It will be removed from all cards using it.")}
        confirmLabel={tr("Delete Label")}
        isDestructive={true}
        onConfirm={handleDeleteLabelConfirm}
        isLoading={deleteLabel.isPending}
      />

      {/* Confirm Delete Workspace Modal */}
      <ConfirmModal
        isOpen={deleteWsModalOpen}
        onClose={() => {
          setDeleteWsModalOpen(false);
          setWsDeleteError(null);
        }}
        title={tr("Delete workspace \"{value0}\"?", { value0: (currentWorkspace?.name) })}
        description={
          wsDeleteError ||
          tr("Are you sure you want to permanently delete \"{value0}\" and all associated projects, tasks, boards, and attachments? This action cannot be undone.", { value0: (currentWorkspace?.name) })
        }
        confirmLabel={tr("Delete Workspace")}
        isDestructive={true}
        onConfirm={handleDeleteWorkspaceConfirm}
        isLoading={deleteWorkspaceMutation.isPending}
      />
    </div>
  );
};
