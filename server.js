const WebSocket = require("ws");

const wss = new WebSocket.Server({port: process.env.PORT || 3000});

const players = new Map();
const games = new Map();

function createUniqueId(map, len = 4, chars = "bcdfghjklmnpqrstvwxyz0123456789") {
	let id;
	do {
		id = "";
		for (let i = 0; i < len; i++)
			id += chars[(Math.random() * chars.length) | 0];
	} while (map.has(id));
	return id;
}

class Game {
	constructor(id) {
		this.id = id;
		this.players = new Map();
		console.log(`Game "${this.id}" created (${games.size} games)`);
	}

	join(player) {
		if (player.game)
			console.error(`Player "${player.id}" already in game "${player.game.id}"`);
		this.players.set(player.id, player);
		player.game = this;
		player.send({
			type: "game-joined",
			id: this.id,
		});
		console.log(`Player "${player.id}" joined game "${this.id}" (${this.players.size} players)`);
	}

	leave(player) {
		if (player.game !== this)
			console.error(`Player "${player.id}" not in game "${this.id}"`);
		this.players.delete(player.id);
		player.game = null;
		console.log(`Player "${player.id}" left game "${this.id}" (${this.players.size} players)`);

		if (!this.players.size) {
			games.delete(this.id);
			console.log(`Game "${this.id}" deleted (${games.size} games)`);
		}
	}
}

class Player {
	constructor(connection, id) {
		this.connection = connection;
		this.id = id;
		this.game = null;
		players.set(this.id, this);
	}

	send(data) {
		this.connection.send(JSON.stringify(data));
	}
}

wss.on("connection", (socket) => {
	const player = new Player(socket, createUniqueId(players));
	console.log(`Player "${player.id}" connected (${players.size} players)`);
	socket.on("error", (error) => console.error(error));
	socket.on("close", (code) => {
		players.delete(player.id);
		console.log(`Player "${player.id}" disconnected (${players.size} players)`);
		const game = player.game;
		if (game !== null)
			game.leave(player);
		socket.close();
	});
	socket.on("message", (message) => {
		const data = JSON.parse(message);
		switch (data.type) {
			case "join-game":
				if (games.has(data.id)) {
					games.get(data.id).join(player);
				} else {
					player.send({
						type: "game-no-exist",
						id: data.id,
					});
				}
				break;
			default:
				console.error(`Unknown message: "${message}"`);
				break;
		}
	});
});
