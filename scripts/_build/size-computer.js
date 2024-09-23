// TODO: make this also check sizes for the other listed frameworks

import * as fs from "node:fs/promises"
import {gzipSync} from "node:zlib"

import {p} from "../_utils.js"

export function prettySize(size) {
	size /= 1024

	let unit = " KiB"
	if (size > 1024) {
		size /= 1024
		unit = " MiB"
	}

	if (size < 10) {
		let numerator = Math.floor(size)
		let denominator = Math.round((size % 1) * 10)
		if (denominator === 10) {
			denominator = 0
			numerator++
		}
		return `${numerator}.${denominator}${unit}`
	} else {
		return `${Math.round(size)}${unit}`
	}
}

export function prettyTime(time) {
	let unit = " ms"
	if (time > 1000) {
		time /= 1000
		unit = " s"
	}

	if (time < 100) {
		let numerator = Math.floor(time)
		let denominator = Math.round((time % 1) * 10)
		if (denominator === 10) {
			denominator = 0
			numerator++
		}
		return `${numerator}.${denominator}${unit}`
	} else {
		return `${Math.round(time)}${unit}`
	}
}

export async function getSizeTimeComparison() {
	return {
		mithril: {
			size: /** @type {number} */ (
				gzipSync(await fs.readFile(p("node_modules/mithril/mithril.min.js"))).length
			),
			time: 6.4,
		},
		vue: {
			size: 40*1024,
			time: 9.8,
		},
		react: {
			size: 64*1024,
			time: 12.1,
		},
		angular: {
			size: 135*1024,
			time: 11.5,
		},
	}
}
