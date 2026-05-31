// ——— GLOBALS ———————————————————————————————————————————————

let sizeSlider;
let colsSlider;
let rowsSlider;
let gapSlider;
let randomButton;

let links = [];        // one URL per Are.na block (source or block page)
let descriptions = []; // one title/label per block
let arenaImages = [];  // one p5 image (or null) per block

const CHANNEL_SLUG = "re-constructs";
const API_URL = `https://api.are.na/v2/channels/${CHANNEL_SLUG}/contents?per=16`;

// ——— ARE.NA DATA LOAD ——————————————————————————————————————

async function loadArenaChannel() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    links = [];
    descriptions = [];

    // Pre-fill with nulls so indices stay stable while images load async.
    arenaImages = new Array(data.contents.length).fill(null);

    data.contents.forEach((block, index) => {

      // Prefer the block's outward source URL.
      // If there isn't one, fall back to the block's own Are.na page.
      if (block.source && block.source.url) {
        links.push(block.source.url);
      } else {
        links.push(`https://www.are.na/block/${block.id}`);
      }

      // Use whatever title/label Are.na gives us.
      descriptions.push(
        block.title ||
        block.generated_title ||
        block.class ||
        "untitled Are.na block"
      );

      // Kick off async image load if the block has one.
      // Store by index so load order doesn't scramble the array.
      if (block.image && block.image.display && block.image.display.url) {
        loadImage(
          block.image.display.url,
          img => { arenaImages[index] = img; },  // success
          ()  => { arenaImages[index] = null; }   // failure: leave as null
        );
      }
    });

  } catch (error) {
    console.error("Are.na load failed:", error);
    links = ["#"];
    descriptions = ["could not load Are.na channel"];
    arenaImages = [null];
  }
}

// ——— IMAGE HELPER ——————————————————————————————————————————

// Draws img centred and scaled to fit inside the given box,
// preserving aspect ratio (letterbox / pillarbox as needed).
function drawImageContained(img, boxX, boxY, boxW, boxH) {
  let imgRatio = img.width / img.height;
  let boxRatio = boxW / boxH;

  let drawW, drawH;

  if (imgRatio > boxRatio) {
    // Image is wider than box: fit to width.
    drawW = boxW;
    drawH = boxW / imgRatio;
  } else {
    // Image is taller than box: fit to height.
    drawH = boxH;
    drawW = boxH * imgRatio;
  }

  let drawX = boxX + (boxW - drawW) / 2;
  let drawY = boxY + (boxH - drawH) / 2;

  image(img, drawX, drawY, drawW, drawH);
}

// ——— SETUP ————————————————————————————————————————————————

function setup() {
  let canvas = createCanvas(400, 560);
  canvas.parent("sketch-holder");

  // Sliders are hidden; their values are set by randomiseValues().
  sizeSlider = createSlider(1, 14, 2, 1);
  sizeSlider.hide();

  colsSlider = createSlider(2, 30, 14, 1);
  colsSlider.hide();

  rowsSlider = createSlider(2, 30, 14, 1);
  rowsSlider.hide();

  gapSlider = createSlider(0, 20, 4, 1);
  gapSlider.hide();

  // Generate button sits in the lower-left of the canvas.
  randomButton = createButton("generate");
  randomButton.parent("sketch-holder");
  randomButton.position(10, 525);
  randomButton.size(180, 24);
  randomButton.style("background", "none");
  randomButton.style("color", "#111");
  randomButton.style("border", "1px solid #111");
  randomButton.style("font-family", "sans-serif");
  randomButton.style("font-size", "11px");
  randomButton.style("text-transform", "lowercase");
  randomButton.style("cursor", "pointer");
  randomButton.mousePressed(randomiseValues);

  randomiseValues();   // pick random grid params on first load
  loadArenaChannel();  // fetch Are.na content
}

// ——— DRAW —————————————————————————————————————————————————

function draw() {
  if (!colsSlider || !rowsSlider || !gapSlider || !sizeSlider) return;

  background(220);

  // The clickable link grid is always 4x4, regardless of the visual grid.
  let linkcols = 4;
  let linkrows = 4;
  let linkcellW = width / linkcols;
  let linkcellH = 400 / linkrows;

  // The visual grid uses the slider values.
  let cols = colsSlider.value();
  let rows = rowsSlider.value();
  let gap  = gapSlider.value();

  let cellW = width / cols;
  let cellH = 400 / rows;

  // Which 4x4 link cell is the mouse over?
  let hoverCol = floor(mouseX / linkcellW);
  let hoverRow = floor(mouseY / linkcellH);

  let mouseIsInGrid =
    mouseX >= 0 && mouseX < width &&
    mouseY >= 0 && mouseY < 400;

  // Pixel bounds of the hovered link cell.
  let sectionLeft   = hoverCol * linkcellW;
  let sectionRight  = sectionLeft + linkcellW;
  let sectionTop    = hoverRow * linkcellH;
  let sectionBottom = sectionTop + linkcellH;

  // A slow sine pulse applied to cells inside the hovered section.
  let globalPulse = 0.75 + sin(frameCount * 0.03) * 0.25;

  // ——— Draw white background cells for the 4x4 link grid ———
  for (let y = 0; y < linkrows; y++) {
    for (let x = 0; x < linkcols; x++) {
      noStroke();
      fill(255);
      rect(x * linkcellW, y * linkcellH, linkcellW, linkcellH);
    }
  }

  // ——— Draw the visual grid (cols x rows black squares) ———
  fill(0);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let cellLeft   = x * cellW;
      let cellRight  = cellLeft + cellW;
      let cellTop    = y * cellH;
      let cellBottom = cellTop + cellH;

      // Pulse if this visual cell overlaps the hovered link section.
      let insideHoveredSection =
        mouseIsInGrid &&
        cellRight  > sectionLeft  &&
        cellLeft   < sectionRight &&
        cellBottom > sectionTop   &&
        cellTop    < sectionBottom;

      let pulse = insideHoveredSection ? globalPulse : 1;

      let cx = x * cellW + cellW / 2;
      let cy = y * cellH + cellH / 2;
      let w  = (cellW - gap * 2) * pulse;
      let h  = (cellH - gap * 2) * pulse;

      rect(cx - w / 2, cy - h / 2, w, h);
    }
  }

  // ——— Draw the hollow square shape overlay (dark grey) ———
  let shapeSize = sizeSlider.value();
  shapeSize = min(shapeSize, cols, rows); // clamp to grid dimensions

  // Centre the shape in the grid.
  let startX = floor((cols - shapeSize) / 2);
  let startY = floor((rows - shapeSize) / 2);

  fill(60);

  for (let y = 0; y < shapeSize; y++) {
    for (let x = 0; x < shapeSize; x++) {

      // Only draw the perimeter cells (hollow interior).
      let isEdge =
        x === 0 || x === shapeSize - 1 ||
        y === 0 || y === shapeSize - 1;

      if (isEdge) {
        let gx = startX + x;
        let gy = startY + y;

        let cellLeft   = gx * cellW;
        let cellRight  = cellLeft + cellW;
        let cellTop    = gy * cellH;
        let cellBottom = cellTop + cellH;

        let insideHoveredSection =
          mouseIsInGrid &&
          cellRight  > sectionLeft  &&
          cellLeft   < sectionRight &&
          cellBottom > sectionTop   &&
          cellTop    < sectionBottom;

        let pulse = insideHoveredSection ? globalPulse : 1;

        let cx = gx * cellW + cellW / 2;
        let cy = gy * cellH + cellH / 2;
        let w  = (cellW - gap * 2) * pulse;
        let h  = (cellH - gap * 2) * pulse;

        rect(cx - w / 2, cy - h / 2, w, h);
      }
    }
  }

  // ——— Work out which Are.na block is active ———
  let descriptionText = "move over a square.";
  let activeIndex = -1;

  if (mouseIsInGrid && hoverRow >= 0 && hoverRow < 4 && hoverCol >= 0 && hoverCol < 4) {
    activeIndex = hoverRow * 4 + hoverCol;
    if (descriptions[activeIndex]) {
      descriptionText = descriptions[activeIndex];
    }
  }

  // ——— Lower UI: divider line ———
  stroke(180);
  strokeWeight(1);
  line(10, 410, 390, 410);
  noStroke();

  // ——— Lower UI: description text (left half) ———
  fill(110);
  textFont("Helvetica", 11);
  textAlign(LEFT, TOP);
  text(descriptionText.toLowerCase(), 10, 425, 180, 80);

  // ——— Lower UI: image preview (right half) ———
  let previewX = 210;
  let previewY = 425;
  let previewW = 180;
  let previewH = 124;

  fill(220);
  rect(previewX, previewY, previewW, previewH); // placeholder background

  if (activeIndex >= 0 && arenaImages[activeIndex]) {
    drawImageContained(arenaImages[activeIndex], previewX, previewY, previewW, previewH);
  }
}

// ——— MOUSE CLICK: open the active block's link ——————————————

function mousePressed() {
  // Ignore clicks outside the grid area.
  if (mouseX < 0 || mouseX >= width || mouseY < 0 || mouseY >= 400) return;

  let linkcols = 4;
  let linkrows = 4;
  let linkcellW = width / linkcols;
  let linkcellH = 400 / linkrows;

  let col   = floor(mouseX / linkcellW);
  let row   = floor(mouseY / linkcellH);
  let index = row * 4 + col;

  // Every block now has a URL (source or Are.na block page), so just open it.
  if (links[index]) {
    window.open(links[index], "_blank");
  }
}

// ——— RANDOMISE: pick new grid params ————————————————————————

function randomiseValues() {
  let cols = floor(random(2, 31));
  let rows = floor(random(2, 31));

  colsSlider.value(cols);
  rowsSlider.value(rows);
  gapSlider.value(floor(random(0, 21)));

  // Shape size can't exceed the smaller grid dimension.
  let maxShape = min(cols, rows);
  sizeSlider.value(floor(random(1, maxShape + 1)));
}