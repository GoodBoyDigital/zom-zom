// Wraps dist-embed/embed.js into a single self-contained HTML file.
import { readFileSync, writeFileSync } from "node:fs";

const js = readFileSync("dist-embed/embed.js", "utf8").replace(/<\/script/gi, "<\\/script");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Zom Zoms</title>
<style>
  html, body { margin: 0; background: #0b0b0c; overflow: hidden; }
  #wrap { position: relative; width: 100%; aspect-ratio: 16 / 10; }
  #game { position: absolute; inset: 0; }
  #game canvas { display: block; outline: none; }
  #overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; background: rgba(0,0,0,0.72); color: #fff; font-family: "Arial Black", Arial, sans-serif; cursor: pointer; user-select: none; text-align: center; }
  #overlay h1 { margin: 0; font-size: clamp(28px, 7vw, 64px); color: #9dff4a; text-shadow: 0 4px 0 #1d3a0a; letter-spacing: 2px; }
  #overlay p { margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #ddd; }
  #overlay-text { font-size: 20px; color: #fff; }
</style>
</head>
<body>
<div id="wrap">
  <div id="game"></div>
  <div id="overlay">
    <h1>ZOM ZOMS</h1>
    <div id="overlay-text">Click to play</div>
    <p>Arrows / WASD move · mouse aims · hold click to shoot · 1 2 3 swap gun · R restart</p>
  </div>
</div>
<script>
${js}
</script>
</body>
</html>
`;
writeFileSync("dist-embed/zom-zoms.html", html);
console.log("dist-embed/zom-zoms.html", (html.length / 1024).toFixed(0) + " KB");
