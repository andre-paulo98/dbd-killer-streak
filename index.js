const config = require("./config");
const fs = require('fs');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
var cors = require('cors')

app.use(express.static('public'))
app.use(express.json());
app.use(cors());

app.set('trust proxy', config.IS_BEHIND_PROXY);

app.use(require('morgan')('combined'));

const genericOverlayData = { count: 0, percentage: 0, quantity: 0 };

app.get('/', function (req, res) {
	res.send("ok");
});

app.get('/generic-overlay', function (req, res) {
	res.sendFile(__dirname + "/generic.html");
});

app.get('/control', function (req, res) {
	res.sendFile(__dirname + "/control.html");
});

app.get('/genericData', function (req, res) {
	res.json(genericOverlayData);
});

app.post('/api/randomPerksData', function (req, res) {
	if (req.body.count === undefined || req.body.quantity === undefined) {
		return error(res, 400, "no data");
	}

	const count = parseInt(req.body.count);
	const quantity = parseInt(req.body.quantity);

	genericOverlayData.count = count;
	genericOverlayData.quantity = quantity;
	genericOverlayData.percentage = Math.round(count / quantity * 100 * 100) / 100;

	io.emit("genericData", genericOverlayData);
	res.json(genericOverlayData);
})

io.on('connection', function (socket) {
	socket.on('chat message', function (msg) {
		io.emit('chat message', msg);
	});
});

http.listen(config.PORT, function () {
	console.log('listening on *:' + config.PORT);
});


function error(res, code = 400, message = "unknown error") {
	res.status(code);
	if (typeof message === "object") {
		res.json(message);
	} else {
		res.json({ "error": true, "message": message });
	}

}