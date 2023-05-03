const config = require("./config");
const fs = require('fs');
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
const allPerksData = {count: 0, percentage: 0, quantity: 0, addons: {b: {q: 0, t: 4}, y: {q: 0, t: 5}, g: {q: 0, t: 5}, p: {q: 0, t: 4}, i: {q: 0, t: 2}}};
let timer = {started: 0, isRunning: false, isVisible: false};
parseData();

app.get('/', function (req, res) {
	res.send("ok");
});

app.get('/render', function (req, res) {
	res.sendFile(__dirname + "/render.html");
});

app.get('/mini-render/', function (req, res) {
	res.send("ERROR: Add a killer to the URL. Example: /mini-render/Nemesis");
});

app.get('/mini-render/:killer', function (req, res) {

	if(req.params.killer) {
		if(!data[req.params.killer]) {
			res.send("ERROR: THE KILLER '"+req.params.killer+"' DOES NOT EXIST! USE AS IT IS ON THE DOCUMENT.");
			return;
		}
		let file = fs.readFileSync('mini-render.html', 'utf8');
		if(file)
			res.send(file.replace(/__KILLER__/ig, req.params.killer));
	} else {
		res.send("ERROR: Add a killer to the URL. Example: /mini-render/Nemesis");
	}


	//res.sendFile(__dirname + "/mini-render.html");
});

app.get('/all-perk-overlay/', function (req, res) {
	res.sendFile(__dirname + "/allperks.html");
});
app.get('/all-perk-overlay/big', function (req, res) {
	res.sendFile(__dirname + "/allperks-big.html");
});
app.get('/all-addons-overlay/', function (req, res) {
	res.sendFile(__dirname + "/addons.html");
});
app.get('/all-addons-overlay/big', function (req, res) {
	res.sendFile(__dirname + "/addons-big.html");
});

app.get('/data', function (req, res) {
	res.json(data);
});

app.get('/allPerkData', function (req, res) {
	res.json(allPerksData);
});

app.get('/force-refresh', function (req, res) {
	io.emit("data", "refresh");
	io.emit("allPerkData", "refresh");
	res.send("ok")
});

app.get('/fix-data', async function (req, res) {
	await parseData();
	io.emit("data", "refresh");
	res.send("Overlay should be good now!")
});

app.get('/hide', function (req, res) {
	io.emit("data", "hide");
	res.send("ok")
});

app.get('/candb', function (req, res) {
	io.emit("data", "animate");
	res.send("done 👍");
});

app.get('/force-update', async function (req, res) {
	await parseData();
	res.json(data);
});

app.get('/webhook-send-update', async function (req, res) {
	await parseData();
	io.emit("data", data);
	io.emit("allPerkData", allPerksData);
	res.send("ok");
});

app.get('/confetti/:killer', async function (req, res) {
	io.emit("data", {"confetti": req.params.killer});
	res.send("ok");
});

app.get('/fireworks', async function (req, res) {
	io.emit("data", "fireworks");
	res.send("ok");
});

app.get('/chaseTimer/screen', function (req, res) {
	res.sendFile(__dirname + "/chase-time-screen.html");
});

app.get('/chaseTimer/button', function (req, res) {
	res.sendFile(__dirname + "/chase-time-button.html");
});

app.get('/data/timer', function (req, res) {
	res.json(timer);
});

app.get('/api/timer/start', function (req, res) {
	if(req.query.minutes) {
		timer.end = new Date().getTime() + (req.query.minutes * 60 * 1000);
	} else {
		timer.started = new Date().getTime();
	}
	console.log(timer);
	timer.isRunning = true;
	timer.isVisible = true;
	io.emit("timer", {...timer, justStarted: true});
	res.json(timer);
});

app.get('/api/timer/stop', function (req, res) {
	timer.isRunning = false;
	timer.isVisible = true;
	io.emit("timer", timer);
	res.json(timer);
});

app.get('/api/timer/hide', function (req, res) {
	timer.started = 0;
	timer.isRunning = false;
	timer.isVisible = false;
	io.emit("timer", timer);
	res.json(timer);
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

	///// All Perk Streak

	const sheetAllPerk = doc.sheetsByIndex[config.SPREADSHEET.ALL_PERK_STREAK.SHEET_INDEX];
	await sheetAllPerk.loadCells(config.SPREADSHEET.ALL_PERK_STREAK.RANGE);

	let percentageFullValue = ((sheetAllPerk.getCellByA1(config.SPREADSHEET.ALL_PERK_STREAK.CELL_PERCENTAGE).value) * 100)

	allPerksData.count = sheetAllPerk.getCellByA1(config.SPREADSHEET.ALL_PERK_STREAK.CELL_COUNT).value;
	allPerksData.percentage = percentageFullValue.toFixed(2);
	let formula = (sheetAllPerk.getCellByA1(config.SPREADSHEET.ALL_PERK_STREAK.CELL_PERCENTAGE).formula).match(/.*?\/(\d*)/);
	//allPerksData.quantity = parseInt(formula[1]);
	allPerksData.quantity = Math.round(allPerksData.count * 100 / percentageFullValue);
	let keys = Object.keys(allPerksData.addons);

	for (let i = config.SPREADSHEET.ALL_PERK_STREAK.ADDONS_FIRST_ROW, j = 0; i <= config.SPREADSHEET.ALL_PERK_STREAK.ADDONS_LAST_ROW; i++, j++) {
		let v = sheetAllPerk.getCell(i, config.SPREADSHEET.ALL_PERK_STREAK.ADDONS_COLUMN_NUMBER).value;
		allPerksData.addons[keys[j]].q = v;
	}
	console.log(allPerksData);
}

io.on('connection', function (socket) {
	socket.on('chat message', function (msg) {
		io.emit('chat message', msg);
	});
});

http.listen(config.PORT, function () {
	console.log('listening on *:' + config.PORT);
});
