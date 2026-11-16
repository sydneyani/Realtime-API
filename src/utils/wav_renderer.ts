/**
 * Draws a blob that deforms with the current frequency samples.
 * User and assistant audio each have their own canvas.
 */
export const WavRenderer = {
  drawSpeechVisual: (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    data: Float32Array
  ) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const baseRadius = 50;
    const numberOfPoints = 50;
    const squishFactorMax = 10;
    const squishSpeed = 150;

    ctx.beginPath();

    for (let i = 0; i <= numberOfPoints; i++) {
      const angle = (i / numberOfPoints) * Math.PI * 2;
      const squishFactor =
        Math.sin(Date.now() / squishSpeed + angle * 3) * squishFactorMax;
      const sample = data.length ? data[i % data.length] : 0;
      const radius = baseRadius + sample * 50 + squishFactor;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.fillStyle = 'black';
    ctx.fill();
  },
};
