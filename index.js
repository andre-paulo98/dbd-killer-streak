const config = require("./config");
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const {GoogleSpreadsheet} = require('google-spreadsheet');

app.use(express.static('public'))
app.use(express.json());

app.set('trust proxy', config.IS_BEHIND_PROXY);

app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

	next();
});
app.use(require('morgan')('combined'));

//const doc = new GoogleSpreadsheet('1gb0o1VTyfhcNePcCZO6k6dXMQ8Y5M-vwZawOYljO4fM'); // copy of file for dev testing
const doc = new GoogleSpreadsheet(config.SPREADSHEET.ID);

const data = {};
parseData();

app.get('/', function (req, res) {
	res.send("ok");
});

app.get('/render', function (req, res) {
	res.sendFile(__dirname + "/render.html");
});

app.get('/data', function (req, res) {
	res.json(data);
});

app.get('/force-refresh', function (req, res) {
	io.emit("data", "refresh");
	res.send("ok")
});

app.get('/force-update', async function (req, res) {
	await parseData();
	res.json(data);
});

app.get('/webhook-send-update', async function (req, res) {
	await parseData();
	io.emit("data", data);
	res.send("ok");
});

async function parseData() {

	// authenticate Google API
	if (!doc.authMode) {
		await doc.useApiKey(config.GOOGLE_API_KEY);
	}

	// Check if file is loaded
	try {
		if (!doc.title) {
			await doc.loadInfo();
		}
	} catch (e) {
		await doc.loadInfo();
	}

	// Get first sheet from document
	const sheet = doc.sheetsByIndex[config.SPREADSHEET.SHEET_INDEX];
	await sheet.loadCells(config.SPREADSHEET.RANGE); // load required cells with data

	const nameLine = config.SPREADSHEET.LINES.NAME - 1,
		currentLine = config.SPREADSHEET.LINES.CURRENT - 1,
		bestLine = config.SPREADSHEET.LINES.BEST - 1;

	const cells = config.SPREADSHEET.RANGE.split(":");

	const colStart = sheet.getCellByA1(cells[0]).columnIndex,
		colFinish = sheet.getCellByA1(cells[1]).columnIndex;

	// parse cells
	for (let i = colStart; i <= colFinish; i++) {
		data[sheet.getCell(nameLine, i).value] = {
			c: sheet.getCell(currentLine, i).value || 0,
			b: sheet.getCell(bestLine, i).value || 0
		};
	}
}

io.on('connection', function (socket) {
	socket.on('chat message', function (msg) {
		io.emit('chat message', msg);
	});
});

http.listen(config.PORT, function () {
	console.log('listening on *:' + config.PORT);
});
