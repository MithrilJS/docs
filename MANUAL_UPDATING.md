# Manual docs updates

Updates to the site are normally built and published automatically, but manual local updates can be done via `scripts/update-docs.js`.

```bash
# These steps assume that MithrilJS/mithril.js is a git remote named "mithriljs"

# Ensure your next branch is up to date
$ git checkout next
$ git pull mithriljs next

# Manually ensure that no new feature docs were added

$ node scripts/update-docs
```

After the docs build completes, the updated docs should appear on https://mithril.js.org in a few minutes.

**Note:** When updating the stable version with a release candidate out, ***make sure to update the index + navigation to point to the new stable version!!!***
