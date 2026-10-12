import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { useMfa } from "@/hooks/auth/useMfa";
import { useMfaCommand } from "@/hooks/auth/useMfaCommand";
import { apiError } from "@/lib/apiError";
import { ConfirmModal } from "@/components/common/ConfirmModal";
export function AuthenticatorSettings() {
  const { data: status } = useMfa(),
    command = useMfaCommand();
  const [password, setPassword] = useState(""),
    [otp, setOtp] = useState(""),
    [disable, setDisable] = useState(false);
  return (
    <section className="rounded-xl p-5 border border-slate-200 dark:border-[#183035] space-y-4">
      <h2 className="text-lg font-semibold">Two-factor authentication</h2>
      <p className="text-sm text-slate-500">
        {status?.enabled
          ? "Enabled. Sign-in requires your authenticator or a recovery code."
          : "Protect password sign-in with an authenticator app."}{" "}
        Organization SSO follows your identity provider’s policy.
      </p>
      {command.data?.recovery_codes && (
        <div className="space-y-2 p-3 bg-amber-500/10 rounded-xl">
          <p className="text-sm font-semibold">
            Save these one-time recovery codes now.
          </p>
          <pre className="text-xs whitespace-pre-wrap select-all">
            {command.data.recovery_codes.join("\n")}
          </pre>
        </div>
      )}
      <Input
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {command.data?.secret && !status?.enabled && (
        <div className="space-y-2">
          <p className="text-sm">
            Add this setup key to your authenticator app, choose a time-based
            6-digit code, then confirm. Setup expires in ten minutes.
          </p>
          <Input
            readOnly
            label="Authenticator setup key"
            value={command.data.secret}
          />
        </div>
      )}
      <Input
        label="Authenticator or recovery code"
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
        >
          Disable two-factor authentication
        </Button>
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
        >
          Confirm authenticator
        </Button>
      ) : (
        <Button
          disabled={!password || command.isPending}
          onClick={() => command.mutate({ command: "setup", password })}
        >
          Set up authenticator
        </Button>
      )}
      <ConfirmModal
        isOpen={disable}
        onClose={() => setDisable(false)}
        title="Disable two-factor authentication"
        description="Password sign-in will no longer require an authenticator code."
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
