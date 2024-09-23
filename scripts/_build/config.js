export const sources = {
	"": "docs",
	"archive": "archive",
	"mithril.js": "node_modules/mithril/mithril.js",
	"mithril.min.js": "node_modules/mithril/mithril.min.js",
	"stream.js": "node_modules/mithril/stream/stream.js",
	"stream.min.js": "node_modules/mithril/stream/stream.min.js",
}

export const defaultMetaDescription = "Mithril.js Documentation"
export const metaDescriptionRegExp = /<!--meta-description\n([\s\S]+?)\n-->/m

// Minify our docs.
export const htmlMinifierConfig = {
	collapseBooleanAttributes: true,
	collapseWhitespace: true,
	conservativeCollapse: true,
	continueOnParseError: true,
	minifyCss: {
		compatibility: "ie9",
	},
	minifyJs: true,
	minifyUrls: true,
	preserveLineBreaks: true,
	removeAttributeQuotes: true,
	removeCdatasectionsFromCdata: true,
	removeComments: true,
	removeCommentsFromCdata: true,
	removeEmptyAttributes: true,
	removeOptionalTags: true,
	removeRedundantAttributes: true,
	removeScriptTypeAttributes: true,
	removeStyleLinkTypeAttributes: true,
	useShortDoctype: true,
}
