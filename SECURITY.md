# Security policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability, exposed credential,
private user data or an authentication bypass. Use GitHub's private
vulnerability reporting flow under **Security → Advisories → Report a
vulnerability**. Include the affected version, impact, reproduction steps and
the smallest safe proof of concept. Do not include real user content or active
credentials.

If private vulnerability reporting is unavailable, contact the repository
owner through a private channel listed on the owner's GitHub profile and wait
for a secure reporting channel before sending sensitive details.

## Supported versions

Only the current production web deployment and the latest stable desktop
release receive security fixes. Older desktop installers should update before
reporting a version-specific issue.

## Credential response

If a credential may have entered Git history, logs, an artifact or a public
issue:

1. revoke or rotate it at the provider immediately;
2. stop affected releases and workflows;
3. inspect Git history, Actions logs, caches and uploaded artifacts;
4. remove the value from the current tree and rewrite history when required;
5. invalidate derived sessions, signatures or tokens;
6. document the incident without copying the credential.

Deleting a value from the latest commit does not make a public credential safe.

## Repository controls

Maintainers should keep these GitHub controls enabled:

- private vulnerability reporting;
- secret scanning and push protection;
- Dependabot alerts and security updates;
- branch protection for `master`, including required checks and review of
  CODEOWNERS-owned files;
- least-privilege Actions token permissions and protected release environments;
- MFA or passkeys for maintainers and production providers.

The repository also runs a full-history Gitleaks scan. The sole baseline entry
in `.gitleaksignore` is an audited false positive caused by empty environment
examples; new findings must not be added to the baseline without inspecting the
referenced blob and documenting why it is safe.
