# Mission Control integrations

All provider credentials stay on the Rust server. Configure integrations from **Project settings → Integrations** as a workspace owner or admin. Use your public HTTPS application origin for provider callbacks; localhost callbacks require a development tunnel for webhook testing.

## GitHub

1. Add a GitHub integration and use a random secret of at least 32 characters.
2. Copy the displayed endpoint into GitHub repository Settings → Webhooks.
3. Choose JSON, enable push events, and enter the same secret.
4. Reference tasks with `CARD-<full task UUID>` in commit messages. An unambiguous prefix of at least eight characters also works. `#done` moves the task to a Done column.
5. GitHub signatures are checked against the exact request bytes. Delivery IDs suppress retries; commit hashes also prevent duplicate activities after partial delivery failures.

## GitLab

Create the webhook in GitLab and generate its signing token. Paste the complete `whsec_...` token into Mission Control's integration secret. Enable push events and use the displayed GitLab endpoint.

The receiver verifies Standard Webhooks `webhook-id`, `webhook-timestamp`, and `webhook-signature` headers with HMAC-SHA256. Timestamps must be within five minutes. Unsigned requests are rejected. Commit references use the same task key format as GitHub.

Reference: [GitLab webhook signing tokens](https://docs.gitlab.com/user/project/integrations/webhooks/#signing-tokens).

## Slack and Discord

Use an official incoming webhook URL. Mission Control accepts HTTPS Slack `hooks.slack.com/services/...` and Discord `discord.com/api/webhooks/...` URLs. Redirects, custom ports, embedded credentials, and arbitrary hosts are rejected. Alerts are dispatched when a task is escalated to High/Urgent or a blocker relationship is created. Delivery failures are recorded in server logs without logging the webhook URL.

## Email-to-board

Add an Email integration, select its destination column, and configure a random signing secret. Its owner is the administrator who created the integration; revoking that administrator's access also revokes intake permission.

A mail gateway sends JSON to the displayed endpoint:

```json
{"subject":"Customer feedback","text":"Please review this request.","from":"customer@example.com"}
```

Set `X-Mission-Delivery` to the original email’s unique Message-ID; retries using the same ID do not create another task. Set `X-Mission-Signature` to `sha256=` followed by the lowercase hexadecimal HMAC-SHA256 of the exact JSON bytes using the configured secret. The API verifies the signature before creating the task. This is a gateway adapter: configure Postfix, an inbound-email provider, or another trusted mail processor to supply the signed payload. This feature does not replace the existing mail server or change production SMTP routing.

## Organization sign-in (OIDC)

Set server environment variables:

```dotenv
OIDC_ISSUER=https://identity.example.com/realms/your-organization
OIDC_CLIENT_ID=mission-control
OIDC_CLIENT_SECRET=<provider-issued secret>
OIDC_REDIRECT_URI=https://tasks.example.com/api/v1/integrations/oidc/callback
PUBLIC_APP_URL=https://tasks.example.com
```

Register the exact redirect URI with your identity provider. For local testing, use `http://localhost:3000/api/v1/integrations/oidc/callback` and `PUBLIC_APP_URL=http://localhost:3000`; the issuer itself must still use HTTPS.

The sign-in button appears only when these settings are present. The authorization-code flow uses PKCE, a browser-bound one-use state cookie, nonce verification, issuer/audience validation, expiration checking, and the provider's RS256 JWKS keys.

Link identities explicitly instead of automatically merging accounts by email. After verifying the provider subject with your identity administrator, insert the identity mapping into the SQLite database:

```sql
INSERT INTO oidc_identities (issuer, subject, user_id)
VALUES ('https://identity.example.com/realms/your-organization', '<verified subject>', '<existing Mission Control user UUID>');
```

SAML organizations can connect through an identity broker such as Keycloak that exposes OIDC to Mission Control. Native SAML assertion parsing is not included. This is the provider-hook scope of the roadmap, not an implementation of every identity protocol.

Reference: [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html).

## Personal API tokens

Open Workspace settings → Personal API tokens. Choose a name and expiration of 1–365 days. Copy the displayed token once and use it as `Authorization: Bearer mc_...`. Only SHA-256 token hashes are stored. Tokens use the owner's current project/workspace permissions and can be revoked immediately.

## Designs, cloud files, and specifications

Project settings → Documents, designs & cloud files supports HTTPS links to Figma, Google Drive, Dropbox, OneDrive, and specifications. These are references to the providers' own resources: their sharing permissions still apply. Files are not silently copied and provider OAuth credentials are not required for link references.
## Development events

In addition to push events, enable GitHub pull-request, workflow-run and deployment/deployment-status events, or GitLab merge-request/pipeline events. Add `CARD-<full task UUID>` to the relevant title, description, branch or commit message. The signed adapter links HTTPS provider records in **Task → Development** and updates their state when later events arrive. Local acceptance uses signed synthetic payloads; no live provider account was configured by this work.

Payload references: [GitHub](https://docs.github.com/en/webhooks/webhook-events-and-payloads), [GitLab](https://docs.gitlab.com/user/project/integrations/webhook_events/).
