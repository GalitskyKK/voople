# Production deploy and release

## What a feature PR merge does

A merged PR puts reviewed code on `master`. It does not create a desktop tag or
start the Desktop release workflow. This separation is intentional: several
small, independently reviewed slices may accumulate on `master` and ship in one
version when the product checkpoint is ready.

The repository contains no GitHub Actions job that deploys the web application.
Web production is owned by the connected Vercel project: if its production
branch is `master`, Vercel deploys a merge independently of the desktop release.
Always verify the deployment in Vercel rather than treating a green GitHub PR as
proof that the web production rollout completed.

## Desktop stable release

1. Merge every intended feature/fix PR and wait for required checks.
2. Synchronize a clean local `master` with `origin/master`.
3. Run `npm run release` and choose patch, minor or major. The command aligns
   desktop versions, updates `CHANGELOG.md`, performs local checks and pushes a
   `release/desktop-v<version>` branch.
4. Open that branch as a PR to `master`. Do not add product changes to it.
5. Merge the release PR after `Verify repository` and `Scan complete Git
   history` pass.
6. Immediately synchronize local `master` and run `npm run release:publish`.
   Confirming creates and pushes the annotated `desktop-v<version>` tag.
7. The tag starts `.github/workflows/desktop-release.yml`, which performs the
   authoritative Windows build and publishes the signed installer/update
   metadata.

There is no PR whose payload is "a tag". The version and changelog are reviewed
in the release PR; the tag only identifies the exact merged commit. Publication
refuses to tag if another commit landed after that release PR.

## Database migrations

Do not apply release migrations casually from a feature branch. Release
preparation checks migration readiness. The desktop workflow optionally
rehearses compatible migrations against staging and runs
`npm run db:promote:release` against production before stable publication.
Manual promotion is a recovery operation, not the normal feature workflow.

## Manual workflow dispatch

`Desktop release` may be dispatched manually to build an RC. Stable publication
through the normal maintainer path uses the protected release PR and tag flow
above so version history, source, artifacts and updater metadata stay aligned.
