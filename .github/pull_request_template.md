## What and why

<!-- One or two sentences: the problem and the change. -->

## How it was checked

- [ ] Backend: `alembic upgrade head`, `pytest -q`, `lint-imports` (CI runs these)
- [ ] Frontend: `npm run lint`, `npx tsc --noEmit`, `npm test` (CI runs these)
- [ ] Anything run against live data or in the browser, and what you saw:

## Notes for the reviewer

- [ ] Adds an Alembic migration? Its `down_revision` is the current head, and CI's single-head check passes.
- [ ] Not verified or deferred:
