const WSS_URL = "wss://jengo-yrhacks2022.herokuapp.com";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let gameCode = null;

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

const socket = new WebSocket(WSS_URL);
socket.addEventListener("error", (event) => console.error("WebSocket error: ", event));
socket.addEventListener("close", (event) => console.log("WebSocket closed"));
socket.addEventListener("open", () => {
	console.log("WebSocket opened")
	if (window.location.hash.length)
		joinGame(decodeURIComponent(window.location.hash.slice(1)));
});
socket.addEventListener("message", (event) => {
	const data = JSON.parse(event.data);
	switch (data.type) {
		case "game-joined":
			gameCode = code;
			window.location.hash = gameCode;
			home.style.display = "none";
			game.style.display = "grid";
			resizeCanvas();
			break;
		case "game-no-exist":
			console.log("game-no-exist");
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
const game = document.getElementById("game");

function joinGame(code) {
	if (!code.length)
		return;
	sendServer({
		type: "join-game",
		id: code,
	});
}

function redrawCanvas() {
	ctx.strokeStyle = "#000000";
	ctx.lineWidth = 1;
	ctx.strokeRect(canvas.width / 2 - 50, canvas.height / 2 - 50, 100, 100);
}

function resizeCanvas() {
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	redrawCanvas();
}

window.addEventListener("resize", resizeCanvas);

window.addEventListener("popstate", () => {
	if (window.location.hash.length) {
		joinGame(decodeURIComponent(window.location.hash.slice(1)));
	} else {
		gameCode = null;
		home.style.display = "unset";
		game.style.display = "";
	}
});

const gameCodeInput = document.getElementById("game-code");
document.getElementById("create-game").addEventListener("click", () => joinGame(gameCodeInput.value));
document.getElementById("join-game").addEventListener("click", () => joinGame(gameCodeInput.value));

document.getElementById("game-code-btn").addEventListener("click", () => copyText(`${window.location.origin}${window.location.pathname}#${encodeURIComponent(gameCode)}`));

const help = document.getElementById("help");
document.getElementById("help-btn").addEventListener("click", () => {
	if (help.style.display === "")
		help.style.display = "unset";
	else
		help.style.display = "";
});
