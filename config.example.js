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
		},
		KILLER_VERSUS: {
			SHEET_INDEX: 0,
			RANGE: "AU12:AV13",
			KILLER1_KILLS: "AU12",
			KILLER1_MATCHES: "AV13",
			KILLER2_KILLS: "AV12",
			KILLER2_MATCHES: "AV13",
		}
	},
	IS_BEHIND_PROXY: false
}
