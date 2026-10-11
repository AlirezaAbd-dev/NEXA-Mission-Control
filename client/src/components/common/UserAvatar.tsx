import { Avatar } from '@/components/ui';

export interface UserAvatarProps {
  displayName?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export const UserAvatar = ({ displayName, avatarUrl, size = 'sm', showName = false }: UserAvatarProps) => {
  return (
    <div className="inline-flex items-center gap-1.5">
      <Avatar src={avatarUrl} name={displayName} size={size} />
      {showName && (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {displayName || 'Unassigned'}
        </span>
      )}
    </div>
  );
};
