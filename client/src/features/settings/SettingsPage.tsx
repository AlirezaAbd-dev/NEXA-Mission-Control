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
  Key,
  Bell,
  Sliders,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { AuthenticatorSettings } from "./AuthenticatorSettings";
import { DesktopNotificationSettings } from "./DesktopNotificationSettings";
import { PersonalTokens } from "@/features/enterprise/PersonalTokens";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";
import { useWorkspaces } from "@/hooks/workspace/useWorkspaces";
import { useWorkspaceMembers } from "@/hooks/workspace/useWorkspaceMembers";
import { useAddWorkspaceMember } from "@/hooks/workspace/useAddWorkspaceMember";
import { useLabels } from "@/hooks/label/useLabels";
import { useCreateLabel } from "@/hooks/label/useCreateLabel";
import { useUpdateLabel } from "@/hooks/label/useUpdateLabel";
import { useDeleteLabel } from "@/hooks/label/useDeleteLabel";
import { useUiStore } from "@/stores/ui.store";
import { apiError } from "@/lib/apiError";
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
  const { data: currentUser } = useCurrentUser();
  const { data: workspaces = [] } = useWorkspaces();
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const currentWorkspaceId = selectedWorkspace || workspaces[0]?.id || "";
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);

  const [activeTab, setActiveTab] = useState<"workspace" | "labels" | "members" | "security">("workspace");

  const [roleChange, setRoleChange] = useState<{
    email: string;
    role: string;
  } | null>(null);
  const [memberRole, setMemberRole] = useState("member");
  const [memberError, setMemberError] = useState("");

  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  const { data: members = [] } = useWorkspaceMembers(currentWorkspaceId);
  const { data: labels = [] } = useLabels(currentWorkspaceId);

  const addMember = useAddWorkspaceMember(currentWorkspaceId);
  const createLabel = useCreateLabel(currentWorkspaceId);
  const updateLabel = useUpdateLabel(currentWorkspaceId);
  const deleteLabel = useDeleteLabel(currentWorkspaceId);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-[#183035]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            Settings & Workspace
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure labels, manage team members, access security, and preferences.
          </p>
        </div>

        {workspaces.length > 0 && (
          <div className="w-full sm:w-64">
            <CustomSelect
              label="Active Workspace"
              value={currentWorkspaceId}
              options={workspaces.map((w) => ({ value: w.id, label: w.name }))}
              onChange={setSelectedWorkspace}
            />
          </div>
        )}
      </div>

      {/* Modern Responsive Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 dark:border-[#183035] overflow-x-auto scrollbar-none pb-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("workspace")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl shrink-0 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "workspace"
              ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/25 shadow-2xs font-bold"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-[#132428] border border-transparent"
          }`}
        >
          <Sliders className="w-3.5 h-3.5 shrink-0" />
          <span>General & Appearance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("labels")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl shrink-0 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "labels"
              ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/25 shadow-2xs font-bold"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-[#132428] border border-transparent"
          }`}
        >
          <Tag className="w-3.5 h-3.5 shrink-0" />
          <span>Labels</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/60 dark:bg-[#183035] text-slate-700 dark:text-slate-300">
            {labels.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl shrink-0 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "members"
              ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/25 shadow-2xs font-bold"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-[#132428] border border-transparent"
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>Team Members</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/60 dark:bg-[#183035] text-slate-700 dark:text-slate-300">
            {members.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl shrink-0 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "security"
              ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/25 shadow-2xs font-bold"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-[#132428] border border-transparent"
          }`}
        >
          <Shield className="w-3.5 h-3.5 shrink-0" />
          <span>Security & Access</span>
        </button>
      </div>

      {/* TAB 1: GENERAL & APPEARANCE */}
      {activeTab === "workspace" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-500" />
                Appearance & Theme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#091316] border border-slate-200/80 dark:border-[#183035]">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Interface Theme
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Switch between cyber dark and high-contrast light mode
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {theme === "dark" ? (
                    <Moon className="w-4 h-4 text-teal-400" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-500" />
                  )}
                  {theme === "dark" ? "Dark Mode" : "Light Mode"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#091316] border border-slate-200/80 dark:border-[#183035]">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Signed In As
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {currentUser?.display_name || currentUser?.username} ({currentUser?.email})
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-md bg-teal-500/10 border border-teal-500/30 font-mono font-semibold text-teal-600 dark:text-teal-400 uppercase">
                  {currentUser?.role || "Member"}
                </span>
              </div>
            </CardContent>
          </Card>

          <DesktopNotificationSettings />
        </div>
      )}

      {/* TAB 2: LABELS MANAGEMENT */}
      {activeTab === "labels" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-teal-500" />
                  Workspace Labels ({labels.length})
                </span>
                <span className="text-xs font-normal text-slate-500">
                  Labels are shared across all project boards in this workspace
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create New Label Form */}
              <form
                onSubmit={handleCreateLabel}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#091316] border border-slate-200/80 dark:border-[#183035] space-y-3"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Create New Label
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <Input
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="Label title (e.g. Bug, Feature, Urgent, High Priority)"
                      required
                    />
                  </div>

                  {/* Color picker & presets */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 p-1 rounded-lg border border-slate-200 dark:border-[#183035] bg-white dark:bg-[#0d1a1d]">
                      {PRESET_COLORS.slice(0, 7).map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewLabelColor(color)}
                          className={`w-6 h-6 rounded-md transition-all cursor-pointer ${
                            newLabelColor === color
                              ? "ring-2 ring-teal-500 scale-110"
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
                        title="Custom color"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={createLabel.isPending}
                      className="cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Label
                    </Button>
                  </div>
                </div>

                {labelError && (
                  <p role="alert" className="text-xs text-rose-500 font-medium">
                    {labelError}
                  </p>
                )}
              </form>

              {/* Labels List & Inline Editors */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Existing Labels
                </div>

                {labels.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm italic border border-dashed border-slate-200 dark:border-[#183035] rounded-xl">
                    No labels created yet. Add your first label above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {labels.map((lbl) => {
                      const isEditing = editingLabelId === lbl.id;

                      if (isEditing) {
                        return (
                          <div
                            key={lbl.id}
                            className="p-3 rounded-xl border-2 border-teal-500/50 bg-white dark:bg-[#0d1a1d] shadow-sm space-y-2"
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
                                placeholder="Label name"
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
                                  <X className="w-3.5 h-3.5 mr-1" />
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleSaveEditLabel(lbl.id)}
                                  isLoading={updateLabel.isPending}
                                  className="h-7 px-2 text-xs"
                                >
                                  <Check className="w-3.5 h-3.5 mr-1" />
                                  Save
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={lbl.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-[#183035] bg-white dark:bg-[#0d1a1d] hover:border-teal-500/40 transition-all group"
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
                              className="p-1.5 text-slate-400 hover:text-teal-500 hover:bg-slate-100 dark:hover:bg-[#132428] rounded-md transition-colors cursor-pointer"
                              title="Edit label"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setLabelToDelete(lbl)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-[#132428] rounded-md transition-colors cursor-pointer"
                              title="Delete label"
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
                  <Users className="w-4 h-4 text-teal-500" />
                  Workspace Team ({members.length})
                </span>
                <span className="text-xs font-normal text-slate-500">
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
                      { value: "admin", label: "Admin" },
                      { value: "member", label: "Member" },
                      { value: "viewer", label: "Viewer" },
                    ]}
                  />
                  <Button type="submit" size="sm" isLoading={addMember.isPending} className="cursor-pointer">
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Add Member
                  </Button>
                </form>
              )}

              {memberError && (
                <p role="alert" className="text-sm text-rose-500 font-medium">
                  {memberError}
                </p>
              )}

              <div className="divide-y divide-slate-200 dark:divide-[#183035] pt-2">
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
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {member.display_name || member.username}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{member.email}</div>
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
                      ).map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))}
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
        title="Change member permissions?"
        description={
          roleChange
            ? `${roleChange.email} will now have the '${roleChange.role}' role in this workspace.`
            : ""
        }
        confirmLabel="Update Role"
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
        title={`Delete label "${labelToDelete?.name}"?`}
        description="Are you sure you want to permanently delete this label? It will be removed from all cards using it."
        confirmLabel="Delete Label"
        isDestructive={true}
        onConfirm={handleDeleteLabelConfirm}
        isLoading={deleteLabel.isPending}
      />
    </div>
  );
};
