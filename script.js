const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

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

resizeCanvas();
