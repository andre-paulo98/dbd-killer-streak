module.exports = {
	PORT: 3000,
	GOOGLE_API_KEY: "<google api key>",
	SPREADSHEET: {
		ID: "<spreadsheet id>",
		SHEET_INDEX: 0, // check the order of the sheets at the bottom, don't forget that it starts at 0
		RANGE: "B11:V13",
		LINES: {
			BEST: 11,
			CURRENT: 12,
			NAME: 13
		}
	},
	IS_BEHIND_PROXY: false
}
