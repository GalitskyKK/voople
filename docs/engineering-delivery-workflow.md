# Engineering delivery workflow

## Branch roles

- `master` contains only reviewed, releasable commits. A desktop/web release is
  produced only from a tagged commit on `master`.
- Product work uses one short-lived branch per cohesive slice:
  `feat/<slice>`, `fix/<defect>` or `docs/<topic>`.
- A branch owns one product boundary. Unrelated cleanup and another board do not
  enter the same branch merely because they are nearby.

## Commit boundaries

Use small, independently reviewable checkpoints rather than one aggregate diff:

1. contract/tests or architecture boundary;
2. implementation;
3. product evidence and delivery-matrix update.

Each commit must preserve a buildable or deliberately documented intermediate
state. Never commit generated output, secrets, unrelated user changes or files
whose Git content did not change.

## Completion and merge gate

A slice can merge only when its data/authorization contract, loading/empty/error
states, responsive web/desktop parity and relevant automated checks are present.
Run the repository gates from `AGENTS.md`; record visual and state evidence in
`docs/product-delivery-matrix.md`. Review the branch diff against `master`, then
merge without rewriting unrelated history.

## Releases

Merging a feature PR does not publish a desktop release. Accumulating several
reviewed, releasable slices on `master` before one release is supported.

Desktop publication uses two protected stages:

1. From a clean, synchronized `master`, run `npm run release`. It bumps every
   desktop manifest, updates the changelog, runs the local release gates and
   pushes `release/desktop-v<version>` without touching remote `master` or
   creating a tag.
2. Open that branch as a PR to `master`. Merge only after the required quality
   and full-history secret-scan checks pass.
3. Immediately synchronize local `master` and run `npm run release:publish`.
   It accepts only a fresh release-PR merge at `HEAD`, creates the annotated
   `desktop-v<version>` tag and pushes that tag. The tag starts the authoritative
   Windows build, migration promotion and stable publication workflow.

There is no separate "tag PR": the version/changelog commit is reviewed in the
release PR; the tag is attached to its merged `master` commit. If another commit
lands after the release PR, prepare a fresh release PR instead of tagging an
unreviewed aggregate. A failed release is fixed on `fix/<release-defect>`,
verified, merged, and rerun; release-only work must not be mixed with an
unfinished feature branch.

## Long Codex sessions and parallel work

The branch, checkpoint commits and delivery matrix are the continuation record
when an interactive limit resets. Prefer one task/thread for one cohesive slice;
splitting the same slice across many tasks repeats context and increases merge
risk. Parallel branches are appropriate only when their ownership and files do
not overlap, or when one branch is documentation-only and cannot invalidate the
other implementation.
