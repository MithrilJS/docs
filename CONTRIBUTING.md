# Contributing

Contributing to the docs is pretty easy.

If it's just a single typo fix or similar in just one file, you can just do it straight from the web interface or the GitHub app:

1. Find the page you're looking for. Example: https://mithril.js.org/animation.html
2. Go to the same-named path in the `docs/` directory here. Example: https://github.com/MithrilJS/docs/blob/main/docs/animation.md
3. Click the pencil icon to edit.
4. Make the changes you want.
5. Click "Commit changes" and fill out that mini form. Description is optional, but helpful if you need more explanation than the title can afford.
6. Click "Propose changes" and go through the form to create a pull request. Make sure the checkbox to allow maintainer edits is checked, so we can more easily merge it if it can't be merged cleanly.

If it's something bigger, you can roughly follow [these instructions here](https://mithril.js.org/contributing.html#how-do-i-send-a-pull-request?). For the docs, there really isn't anything to test, so you can skip that step for those. Elsewhere, testing is all manual.

## Scripts, or how to view the docs as you're editing them locally

There's a few commands you can use to help hash out larger changes. The last command is the one you'll likely be using the most.

> Note that you'll need to run `npm install` to run any of these (and obviously, you'll need to have Node installed). Also, you'll need Node v20.12.2 or later.

- `npm run lint:docs`: Lint just the docs.
- `npm run lint`: Lint the docs and scripts.
- `npm run build`: Build the docs.
- `npm run watch`: Build the docs on change, lint the docs on change, and start a local server to view the generated docs at `http://localhost:8080/`.
