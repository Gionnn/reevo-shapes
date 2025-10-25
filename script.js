class ShapeFactory {
  static createShape(type, x, y, color) {
    const graphics = new PIXI.Graphics();
    const size = 30 + Math.random() * 30;

    switch (type) {
      case 3: // Triunghi
        graphics
          .poly([0, -size, -size * 0.866, size * 0.5, size * 0.866, size * 0.5])
          .fill(color);
        break;
      case 4: // Patrat
        graphics.rect(-size / 2, -size / 2, size, size).fill(color);
        break;
      case 5: // Pentagon
        this.drawPolygon(graphics, 5, size, color);
        break;
      case 6: // Hexagon
        this.drawPolygon(graphics, 6, size, color);
        break;
      case "circle":
        graphics.circle(0, 0, size / 2).fill(color);
        break;
      case "ellipse":
        graphics.ellipse(0, 0, size / 2, size / 3).fill(color);
        break;
      case "star":
        this.drawStar(graphics, size, color);
        break;
      case "irregular":
        this.drawIrregular(graphics, size, color);
        break;
    }

    graphics.x = x;
    graphics.y = y;
    graphics.eventMode = "static";
    graphics.cursor = "pointer";

    return graphics;
  }

  static drawPolygon(graphics, sides, size, color) {
    const points = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      points.push((Math.cos(angle) * size) / 2, (Math.sin(angle) * size) / 2);
    }
    graphics.poly(points).fill(color);
  }

  static drawStar(graphics, size, color) {
    const points = [];
    const outerRadius = size / 2;
    const innerRadius = size / 4;

    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      points.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    graphics.poly(points).fill(color);
  }

  static drawIrregular(graphics, size, color) {
    const points = [];
    const numPoints = 5 + Math.floor(Math.random() * 4);

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radius = (size / 2) * (0.5 + Math.random() * 0.5);
      points.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    graphics.poly(points).fill(color);
  }

  static getRandomColor() {
    return Math.random() * 0xffffff;
  }

  static getRandomType() {
    const types = [3, 4, 5, 6, "circle", "ellipse", "star"];
    return types[Math.floor(Math.random() * types.length)];
  }
}

class ShapeManager {
  constructor() {
    this.shapes = [];
  }

  addShape(shape, velocity) {
    this.shapes.push({ shape, velocity, area: this.calculateArea(shape) });
  }

  removeShape(shape) {
    const index = this.shapes.findIndex((s) => s.shape === shape);
    if (index !== -1) {
      this.shapes.splice(index, 1);
      return true;
    }
    return false;
  }

  calculateArea(shape) {
    const bounds = shape.getBounds();
    return bounds.width * bounds.height;
  }

  getTotalArea() {
    return this.shapes.reduce((sum, s) => sum + s.area, 0);
  }

  getCount() {
    return this.shapes.length;
  }

  update(gravity, canvasHeight) {
    const toRemove = [];

    this.shapes.forEach(({ shape, velocity }) => {
      velocity.y += gravity;
      shape.y += velocity.y;

      if (shape.y > canvasHeight + 100) {
        toRemove.push(shape);
      }
    });

    toRemove.forEach((shape) => {
      this.removeShape(shape);
      if (shape.parent) {
        shape.parent.removeChild(shape);
      }
      shape.destroy();
    });
  }
}

const config = {
  width: 800,
  height: 600,
  gravity: 0.1,
  shapesPerSecond: 0.5,
  lastSpawnTime: 0,
};

(async () => {
  const app = new PIXI.Application();

  await app.init({
    width: config.width,
    height: config.height,
    backgroundColor: 0x1a1a2e,
    antialias: true,
  });

  document.getElementById("canvas-wrapper").appendChild(app.canvas);

  const container = new PIXI.Container();
  app.stage.addChild(container);

  const mask = new PIXI.Graphics()
    .rect(0, 0, config.width, config.height)
    .fill(0xffffff);
  container.mask = mask;
  app.stage.addChild(mask);

  const shapeManager = new ShapeManager();

  let shapeClicked = false;

  const spawnShape = (x, y, typeOverride = null) => {
    const type = typeOverride || ShapeFactory.getRandomType();
    const color = ShapeFactory.getRandomColor();
    const shape = ShapeFactory.createShape(type, x, y, color);

    shape.on("pointerdown", (e) => {
      shapeClicked = true;
      shapeManager.removeShape(shape);
      container.removeChild(shape);
      shape.destroy();
    });

    container.addChild(shape);
    shapeManager.addShape(shape, { x: 0, y: 0 });
  };

  app.canvas.addEventListener("click", e => {
    if (shapeClicked) {
      shapeClicked = false;
      return;
    }

    const rect = app.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = config.width / rect.width;
    const scaleY = config.height / rect.height;

    const x = clickX * scaleX;
    const y = clickY * scaleY;

    spawnShape(x, y, "irregular");
  });

  const updateStats = () => {
    document.getElementById("shape-count").textContent =
      shapeManager.getCount();
    document.getElementById("total-area").textContent = Math.round(
      shapeManager.getTotalArea(),
    );
  };

  app.ticker.add((ticker) => {
    const delta = ticker.deltaTime;
    shapeManager.update(config.gravity * delta, config.height);

    updateStats();

    const now = Date.now();
    const interval = 1000 / config.shapesPerSecond;
    if (now - config.lastSpawnTime >= interval) {
      spawnShape(Math.random() * config.width, -50);
      config.lastSpawnTime = now;
    }
  });

  document.getElementById("decrease-spawn").addEventListener("click", () => {
    config.shapesPerSecond = Math.max(0.5, config.shapesPerSecond - 0.5);
    document.getElementById("shapes-per-second").textContent =
      config.shapesPerSecond;
  });

  document.getElementById("increase-spawn").addEventListener("click", () => {
    config.shapesPerSecond = Math.min(5, config.shapesPerSecond + 0.5);
    document.getElementById("shapes-per-second").textContent =
      config.shapesPerSecond;
  });

  document.getElementById("decrease-gravity").addEventListener("click", () => {
    config.gravity = Math.max(0.1, config.gravity - 0.1);
    document.getElementById("gravity-value").textContent =
      config.gravity.toFixed(1);
  });

  document.getElementById("increase-gravity").addEventListener("click", () => {
    config.gravity = Math.min(2, config.gravity + 0.1);
    document.getElementById("gravity-value").textContent =
      config.gravity.toFixed(1);
  });
})();
