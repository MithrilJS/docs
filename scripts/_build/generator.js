import * as fs from "node:fs/promises"
import * as path from "node:path"

import * as HTMLMinifier from "html-minifier-terser"
import escapeRegExp from "escape-string-regexp"
import {marked} from "marked"

import * as config from "./config.js"
import {copy, p, rel, write} from "../_utils.js"
import {getSizeTimeComparison, prettySize, prettyTime} from "./size-computer.js"

export async function generateAll() {
	const [generate] = await Promise.all([
		makeGenerator(),
		(async() => {
			await fs.rm(p("dist"), {recursive: true, force: true})
			await fs.mkdir(p("dist"), {recursive: true})
		})()
	])
	await Promise.all(Object.values(config.sources).map((name) => generate(p(name))))
	return generate
}

let latestVersionCache

function getLatestVersions() {
	return latestVersionCache ??= (async() => {
		const keys = ["mithril"]

		const entries = await Promise.all(keys.map(async(pkg) => {
			const pkgData = await fs.readFile(p("node_modules", pkg, "package.json"), "utf-8")
			const {version} = JSON.parse(pkgData)
			return [pkg, version]
		}))

		console.log("Current versions:")
		for (const [key, value] of entries) {
			console.log(`- ${key}: ${value}`)
		}
		console.log()

		return Object.fromEntries(entries)
	})()
}

export function resolveLocations(file) {
	const relative = rel(file)

	for (const [prefix, source] of Object.entries(config.sources)) {
		if (!relative.startsWith(source)) continue
		if (relative.length !== source.length && relative[source.length] !== "/") continue

		let target = p("dist", prefix, relative.slice(source.length + 1))

		if (prefix === "" && target.endsWith(".md")) {
			target = target.slice(0, -3) + ".html"
		}

		return {target, relative}
	}

	throw new Error(`File not tracked: ${relative} -> ${file}`)
}

function encodeHTML(str) {
	return str.replace(/[&"'<>]/g, (char) => {
		switch (char) {
			case "&": return "&amp;"
			case "\"": return "&quot;"
			case "'": return "&#39;"
			case "<": return "&lt;"
			case ">": return "&gt;"
		}
	})
}

function extractMetaDescription(markdown) {
	return encodeHTML(markdown.match(config.metaDescriptionRegExp)?.[1] ?? config.defaultMetaDescription)
}

export async function makeGenerator() {
	const [guides, methods, layout, versions, sizeTimeComparison] = await Promise.all([
		fs.readFile(p("docs/nav-guides.md"), "utf-8"),
		fs.readFile(p("docs/nav-methods.md"), "utf-8"),
		fs.readFile(p("docs/layout.html"), "utf-8"),
		getLatestVersions(),
		getSizeTimeComparison(),
	])

	async function compilePage(file, markdown) {
		const filePath = rel(file)
		file = path.basename(file)
		const fileLink = new RegExp(`([ \t]*)(- )(\\[.+?\\]\\(${escapeRegExp(file)}\\))`)
		const src = fileLink.test(guides) ? guides : methods
		const metaDescription = extractMetaDescription(markdown)
		let body = markdown

		// fix pipes in code tags
		body = body.replace(/`((?:\S| -> |, )+)(\|)(\S+)`/gim,
			(_match, a, b, c) => `<code>${(a + b + c).replace(/\|/g, "&#124;")}</code>`
		)

		// inject menu
		body = body.replace(
			/(^# .+?(?:\r?\n){2,}?)(?:(-(?:.|\r|\n)+?)((?:\r?\n){2,})|)/m,
			(_outer, title, nav) => `${title}${src.replace(fileLink, (_inner, space, li, link) => {
				if (nav) {
					return `${space}${li}**${link}**\n${
						nav.replace(/(^|\n)/g, `$1\t${space}`)
					}`
				} else {
					return `${space}${li}**${link}**`
				}
			})}\n\n`
		)

		// fix links
		body = body.replace(/\]\((?!\w+:\/\/)(.+?)\.md([)#])/gim, "]($1.html$2")

		let markedHtml = marked(body)

		// inject anchors
		const anchorIds = new Map()

		markedHtml = markedHtml.replace(
			/<h([2-5])>(.+?)<\/h\1>/gim,
			(_match, n, text) => {
				let anchor = text.toLowerCase()
					.replace(/<\/?code>/g, "")
					.replace(/<a.*?>.+?<\/a>/g, "")
					.replace(/[.`[\]/()]|&quot;/g, "")
					.replace(/\s/g, "-")

				const anchorId = anchorIds.get(anchor)
				anchorIds.set(anchor, anchorId != null ? anchorId + 1 : 0)
				if (anchorId != null) anchor += anchorId
				return `<h${n} id="${anchor}"><a href="#${anchor}">${text}</a></h${n}>`
			}
		)

		const title = body.match(/^#\s+([^\n\r]+)/m) || []

		let result = layout
		if (title[1]) {
			result = result.replace(
				/<title>Mithril\.js<\/title>/,
				`<title>${title[1]} - Mithril.js</title>`
			)
		}

		// update version
		result = result.replaceAll("[version]", versions.mithril)

		// insert parsed HTML
		result = result.replaceAll("[body]", markedHtml)

		// insert meta description
		result = result.replaceAll("[metaDescription]", metaDescription)

		// show framework sizes
		{
			const maxSize = Math.max(...Object.values(sizeTimeComparison).map((e) => e.size))
			const maxTime = Math.max(...Object.values(sizeTimeComparison).map((e) => e.time))
			const maxRatio = 0.7

			const round = (v) => (
				v.toPrecision(3)
					.replace(/\.0*$/, "")
					.replace(/(\.\d*[^0\D])0+$/, "$1")
			)

			for (const [key, {size, time}] of Object.entries(sizeTimeComparison)) {
				result = result.replaceAll(`[size:${key}]`, prettySize(size))
				result = result.replaceAll(`[pctSize:${key}]`, `${round(size / maxSize * maxRatio * 100)}%`)
				// Slightly longer, but makes for a really nice point.
				result = result.replaceAll(`[animSize:${key}]`, `${round(size / (100 * 1024))}s`)
				result = result.replaceAll(`[time:${key}]`, prettyTime(time))
				result = result.replaceAll(`[pctTime:${key}]`, `${round(time / maxTime * maxRatio * 100)}%`)
				// Slightly longer, but makes for a really nice point.
				result = result.replaceAll(`[animTime:${key}]`, `${round(time / 10)}s`)
			}
		}

		// Insert source file edit path
		result = result.replaceAll("[editPath]", filePath)

		return result
	}

	return async function generate(file) {
		const {target, relative} = resolveLocations(file)

		if (relative === "docs" || relative.startsWith("docs/")) {
			if ((/\.(?:md|html)$/).test(relative)) {
				let html = await fs.readFile(file, "utf-8")
				if (file.endsWith(".md")) html = await compilePage(file, html)
				html = await HTMLMinifier.minify(html, config.htmlMinifierConfig)
				await write(target, html)
				console.log(`Compiled: ${relative}`)
				return
			}

			try {
				const names = await fs.readdir(file)
				await Promise.all(names.map((name) => generate(path.join(file, name))))
				return
			} catch (e) {
				if (e.code !== "ENOTDIR") throw e
			}
		}

		return copy(file, target, `Copied: ${relative}`)
	}
}
