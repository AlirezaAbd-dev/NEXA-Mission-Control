import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth.api";
export function useUploadAvatar() { return useMutation({ mutationFn: (file: File) => authApi.uploadAvatar(file) }); }
