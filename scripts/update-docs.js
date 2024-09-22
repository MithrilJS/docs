#!/usr/bin/env node
/* eslint-disable no-process-exit */
"use strict"

// This is my temporary hack to simplify deployment until I fix the underlying
// problems in these bugs:
// - https://github.com/MithrilJS/mithril.js/issues/2417
// - https://github.com/MithrilJS/mithril.js/pull/2422

require("./_improve-rejection-crashing.js")

const path = require("path")
const {execFileSync} = require("child_process")
const ghPages = require("gh-pages")
const upstream = require("./_upstream")
const generate = require("./generate-docs")

async function update() {
	await generate()
	const commit = execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
		windowsHide: true,
		stdio: "inherit",
		encoding: "utf-8",
	})

	await ghPages.publish(path.resolve(__dirname, "../dist"), {
		repo: upstream.push.repo,
		remote: upstream.push.remote,
		src: ["**/*", ".nojekyll"],
		message: `Generated docs for commit ${commit}`,
	})

	console.log("Published!")
}

update()
