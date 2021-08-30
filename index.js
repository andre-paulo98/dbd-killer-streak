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

app.get('/data', function (req, res) {
	res.json(data);
});

app.get('/force-refresh', function (req, res) {
	io.emit("data", "refresh");
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
}

io.on('connection', function (socket) {
	socket.on('chat message', function (msg) {
		io.emit('chat message', msg);
	});
});

http.listen(config.PORT, function () {
	console.log('listening on *:' + config.PORT);
});
