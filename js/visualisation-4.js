export function startVisualisationFour(container, state) {
  container.innerHTML = `
    <section class="page fullscreen">
      <div id="collaboratorFourApp" class="collaborator-app" data-visualisation="vis7">
        <canvas id="collaboratorFourCanvas"></canvas>
      </div>
    </section>
  `;

  const canvas = container.querySelector("#collaboratorFourCanvas");
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    const rect = canvas.parentElement?.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect?.width || window.innerWidth));
    const height = Math.max(420, Math.floor(rect?.height || window.innerHeight));
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  return () => {
    window.removeEventListener("resize", resizeCanvas);
  };
}
