import * as path from "node:path"

import * as marked from "marked"

import {checkHttp} from "./lint-http-link.js"
import {checkLocal} from "./lint-relative-link.js"
import {getCodeLintErrors} from "./lint-code.js"
import {rel} from "../_utils.js"
import {submitTask} from "./task-queue.js"

/*
Unfortunately, most of this code is just working around a missing feature, namely that lexer tokens
don't come with location info: https://github.com/markedjs/marked/issues/2134

Be careful when trying to debug the recursion - it's pretty gnarly and, thanks to a since-fixed bug
in Marked, it took a very long time to debug.
*/

/** @param {string} contents */
export function processOne(file, contents, callback) {
	const relativePath = rel(file)
	const base = path.dirname(file)
	const syncErrors = []
	let errors = 0
	let warnings = 0
	let pending = 1

	const settle = () => {
		if (--pending === 0) {
			callback(warnings, errors)
		}
	}

	const getSpanLineCol = (startOffset, endOffset) => {
		let source = contents.slice(0, startOffset)
		let line = 1
		let prev = -1
		let next

		while ((next = source.indexOf("\n", prev + 1)) >= 0) {
			line++
			prev = next
		}

		const startLine = line
		const startCol = startOffset - prev

		source = contents.slice(0, endOffset)

		while ((next = source.indexOf("\n", prev + 1)) >= 0) {
			line++
			prev = next
		}

		const endLine = line
		const endCol = endOffset - prev

		return {startLine, startCol, endLine, endCol}
	}

	const showMessage = (startOffset, endOffset, label, message) => {
		const {startLine, startCol, endLine, endCol} = getSpanLineCol(startOffset, endOffset)
		if (!message.endsWith("\n")) message += "\n"
		if (process.env.CI === "true") {
			console.error(
				`::${label.toLowerCase()} file=${relativePath}` +
				`,line:${startLine}` +
				`,endLine=${endLine}` +
				`,col:${startCol}` +
				`,endColumn=${endCol}` +
				`::${relativePath}:${startLine}:${startCol}: ${message}`
			)
		} else {
			console.error(`${label} in ${relativePath}:${startLine}:${startCol}: ${message}`)
		}
	}

	const asyncWarnCallback = (startOffset, endOffset, message) => {
		if (message !== undefined) {
			warnings++
			showMessage(startOffset, endOffset, "Warning", message)
		}
		settle()
	}

	const asyncErrorCallback = (startOffset, endOffset, message) => {
		if (message !== undefined) {
			errors++
			showMessage(startOffset, endOffset, "Error", message)
		}
		settle()
	}

	/**
	 * @param {number} startOffset
	 * @param {marked.Tokens.TableCell[]} cells
	 */
	const visitCellList = (startOffset, parentOffset, cells, parent) => {
		for (const cell of cells) {
			parentOffset = visitList(startOffset, parentOffset, cell.tokens, parent)
		}
		return parentOffset
	}

	/**
	 * @param {number} startOffset
	 * @param {marked.MarkedToken[]} tokens
	 */
	const visitList = (startOffset, parentOffset, tokens, parent) => {
		for (const child of tokens) {
			const nextIndex = parent.raw.indexOf(child.raw, parentOffset)
			const innerStart = startOffset + (nextIndex - parentOffset)
			const outerStart = innerStart + child.raw.length
			parentOffset = nextIndex + child.raw.length
			startOffset = outerStart
			visit(innerStart, child)
		}
		return parentOffset
	}

	const visited = new Set()

	/**
	 * @param {number} startOffset
	 * @param {marked.MarkedToken} token
	 */
	const visit = (startOffset, token) => {
		const endOffset = startOffset + token.raw.length

		switch (token.type) {
			case "link": {
				// Make sure it's trimmed, so I don't have to worry about errors elsewhere.
				const href = token.href.replace(/^\s+|\s+$|#[\s\S]*$/, "")

				if (!visited.has(href)) {
					visited.add(href)

					// Prefer https: > http: where possible, but allow http: when https: is
					// inaccessible.
					if ((/^https?:\/\//).test(href)) {
						submitTask((next) => checkHttp(href, (message) => {
							next()
							asyncWarnCallback(startOffset, endOffset, message)
						}))
						pending++
					} else if (!href.includes(":")) {
						submitTask((next) => checkLocal(base, href, (message) => {
							next()
							asyncErrorCallback(startOffset, endOffset, message)
						}))
						pending++
					}
				}

				visitList(startOffset, 0, token.tokens, token)
				break
			}

			case "code": {
				const code = token.text
				const lang = token.lang || ""

				const codeErrors = getCodeLintErrors(code, lang)

				if (codeErrors.length !== 0) {
					errors += codeErrors.length
					for (const error of codeErrors) {
						syncErrors.push({startOffset, endOffset, message: error})
					}
				}

				break
			}

			case "list":
				visitList(startOffset, 0, token.items, token)
				break

			case "table": {
				let parentOffset = visitCellList(startOffset, 0, token.header, token)
				startOffset += parentOffset
				for (const row of token.rows) {
					parentOffset = visitCellList(startOffset, parentOffset, row, token)
					startOffset += parentOffset
				}
				break
			}

			default:
				if (token.tokens !== undefined) {
					visitList(startOffset, 0, token.tokens, token)
				}
		}
	}

	visitList(0, 0, marked.lexer(contents), {raw: contents.replace(/\t/g, "    ")})

	for (const {startOffset, endOffset, message} of syncErrors) {
		showMessage(startOffset, endOffset, "Error", message)
	}

	syncErrors.length = 0

	settle()
}
