# Schema compatibility

This page is for people who change LiteEditor itself. Site owners only need the promise below.

## The promise

A `.liteditor` file that is valid for a released LiteEditor version must stay valid for every later version.

Site repositories depend on their config without being updated in lockstep with the editor. A new LiteEditor release must never make an existing site's config fail to load.

## What the check enforces

The check compares the current schema (`src/types/schema.ts`, exported as JSON Schema) with every snapshot in `_history/`. It is implemented in `scripts/lib/schema-compat.ts`.

**Breaking (rejected):**

- Removing a field type, or a property that used to be accepted.
- Narrowing a `type` or removing a value from an `enum`.
- Making a property `required`.
- Changing the type of an existing property.
- Rejecting properties that used to be accepted (`additionalProperties: false` added).
- Tightening a length, size or numeric bound, or changing a `pattern` or `format`.

**Compatible (accepted):**

- New optional properties at any level, including new top-level keys such as a new `elements` option.
- New field types (new variants of the field union).
- Wider `enum` values.

The check is conservative. If it cannot prove that the new schema accepts everything the old one did, it reports a problem. If it meets a JSON Schema keyword it does not understand, it fails instead of guessing. Extend the checker before you release a schema that uses a new keyword.

## Snapshots in `_history/`

Each release writes `_history/v<version>.schema.json`, a JSON Schema generated from `LiteEditorConfigSchema`. The directory currently holds `v0.1.0` and `v0.2.0`.

- Never edit an existing snapshot. It is the record of what older configs must still satisfy.
- Snapshots are created only by the release script.

## `npm run schema:check`

```sh
npm run schema:check   # compare the current schema with every snapshot
npm run schema:test    # unit tests for the checker
npm test               # schema tests plus element tests
```

`schema:check` exits with status 1 and lists the breaking changes per version when the schema is incompatible. It prints a confirmation otherwise. With no snapshots it reports that there is nothing to check yet.

The check runs in CI, in `.github/workflows/deploy-pages.yml`, before the build, so an incompatible change cannot be deployed. It runs against every snapshot, not only the last one, so a breaking change fails even before a release is cut.

## Making a schema change

1. Prefer an additive change: an optional property, a new field type, or a wider enum.
2. If the change must remove or narrow something, keep accepting the old shape and add the new one alongside it. The check does not take the version number into account: a removal fails even on a major bump.
3. Run `npm run schema:check`. Fix every reported problem before you continue.
4. Update the docs in `docs/` that describe the changed option.

## The release script

```sh
npm run release -- patch            # or minor, major, or an explicit x.y.z
npm run release -- minor --dry-run  # check only, change nothing
```

The script (`scripts/release.ts`) does the following, in order:

1. Refuses to run if the git work tree has uncommitted changes, or if the tag `v<version>` already exists.
2. Checks the current schema against every snapshot and aborts on any breaking change. `--dry-run` stops here.
3. Bumps `version` in `package.json` and `package-lock.json`.
4. Writes `_history/v<version>.schema.json`.
5. Commits the three files as `release v<version>` and creates the annotated tag `v<version>`.

Nothing is pushed. The script prints the command to run next:

```sh
git push && git push origin v<version>
```

The script does not choose the bump for you. Pick `patch`, `minor` or `major` yourself, or pass an explicit version.

Next: [Documentation index](README.md)
