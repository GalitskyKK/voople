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

Release automation runs from `master` after merge and version alignment. A
failed release is fixed on `fix/<release-defect>`, verified, merged, and rerun;
release-only work must not be mixed with an unfinished feature branch.

## Long Codex sessions and parallel work

The branch, checkpoint commits and delivery matrix are the continuation record
when an interactive limit resets. Prefer one task/thread for one cohesive slice;
splitting the same slice across many tasks repeats context and increases merge
risk. Parallel branches are appropriate only when their ownership and files do
not overlap, or when one branch is documentation-only and cannot invalidate the
other implementation.
