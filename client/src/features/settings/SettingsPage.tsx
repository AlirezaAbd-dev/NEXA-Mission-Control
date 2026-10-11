import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useWorkspaces } from '@/hooks/workspace/useWorkspaces';
import { useWorkspaceMembers } from '@/hooks/workspace/useWorkspaceMembers';
import { useAddWorkspaceMember } from '@/hooks/workspace/useAddWorkspaceMember';
import { useLabels } from '@/hooks/label/useLabels';
import { useCreateLabel } from '@/hooks/label/useCreateLabel';
import { useUiStore } from '@/stores/ui.store';
import { Users, Tag, Moon, Sun, UserPlus, Plus } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { data: currentUser } = useCurrentUser();
  const { data: workspaces = [] } = useWorkspaces();
  const currentWorkspaceId = workspaces[0]?.id || '';

  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  const { data: members = [] } = useWorkspaceMembers(currentWorkspaceId);
  const { data: labels = [] } = useLabels(currentWorkspaceId);

  const addMember = useAddWorkspaceMember(currentWorkspaceId);
  const createLabel = useCreateLabel(currentWorkspaceId);

  // Member invite form state
  const [newMemberEmail, setNewMemberEmail] = useState('');
  // Label creation state
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !currentWorkspaceId) return;
    addMember.mutate(
      {
        email: newMemberEmail.trim(),
        role: 'member',
      },
      {
        onSuccess: () => setNewMemberEmail(''),
      }
    );
  };

  const handleCreateLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim() || !currentWorkspaceId) return;
    createLabel.mutate(
      {
        name: newLabelName.trim(),
        color: newLabelColor,
      },
      {
        onSuccess: () => setNewLabelName(''),
      }
    );
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Workspace Settings</h1>
        <p className="text-sm text-slate-500">Manage members, labels, and system preferences</p>
      </div>

      {/* Profile & Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Appearance & Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Theme Preference</div>
              <div className="text-xs text-slate-500">Switch between dark and light appearance</div>
            </div>
            <Button variant="outline" size="sm" onClick={toggleTheme} className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </Button>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Signed In As</div>
              <div className="text-xs text-slate-500">{currentUser?.email}</div>
            </div>
            <div className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-100">
              {currentUser?.role || 'User'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            Team Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleInviteMember} className="flex gap-2">
            <Input
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="colleague@domain.com"
              type="email"
              className="flex-1"
            />
            <Button type="submit" size="sm" isLoading={addMember.isPending}>
              <UserPlus className="w-4 h-4 mr-1.5" />
              Add Member
            </Button>
          </form>

          <div className="divide-y divide-slate-200 dark:divide-slate-800 pt-2">
            {members.map((member) => (
              <div key={member.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    displayName={member.display_name || member.username}
                    avatarUrl={member.avatar_url}
                    size="sm"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {member.display_name || member.username}
                    </div>
                    <div className="text-xs text-slate-500">{member.email}</div>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workspace Labels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-500" />
            Workspace Labels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreateLabel} className="flex gap-2 items-center">
            <Input
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="Label name (e.g. Bug, Feature)"
              className="flex-1"
            />
            <input
              type="color"
              value={newLabelColor}
              onChange={(e) => setNewLabelColor(e.target.value)}
              className="w-10 h-10 rounded border border-slate-300 dark:border-slate-700 cursor-pointer bg-transparent"
              title="Pick color"
            />
            <Button type="submit" size="sm" isLoading={createLabel.isPending}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </form>

          <div className="flex flex-wrap gap-2 pt-2">
            {labels.map((lbl) => (
              <div
                key={lbl.id}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
                style={{
                  backgroundColor: `${lbl.color}20`,
                  borderColor: lbl.color,
                  color: lbl.color,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lbl.color }} />
                {lbl.name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
