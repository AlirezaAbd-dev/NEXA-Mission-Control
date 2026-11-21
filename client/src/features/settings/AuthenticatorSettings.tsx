import { tr, useUiLocale } from "@/i18n";
import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { useMfa } from "@/hooks/auth/useMfa";
import { useMfaCommand } from "@/hooks/auth/useMfaCommand";
import { apiError } from "@/lib/apiError";
import { ConfirmModal } from "@/components/common/ConfirmModal";
export function AuthenticatorSettings() {
  useUiLocale();
  const { data: status } = useMfa(),
    command = useMfaCommand();
  const [password, setPassword] = useState(""),
    [otp, setOtp] = useState(""),
    [disable, setDisable] = useState(false);
  return (
    <section className="rounded-xl p-5 border border-slate-200 dark:border-white/[0.06] space-y-4">
      <h2 className="text-lg font-semibold">{tr("Two-factor authentication")}</h2>
      <p className="text-sm text-slate-500">
        {status?.enabled
          ? tr("Enabled. Sign-in requires your authenticator or a recovery code.")
          : tr("Protect password sign-in with an authenticator app.")}{" "}{tr("Organization SSO follows your identity provider’s policy.")}</p>
      {command.data?.recovery_codes && (
        <div className="space-y-2 p-3 bg-amber-500/10 rounded-xl">
          <p className="text-sm font-semibold">{tr("Save these one-time recovery codes now.")}</p>
          <pre className="text-xs whitespace-pre-wrap select-all">
            {command.data.recovery_codes.join("\n")}
          </pre>
        </div>
      )}
      <Input
        label={tr("Current password")}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {command.data?.secret && !status?.enabled && (
        <div className="space-y-2">
          <p className="text-sm">{tr("Add this setup key to your authenticator app, choose a time-based 6-digit code, then confirm. Setup expires in ten minutes.")}</p>
          <Input
            readOnly
            label={tr("Authenticator setup key")}
            value={command.data.secret}
          />
        </div>
      )}
      <Input
        label={tr("Authenticator or recovery code")}
        autoComplete="one-time-code"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />
      {command.isError && (
        <p role="alert" className="text-rose-500 text-sm">
          {apiError(command.error)}
        </p>
      )}
      {status?.enabled ? (
        <Button
          variant="outline"
          disabled={!password || !otp || command.isPending}
          onClick={() => setDisable(true)}
        >{tr("Disable two-factor authentication")}</Button>
      ) : command.data?.secret ? (
        <Button
          disabled={otp.length !== 6 || command.isPending}
          onClick={() =>
            command.mutate(
              { command: "enable", otp },
              {
                onSuccess: () => {
                  setPassword("");
                  setOtp("");
                },
              },
            )
          }
        >{tr("Confirm authenticator")}</Button>
      ) : (
        <Button
          disabled={!password || command.isPending}
          onClick={() => command.mutate({ command: "setup", password })}
        >{tr("Set up authenticator")}</Button>
      )}
      <ConfirmModal
        isOpen={disable}
        onClose={() => setDisable(false)}
        title={tr("Disable two-factor authentication")}
        description={tr("Password sign-in will no longer require an authenticator code.")}
        onConfirm={() =>
          command.mutate(
            { command: "disable", password, otp },
            {
              onSuccess: () => {
                setDisable(false);
                setPassword("");
                setOtp("");
              },
            },
          )
        }
      />
    </section>
  );
}
