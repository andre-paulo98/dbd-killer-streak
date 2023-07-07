const config = require("./config");
const path = require('path');
const fs = require('fs');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
var cors = require('cors')

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cors());

app.set('trust proxy', config.IS_BEHIND_PROXY);

if (!fs.existsSync("./data.json")) {
	fs.writeFileSync('./data.json', JSON.stringify({ count: 0, percentage: 0, quantity: 0 }));
}

const genericOverlayData = JSON.parse(fs.readFileSync("./data.json", "UTF-8"));

const optionsFiles = {
	root: path.join(__dirname, "assets"),
}

app.get('/', function (req, res) {
	res.send("ok");
});

app.get('/overlay', function (req, res) {
	res.sendFile("generic.html", optionsFiles);
});

app.get('/control', function (req, res) {
	res.sendFile("/control.html", optionsFiles);
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

	fs.writeFileSync('./data.json', JSON.stringify(genericOverlayData));

	io.emit("genericData", genericOverlayData);
	res.json(genericOverlayData);
})

io.on('connection', function (socket) {
	socket.on('chat message', function (msg) {
		io.emit('chat message', msg);
	});
});

http.listen(config.PORT, function () {
	console.log(`\nOverlay is now running! Visit http://localhost:${config.PORT}/control in your browser to control the numbers`);
	console.log(`\nTo include the overlay in OBS, add a new browser source and set the URL to http://localhost:${config.PORT}/overlay`);
	console.log("\nHere's how to set up:");
	console.log("Width: 330");
	console.log("Height: 108");
	console.log("Custom CSS:");
	console.log(`
	body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }
	.title::after { content: '!RandomPerkStreak' !important; }
	.count::after { content: 'Killers' !important; }
	img.killer {
		background: url(https://cdn.discordapp.com/attachments/762480417361100891/1068530096496984134/ONE_BUILD_STREAK.png);
		background-position: center;
		background-size: contain;
	}`);
	console.log("\n\n");
	console.log("Change the !RandomPerkStreak to change the title, 'Killers' to be what you're counting, and the image to be on the left side. Please keep the image around the same size.")
	console.log("\n\nIf you're using the Random Build Randomizer (available on: https://dbd-randomizer-ivory.vercel.app/) you can connect the website with the overlay.")
	console.log("To do this, go to the website and press F12. Go to the console and type in the following command:")
	console.log(`\n	localStorage.setItem("overlayLink", "http://localhost:${config.PORT}/")`);
	console.log("\nThen press enter and refresh the page. You should see a yellow button near the Reset button.")

	console.log("\n\nKeep this window open to keep the overlay running. If you close this window, the overlay will stop working.")
	console.log("\nGood luck and have fun!");
	console.log("Source for this project: https://github.com/andre-paulo98/dbd-killer-streak/tree/simple-generic-overlay");

});



function error(res, code = 400, message = "unknown error") {
	res.status(code);
	if (typeof message === "object") {
		res.json(message);
	} else {
		res.json({ "error": true, "message": message });
	}

}