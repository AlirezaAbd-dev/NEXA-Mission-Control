import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface UserAvatarProps {
  displayName?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export const UserAvatar = ({ displayName, avatarUrl, size = 'sm', showName = false, className }: UserAvatarProps) => {
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <Avatar src={avatarUrl} name={displayName} size={size} />
      {showName && (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {displayName || 'Unassigned'}
        </span>
      )}
    </div>
  );
};
