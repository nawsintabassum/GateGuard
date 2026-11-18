# GateGuard Professional Workspace Features

## Team collaboration and access

- Project owners and project admins can add collaborators by email and assign `admin`, `manager`, `developer`, or `viewer` roles.
- If the invited email already has a GateGuard account, project access is activated immediately. If not, the invitation remains pending and is activated when that email registers or signs in.
- Project membership grants access to the project and its analysis history. Owners/admins manage team membership; owners/admins/managers can change quality rules and apply policy templates and view the audit log. Only the project owner can delete the project or regenerate its CI token.
- The project audit log records CI analysis completion, quality-rule changes, policy-template application, member invitations/role changes/removals, and PDF report exports.
- Invitation email delivery is not configured. The invitee must be told to sign in/register with the invited email.

## Notifications and Slack

Set `TOKEN_ENCRYPTION_KEY` on the backend to a unique 64-character hexadecimal key before connecting Slack. Generate one with `openssl rand -hex 32`. Keep it stable; changing it makes previously encrypted Slack/GitHub credentials unreadable.

- CI submissions create persistent in-app events for quality-gate results, below-policy coverage and high/critical dependency findings.
- GitHub pull-request review events and team invitations also create events.
- The Notifications page refreshes every 30 seconds and supports marking one or all events as read.
- Slack delivery is configured per user from Notifications using a Slack Incoming Webhook URL. Only `https://hooks.slack.com/services/...` URLs are accepted. The URL is encrypted at rest and never returned to the client. A test message is sent before the setting is saved.
- Email delivery is not included in this release.

## Policy templates

The templates are `Startup`, `Enterprise`, `Security-focused`, and `Testing-focused`. Applying a template replaces the selected project's five quality thresholds; previous analyses remain unchanged. The new policy applies to later CI submissions.

## AI pull request review

1. Configure `GITHUB_WEBHOOK_SECRET` on the backend and add a GitHub webhook pointing to `/api/github/webhook`.
2. Subscribe the webhook to `pull_request` events (opened, reopened, synchronize and ready_for_review are processed).
3. The project owner must connect GitHub through GateGuard OAuth and configure `GEMINI_API_KEY` on the backend.
4. GateGuard fetches the PR diff, asks Gemini to identify evidence-backed bugs/security concerns/test gaps, then posts a review comment to the PR.
5. The comment distinguishes a GateGuard CI result that matches the PR head from a result that does not. AI findings are advisory and must not replace verified CI or human review.
6. The connected GitHub OAuth token needs permission to read pull-request diffs and create issue comments. The existing OAuth `repo` scope provides this for repositories the user can access.

## New API endpoints

- `GET /api/workspace/notifications`
- `PATCH /api/workspace/notifications/:id/read`
- `POST /api/workspace/notifications/read-all`
- `GET|PUT|DELETE /api/workspace/notifications/slack`
- `GET /api/workspace/audit?projectId=...`
- `GET /api/workspace/policy-templates`
- `POST /api/workspace/policy-templates/apply` with `{ "projectId": "...", "template": "startup|enterprise|security|testing" }`
- `GET|POST /api/workspace/projects/:projectId/members`
- `PATCH|DELETE /api/workspace/projects/:projectId/members/:memberId`

All workspace endpoints require the normal GateGuard bearer access token.
