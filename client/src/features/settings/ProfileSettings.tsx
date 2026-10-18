import { useEffect, useRef, useState } from "react";
import { Camera, Save, Trash2, UserRound } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";
import { useUpdateProfile } from "@/hooks/auth/useUpdateProfile";
import { useUploadAvatar } from "@/hooks/auth/useUploadAvatar";
import { apiError } from "@/lib/apiError";
import type { User } from "@/types";
export function ProfileSettings() {
  const { data: user, isLoading, error } = useCurrentUser();
  if (isLoading) return <p className="text-sm text-muted-foreground" role="status">Loading your profile…</p>;
  if (!user) return <p role="alert" className="text-sm text-danger">{error ? apiError(error) : "Your profile could not be loaded."}</p>;
  return <ProfileForm key={user.id} user={user} />;
}
function ProfileForm({ user }: { user: User }) {
  const photoInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.display_name);
  const [avatar, setAvatar] = useState(user.avatar_url || "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const update = useUpdateProfile(), upload = useUploadAvatar();
  const pending = update.isPending || upload.isPending;
  const changed = name !== user.display_name || avatar !== (user.avatar_url || "") || !!file;
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const choose = (candidate?: File) => {
    setError(""); setSaved(false);
    if (!candidate) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(candidate.type)) { setError("Choose a PNG, JPEG, WebP or GIF image."); return; }
    if (candidate.size > 2 * 1024 * 1024) { setError("Choose an image up to 2 MB."); return; }
    setPreview(URL.createObjectURL(candidate)); setFile(candidate);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setSaved(false);
    if (name.trim().length < 2) { setError("Your name must contain at least 2 characters."); return; }
    try {
      let url = avatar;
      if (file) { url = (await upload.mutateAsync(file)).url; setAvatar(url); setFile(null); setPreview(""); }
      const updated = await update.mutateAsync({ display_name: name.trim(), avatar_url: url });
      setName(updated.display_name); setAvatar(updated.avatar_url || ""); setSaved(true);
    } catch (error) { setError(apiError(error)); }
  };
  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><UserRound size={18} className="text-primary" />My profile</CardTitle><p className="text-sm text-muted-foreground">Your name and photo appear on tasks, comments, and workspace member lists.</p></CardHeader>
    <CardContent>
      <form onSubmit={save} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 rounded-2xl border border-border bg-muted/20 p-4">
          <UserAvatar displayName={name || user.username} avatarUrl={file ? preview : avatar} size="lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium">Profile photo</p>
            <input ref={photoInput} type="file" className="sr-only" tabIndex={-1} aria-label="Choose profile photo" accept="image/png,image/jpeg,image/webp,image/gif" disabled={pending} onChange={event => { choose(event.target.files?.[0]); event.target.value = ""; }} />
            <Button size="sm" variant="outline" disabled={pending} onClick={() => photoInput.current?.click()}><Camera size={14} />{avatar || file ? "Change photo" : "Choose photo"}</Button>
            {file && <p className="text-xs text-muted-foreground break-all">Selected: {file.name}</p>}
            <p className="text-xs text-muted-foreground">PNG, JPEG, WebP or GIF · up to 2 MB. Changes apply when you save.</p>
            {(avatar || file) && <Button size="sm" variant="ghost" className="text-danger dark:text-danger hover:text-danger dark:hover:text-danger" disabled={pending} onClick={() => { setFile(null); setPreview(""); setAvatar(""); setError(""); setSaved(false); }}><Trash2 size={14} />Remove photo</Button>}
          </div>
        </div>
        <Input label="Display name" value={name} minLength={2} maxLength={50} required disabled={pending} autoComplete="name" onChange={event => { setName(event.target.value); setSaved(false); }} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Username" value={user.username} readOnly />
          <Input label="Email address" value={user.email} readOnly type="email" />
        </div>
        <p className="text-xs text-muted-foreground">Username and email are your sign-in identifiers and cannot be edited here.</p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {saved && <p role="status" className="text-sm text-primary">Your profile has been updated.</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button size="sm" variant="secondary" disabled={pending || !changed} onClick={() => { setName(user.display_name); setAvatar(user.avatar_url || ""); setFile(null); setPreview(""); setError(""); setSaved(false); }}>Reset changes</Button>
          <Button size="sm" type="submit" disabled={!changed} isLoading={pending}><Save size={14} />Save profile</Button>
        </div>
      </form>
    </CardContent>
  </Card>;
}
