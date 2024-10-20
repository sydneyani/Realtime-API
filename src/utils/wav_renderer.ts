const dataMap = new WeakMap();

/**
 * Normalizes a Float32Array to Array(m): We use this to draw amplitudes on a graph
 * If we're rendering the same audio data, then we'll often be using
 * the same (data, m, downsamplePeaks) triplets so we give option to memoize
 */
const normalizeArray = (
  data: Float32Array,
  m: number,
  downsamplePeaks: boolean = false,
  memoize: boolean = false
) => {
  let cache, mKey, dKey;
  if (memoize) {
    mKey = m.toString();
    dKey = downsamplePeaks.toString();
    cache = dataMap.has(data) ? dataMap.get(data) : {};
    dataMap.set(data, cache);
    cache[mKey] = cache[mKey] || {};
    if (cache[mKey][dKey]) {
      return cache[mKey][dKey];
    }
  }
  const n = data.length;
  const result = new Array(m);
  if (m <= n) {
    // Downsampling
    result.fill(0);
    const count = new Array(m).fill(0);
    for (let i = 0; i < n; i++) {
      const index = Math.floor(i * (m / n));
      if (downsamplePeaks) {
        // take highest result in the set
        result[index] = Math.max(result[index], Math.abs(data[i]));
      } else {
        result[index] += Math.abs(data[i]);
      }
      count[index]++;
    }
    if (!downsamplePeaks) {
      for (let i = 0; i < result.length; i++) {
        result[i] = result[i] / count[i];
      }
    }
  } else {
    for (let i = 0; i < m; i++) {
      const index = (i * (n - 1)) / (m - 1);
      const low = Math.floor(index);
      const high = Math.ceil(index);
      const t = index - low;
      if (high >= n) {
        result[i] = data[n - 1];
      } else {
        result[i] = data[low] * (1 - t) + data[high] * t;
      }
    }
  }
  if (memoize) {
    cache[mKey as string][dKey as string] = result;
  }
  return result;
};

export const WavRenderer = {
  drawSpeechVisual: (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    data: Float32Array,
    color: string,
    pointCount: number = 0,
    barWidth: number = 0,
    barSpacing: number = 0,
    center: boolean = false,
    speakingState: 'ai' | 'user'
  ) => {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Center coordinates for the ball
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const baseRadius = 50; // Base radius of the black ball

    // Log the data for debugging
    console.log("Audio Data:", data);

    ctx.beginPath();

    // Draw the black ball with a squishy effect
    const numberOfPoints = 50;
    const squishFactorMax = 10;
    const squishSpeed = 150;

    for (let i = 0; i <= numberOfPoints; i++) {
      const angle = (i / numberOfPoints) * Math.PI * 2;
      const squishFactor = Math.sin(Date.now() / squishSpeed + angle * 3) * squishFactorMax;
      const radius = baseRadius + (data[i % data.length] * 50) + squishFactor;

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

    // // Bar drawing logic (intact from your previous code)
    // pointCount = Math.floor(
    //   Math.min(
    //     pointCount,
    //     (canvas.width - barSpacing) / (Math.max(barWidth, 1) + barSpacing)
    //   )
    // );
    // if (!pointCount) {
    //   pointCount = Math.floor(
    //     (canvas.width - barSpacing) / (Math.max(barWidth, 1) + barSpacing)
    //   );
    // }
    // if (!barWidth) {
    //   barWidth = (canvas.width - barSpacing) / pointCount - barSpacing;
    // }
    // const points = normalizeArray(data, pointCount, true);
    // for (let i = 0; i < pointCount; i++) {
    //   const amplitude = Math.abs(points[i]);
    //   const height = Math.max(1, amplitude * canvas.height);
    //   const x = barSpacing + i * (barWidth + barSpacing);
    //   const y = center ? (canvas.height - height) / 2 : canvas.height - height;
    //   ctx.fillStyle = color;
    //   ctx.fillRect(x, y, barWidth, height);
    // }
  },
};

