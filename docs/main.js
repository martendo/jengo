const WSS_URL = "wss://jengo-yrhacks2022.herokuapp.com";

const BLOCK_WIDTH = 50;
const BLOCK_HEIGHT = 30;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let gameCode = null;
let thisId = null;
let players = new Map();
let turn = null;

let blocks = null;
let cursor = [0, 0];
let selectedBlock = null;

function copyText(text) {
	navigator.clipboard.writeText(text).catch(() => {
		console.log("navigator.clipboard.writeText failed");
		const textarea = document.createElement("textarea");
		textarea.style.position = "fixed";
		textarea.style.top = "-1000px";
		textarea.value = text;
		document.body.appendChild(textarea);
		textarea.select();
		document.execCommand("copy");
		document.body.removeChild(textarea);
	});
}

const scoreboardTbody = document.getElementById("scoreboard-tbody");

function updateScoreboard() {
	for (let i = scoreboardTbody.children.length - 1; i >= 0; i--)
		scoreboardTbody.removeChild(scoreboardTbody.children[i]);
	const row = scoreboardTbody.insertRow(-1);
	for (const [id, player] of players) {
		const row = scoreboardTbody.insertRow(-1);
		row.insertCell(0).textContent = id === thisId ? "You" : id;
		row.insertCell(1).textContent = player.points;
	}
}

const socket = new WebSocket(WSS_URL);
socket.addEventListener("error", (event) => console.error("WebSocket error: ", event));
socket.addEventListener("close", (event) => {
	console.log("WebSocket closed");
	document.getElementById("ws-closed").style.display = "block";
});
socket.addEventListener("open", () => {
	console.log("WebSocket opened");
	if (window.location.hash.length) {
		sendServer({
			type: "join-game",
			id: decodeURIComponent(window.location.hash.slice(1)),
		});
	}
});
socket.addEventListener("message", (event) => {
	const data = JSON.parse(event.data);
	switch (data.type) {
		case "connected":
			thisId = data.id;
			break;
		case "game-joined":
			joinGame(data.id);
			players = new Map();
			for (const p of data.players)
				players.set(p.id, p.player);
			updateScoreboard();
			setTurn(data.turn);
			blocks = data.blocks;
			resizeCanvas();
			redrawCanvas();
			break;
		case "game-no-exist":
			document.getElementById("game-no-exist").style.display = "block";
			window.history.replaceState(null, "", window.location.pathname);
			break;
		case "player-joined":
			players.set(data.id, data.player);
			updateScoreboard();
			break;
		case "player-left":
			players.delete(data.id);
			updateScoreboard();
			break;
		case "turn":
			selectedBlock = null;
			setTurn(data.id);
			redrawCanvas();
			break;
		case "block-removed":
			blocks[data.index] = false;
			selectedBlock = null;
			redrawCanvas();
			break;
		case "block-selected":
			selectedBlock = data.index;
			if (data.id === thisId)
				startGame();
			redrawCanvas();
			break;
		default:
			console.error(`Unknown message: "${data}"`);
			break;
	}
});

function sendServer(data) {
	socket.send(JSON.stringify(data));
}

const home = document.getElementById("home");
const join = document.getElementById("join-game");
const game = document.getElementById("game");

function joinGame(code) {
	gameCode = code;
	window.location.hash = gameCode;
	gameCodeBtn.textContent = gameCode;
	home.style.display = "none";
	join.style.display = "";
	game.style.display = "grid";
}

function leaveGame() {
	sendServer({
		type: "leave-game",
	});
	gameCode = null;
	window.history.replaceState(null, "", window.location.pathname);
	home.style.display = "";
	join.style.display = "";
	game.style.display = "";
}

function setTurn(id) {
	turn = id;
	let whose;
	stopGame(false);
	if (turn === thisId) {
		whose = "Your";
	} else {
		whose = `${turn}'s`;
	}
	document.getElementById("turn").textContent = whose;
}

function drawBlock(x, y, select, highlight) {
	let offset = BLOCK_WIDTH * 2;
	if (y % 2)
		offset = -offset;
	let selected = false;
	ctx.strokeStyle = "#820000";
	ctx.lineWidth = 1;
	const originx = canvas.width / 2 + x * offset / 3;
	const originy = canvas.height / 2 + BLOCK_HEIGHT * 12 - y * BLOCK_HEIGHT - BLOCK_WIDTH * x / 3;
	ctx.beginPath();
	ctx.moveTo(originx, originy);
	ctx.lineTo(originx + offset / 3, originy - BLOCK_WIDTH / 3);
	ctx.lineTo(originx + offset / 3, originy - BLOCK_WIDTH / 3 - BLOCK_HEIGHT);
	ctx.lineTo(originx, originy - BLOCK_HEIGHT);
	ctx.closePath();
	if (select && ctx.isPointInPath(cursor[0], cursor[1])) {
		selected = true;
	} else if (!select) {
		if (highlight)
			ctx.fillStyle = "#ff0000";
		else if (y % 2)
			ctx.fillStyle = "#eb5850";
		else
			ctx.fillStyle = "#ff7b69";
		ctx.fill();
		ctx.stroke();
	}
	if (x === 0 || !blocks[y * 3 + x - 1]) {
		ctx.beginPath();
		ctx.moveTo(originx, originy);
		ctx.lineTo(originx - offset, originy - BLOCK_WIDTH);
		ctx.lineTo(originx - offset, originy - BLOCK_WIDTH - BLOCK_HEIGHT);
		ctx.lineTo(originx, originy - BLOCK_HEIGHT);
		ctx.closePath();
		if (select && ctx.isPointInPath(cursor[0], cursor[1])) {
			selected = true;
		} else if (!select) {
			if (highlight)
				ctx.fillStyle = "#ff0000";
			else if (y % 2)
				ctx.fillStyle = "#ff7b69";
			else
				ctx.fillStyle = "#eb5850";
			ctx.fill();
			ctx.stroke();
		}
	}
	ctx.beginPath();
	ctx.moveTo(originx + offset / 3, originy - BLOCK_WIDTH / 3 - BLOCK_HEIGHT);
	ctx.lineTo(originx - offset * 2 / 3, originy - BLOCK_WIDTH * 4 / 3 - BLOCK_HEIGHT);
	ctx.lineTo(originx - offset, originy - BLOCK_WIDTH - BLOCK_HEIGHT);
	ctx.lineTo(originx, originy - BLOCK_HEIGHT);
	ctx.closePath();
	if (select && ctx.isPointInPath(cursor[0], cursor[1])) {
		selected = true;
	} else if (!select) {
		if (highlight)
			ctx.fillStyle = "#ff0000";
		else
			ctx.fillStyle = "#ff9d80";
		ctx.fill();
		ctx.stroke();
	}
	return selected;
}

function getSelectedBlock() {
	if (turn !== thisId)
		return null;
	for (let y = 17; y >= 0; y--) {
		for (let x = 0; x < 3; x++) {
			if (blocks[y * 3 + x] && drawBlock(x, y, true, false))
				return y * 3 + x;
		}
	}
	return null;
}

function redrawCanvas() {
	if (blocks === null)
		return;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	const selected = getSelectedBlock();
	for (let y = 0; y < 18; y++) {
		for (let x = 0; x < 3; x++) {
			if (blocks[y * 3 + x])
				drawBlock(x, y, false, y * 3 + x === selected || y * 3 + x === selectedBlock);
		}
	}
}

function resizeCanvas() {
	myGameArea.resize();
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	redrawCanvas();
}

window.addEventListener("resize", resizeCanvas);

window.addEventListener("popstate", () => {
	if (window.location.hash.length) {
		if (window.location.hash.slice(1) === gameCode)
			return;
		sendServer({
			type: "join-game",
			id: decodeURIComponent(window.location.hash.slice(1)),
		});
	} else {
		leaveGame();
	}
});

canvas.addEventListener("pointermove", (event) => {
	cursor[0] = event.offsetX;
	cursor[1] = event.offsetY;
	redrawCanvas();
});
canvas.addEventListener("pointerdown", (event) => {
	const selected = getSelectedBlock();
	if (selected !== null) {
		sendServer({
			type: "select-block",
			index: selected,
		});
	}
});

const gameCodeInput = document.getElementById("game-code");
document.getElementById("create-game-btn").addEventListener("click", () => {
	sendServer({
		type: "create-game",
	});
});
document.getElementById("join-game-btn").addEventListener("click", () => {
	home.style.display = "none";
	join.style.display = "block";
	game.style.dispaly = "";
});
document.getElementById("join-game-submit").addEventListener("click", () => {
	if (!gameCodeInput.value.length)
		return;
	sendServer({
		type: "join-game",
		id: gameCodeInput.value,
	});
});
document.getElementById("join-game-back").addEventListener("click", () => {
	home.style.display = "";
	join.style.display = "";
	game.style.display = "";
});
document.getElementById("game-no-exist-close").addEventListener("click", () => {
	document.getElementById("game-no-exist").style.display = "";
});

const gameCodeBtn = document.getElementById("game-code-btn");
gameCodeBtn.addEventListener("click", () => copyText(`${window.location.origin}${window.location.pathname}#${encodeURIComponent(gameCode)}`));

const help = document.getElementById("help");
document.getElementById("help-btn").addEventListener("click", () => {
	help.style.display = "block";
});
document.getElementById("help-close").addEventListener("click", () => {
	help.style.display = "";
});

document.getElementById("ws-closed-close").addEventListener("click", () => {
	document.getElementById("ws-closed").style.display = "";
});
