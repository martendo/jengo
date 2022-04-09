const myGamePiece = new component(30, 30, "#FF5A52", 22.5, 120);

function startGame() {
	myGameArea.start();
}

var myGameArea = {
	canvas : document.getElementById("bar-canvas"),
	resize : function() {
		this.canvas.width = 75;
		this.canvas.height = this.canvas.parentElement.clientHeight / 2;	},
	start : function() {
		document.getElementById("bar-stop").style.display = "unset";
		this.interval = setInterval(updateGameArea, 20);
		myGamePiece.speedX = 0;
		myGamePiece.speedY = 5;
	},
	clear : function() {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}
}
myGameArea.context = myGameArea.canvas.getContext("2d");


function component(width, height, color, x, y) {
	this.width = width;
	this.height = height;
	this.speedX = 0;
	this.speedY = 5;
	this.x = x;
	this.y = y;
	this.update = function() {
		const ctx = myGameArea.context;
		ctx.fillStyle = color;
		ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = "green";
    ctx.globalAlpha = 0.2;
    ctx.fillRect(0, 220, 75, 80);
    ctx.globalAlpha = 1.0;
	}
	this.newPos = function() {
		this.x += this.speedX;
		this.y += this.speedY;
		if (this.y > myGameArea.canvas.height - this.height) {
			this.y = myGameArea.canvas.height - this.height;
			this.speedY = -this.speedY;
		} else if (this.y < 0) {
			this.y = 0;
			this.speedY = -this.speedY;
		}
	}
}

function updateGameArea() {
	myGameArea.clear();
	myGamePiece.newPos();
	myGamePiece.update();
}

function stopGame() {
	myGamePiece.speedX = 0;
	myGamePiece.speedY = 0;
	clearInterval(myGameArea.interval);
	if (myGamePiece.y > 220 && myGamePiece.y < 300) {
		console.log('block will be taken down')
	} else {
		console.log(myGamePiece.y)
	}
}

document.getElementById("bar-stop").addEventListener("click", stopGame);
