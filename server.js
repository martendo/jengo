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
		this.turn = null;
		this.blocks = [];
		for (let i = 0; i < 54; i++)
			this.blocks.push(true);
		games.set(this.id, this);
		console.log(`Game "${this.id}" created (${games.size} games)`);
	}

	join(player) {
		if (player.game)
			console.error(`Player "${player.id}" already in game "${player.game.id}"`);
		this.players.set(player.id, player);
		player.game = this;
		const players = [];
		for (const [id, player] of this.players) {
			players.push({
				id: id,
				player: {
					points: player.points,
				},
			});
		}
		player.send({
			type: "game-joined",
			id: this.id,
			players: players,
			blocks: this.blocks,
			turn: this.turn,
		});
		player.broadcast({
			type: "player-joined",
			id: player.id,
			player: {
				points: player.points,
			},
		});
		console.log(`Player "${player.id}" joined game "${this.id}" (${this.players.size} players)`);
		if (this.turn === null) {
			this.turn = player.id;
			this.broadcast({
				type: "turn",
				id: this.turn,
			});
		}
	}

	leave(player) {
		if (player.game !== this)
			console.error(`Player "${player.id}" not in game "${this.id}"`);
		this.players.delete(player.id);
		player.broadcast({
			type: "player-left",
			id: player.id,
		});
		player.game = null;
		console.log(`Player "${player.id}" left game "${this.id}" (${this.players.size} players)`);

		if (!this.players.size) {
			games.delete(this.id);
			console.log(`Game "${this.id}" deleted (${games.size} games)`);
			return;
		}

		if (player.id === this.turn)
			this.nextTurn();
	}

	broadcast(data) {
		for (const player of this.players.values())
			player.send(data);
	}

	nextTurn() {
		const iter = this.players.keys();
		for (const id of iter) {
			if (id === this.turn)
				break;
		}
		const next = iter.next();
		if (next.done)
			this.turn = this.players.keys().next().value;
		else
			this.turn = next.value;
		this.broadcast({
			type: "turn",
			id: this.turn,
		});
	}
}

class Player {
	constructor(connection, id) {
		this.connection = connection;
		this.id = id;
		this.game = null;
		this.points = 0;
		players.set(this.id, this);
	}

	send(data) {
		this.connection.send(JSON.stringify(data));
	}

	broadcast(data) {
		if (!this.game)
			return;
		for (const player of this.game.players.values()) {
			if (player !== this)
				player.send(data);
		}
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
			case "create-game":
				const game = new Game(createUniqueId(games));
				game.join(player);
				break;
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
			case "leave-game":
				if (player.game)
					player.game.leave(player);
				break;
			default:
				console.error(`Unknown message: "${message}"`);
				break;
		}
	});
	player.send({
		type: "connected",
		id: player.id,
	});
});
