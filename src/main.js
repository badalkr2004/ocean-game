const canvas = document.getElementById("canvas");
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";

class BeachCleanupGame {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.garbage = [];
    this.collectedGarbage = {
      plastic: [],
      glass: [],
      metal: [],
    };
    this.score = 0;
    this.isGameComplete = false;
    this.isSelfieMode = false;
    this.loadingManager = new THREE.LoadingManager();
    this.setupLoadingScreen();
    this.init();
  }

  setupLoadingScreen() {
    this.loadingScreen = document.createElement("div");
    this.loadingScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-size: 24px;
            z-index: 1000;
        `;
    this.loadingScreen.textContent = "Loading Game Assets...";
    document.body.appendChild(this.loadingScreen);

    this.loadingManager.onLoad = () => {
      this.loadingScreen.remove();
    };
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 5, 10);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    this.setupLighting();
    this.loadAssets().then(() => {
      this.createEnvironment();
      this.createGarbage();
      this.createPlayer();
      this.createBins();
      this.createUI();
      this.createInventoryUI();
      this.createInstructions();
      this.animate();
    });

    window.addEventListener("resize", () => this.onWindowResize());
    document.addEventListener("keydown", (e) => this.handleKeyPress(e));
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(50, 50, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    this.scene.add(sunLight);
  }

  async loadAssets() {
    // const fontLoader = new FontLoader(this.loadingManager);
    // this.font = await new Promise((resolve) => {
    //   fontLoader.load("fonts/helvetiker_regular.typeface.json", resolve);
    // });

    const textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.textures = {
      sand: await new Promise((resolve) => {
        textureLoader.load("sand.jpg", resolve);
      }),
      water: await new Promise((resolve) => {
        textureLoader.load("water.jpg", resolve);
      }),
    };
  }

  createEnvironment() {
    // Sky
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      side: THREE.BackSide,
    });
    this.scene.add(new THREE.Mesh(skyGeometry, skyMaterial));

    // Sand
    const sandGeometry = new THREE.PlaneGeometry(100, 100, 100, 100);
    const sandMaterial = new THREE.MeshStandardMaterial({
      map: this.textures.sand,
      roughness: 1,
      metalness: 0,
    });
    const sand = new THREE.Mesh(sandGeometry, sandMaterial);
    sand.rotation.x = -Math.PI / 2;
    sand.receiveShadow = true;
    this.scene.add(sand);

    // Ocean
    const oceanGeometry = new THREE.PlaneGeometry(1000, 1000);
    const oceanMaterial = new THREE.MeshStandardMaterial({
      map: this.textures.water,
      transparent: true,
      opacity: 0.8,
    });
    const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.1;
    ocean.position.z = -300;
    this.scene.add(ocean);
  }

  createGarbage() {
    const garbageTypes = [
      {
        geometry: new THREE.BoxGeometry(0.5, 0.5, 0.5),
        color: 0xff0000,
        type: "plastic",
        name: "Plastic Bottle",
      },
      {
        geometry: new THREE.SphereGeometry(0.3),
        color: 0x00ff00,
        type: "glass",
        name: "Glass Bottle",
      },
      {
        geometry: new THREE.CylinderGeometry(0.2, 0.2, 0.6),
        color: 0x0000ff,
        type: "metal",
        name: "Metal Can",
      },
    ];

    for (let i = 0; i < 15; i++) {
      const garbageType =
        garbageTypes[Math.floor(Math.random() * garbageTypes.length)];
      const garbage = new THREE.Mesh(
        garbageType.geometry,
        new THREE.MeshStandardMaterial({
          color: garbageType.color,
          roughness: 0.5,
          metalness: 0.5,
        })
      );

      garbage.position.set(
        Math.random() * 40 - 20,
        0.5,
        Math.random() * 20 - 10
      );
      garbage.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      garbage.userData = {
        type: garbageType.type,
        name: garbageType.name,
      };
      garbage.castShadow = true;

      this.garbage.push(garbage);
      this.scene.add(garbage);
    }
  }

  createPlayer() {
    const playerGeometry = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    playerGeometry.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2;
    playerGeometry.add(head);

    this.player = playerGeometry;
    this.player.castShadow = true;
    this.scene.add(this.player);
  }

  createBins() {
    const binTypes = [
      {
        color: 0xff0000,
        type: "plastic",
        position: new THREE.Vector3(8, 0, 8),
      },
      { color: 0x00ff00, type: "glass", position: new THREE.Vector3(10, 0, 8) },
      { color: 0x0000ff, type: "metal", position: new THREE.Vector3(12, 0, 8) },
    ];

    this.bins = binTypes.map((bin) => {
      const binGroup = new THREE.Group();

      const binGeometry = new THREE.BoxGeometry(1.5, 2, 1.5);
      const binMaterial = new THREE.MeshStandardMaterial({
        color: bin.color,
        metalness: 0.5,
        roughness: 0.5,
      });
      const binMesh = new THREE.Mesh(binGeometry, binMaterial);
      binMesh.castShadow = true;
      binMesh.receiveShadow = true;
      binGroup.add(binMesh);

      const textGeometry = new TextGeometry(bin.type.toUpperCase(), {
        // font: this.font,
        size: 0.2,
        height: 0.05,
      });
      const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(-0.4, 1.2, 0);
      binGroup.add(textMesh);

      binGroup.position.copy(bin.position);
      binGroup.userData.type = bin.type;
      this.scene.add(binGroup);

      return binGroup;
    });
  }

  createUI() {
    const uiStyles = `
            position: absolute;
            padding: 10px;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 5px;
            color: white;
            font-family: Arial, sans-serif;
        `;

    this.scoreElement = document.createElement("div");
    this.scoreElement.style.cssText = uiStyles + "top: 20px; left: 20px;";
    document.body.appendChild(this.scoreElement);
  }

  createInventoryUI() {
    this.inventoryElement = document.createElement("div");
    this.inventoryElement.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            padding: 15px;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 5px;
            color: white;
            font-family: Arial, sans-serif;
        `;
    document.body.appendChild(this.inventoryElement);
    this.updateInventoryUI();
  }

  createInstructions() {
    const instructions = document.createElement("div");
    instructions.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 15px;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 5px;
            color: white;
            font-family: Arial, sans-serif;
        `;
    instructions.innerHTML = `
            Controls:<br>
            ↑↓←→ - Move<br>
            SPACE - Collect garbage<br>
            E - Dispose at bin<br>
            Mouse - Look around
        `;
    document.body.appendChild(instructions);
  }

  handleKeyPress(event) {
    if (this.isSelfieMode) return;

    const moveSpeed = 0.5;
    const rotationSpeed = 0.5;

    switch (event.key) {
      case "ArrowUp":
        this.player.position.z -= moveSpeed * Math.cos(this.player.rotation.y);
        this.player.position.x -= moveSpeed * Math.sin(this.player.rotation.y);
        break;
      case "ArrowDown":
        this.player.position.z += moveSpeed * Math.cos(this.player.rotation.y);
        this.player.position.x += moveSpeed * Math.sin(this.player.rotation.y);
        break;
      case "ArrowLeft":
        this.player.position.x -= rotationSpeed;
        break;
      case "ArrowRight":
        this.player.position.x += rotationSpeed;
        break;
      case " ":
        this.collectGarbage();
        break;
      case "e":
        this.disposeToBin();
        break;
    }
  }

  collectGarbage() {
    for (let i = this.garbage.length - 1; i >= 0; i--) {
      const distance = this.player.position.distanceTo(
        this.garbage[i].position
      );
      if (distance < 2) {
        const garbageType = this.garbage[i].userData.type;
        this.collectedGarbage[garbageType].push(this.garbage[i]);
        this.scene.remove(this.garbage[i]);
        this.garbage.splice(i, 1);
        this.score += 10;
        this.updateInventoryUI();
        this.showFloatingText(
          `Collected ${this.garbage[i].userData.name}!`,
          this.player.position
        );
      }
    }
  }

  disposeToBin() {
    this.bins.forEach((bin) => {
      const distance = this.player.position.distanceTo(bin.position);
      if (distance < 2) {
        const binType = bin.userData.type;
        const correctItems = this.collectedGarbage[binType].length;
        if (correctItems > 0) {
          this.score += correctItems * 20;
          this.collectedGarbage[binType] = [];
          this.updateInventoryUI();
          this.showFloatingText(`+${correctItems * 20} points!`, bin.position);

          if (this.isAllGarbageDisposed()) {
            this.enableSelfieMode();
          }
        }
      }
    });
  }

  showFloatingText(text, position) {
    const textGeometry = new TextGeometry(text, {
      // font: this.font,
      size: 0.2,
      height: 0.01,
    });
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.copy(position);
    textMesh.position.y += 2;
    this.scene.add(textMesh);

    const startY = textMesh.position.y;
    const startTime = Date.now();
    const duration = 1000;

    const animateText = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        textMesh.position.y = startY + (elapsed / duration) * 1;
        textMesh.material.opacity = 1 - elapsed / duration;
        requestAnimationFrame(animateText);
      } else {
        this.scene.remove(textMesh);
      }
    };
    animateText();
  }

  updateInventoryUI() {
    this.inventoryElement.innerHTML = `
          Inventory:<br>
          🔴 Plastic: ${this.collectedGarbage.plastic.length}<br>
          🟢 Glass: ${this.collectedGarbage.glass.length}<br>
          🔵 Metal: ${this.collectedGarbage.metal.length}
      `;
  }

  isAllGarbageDisposed() {
    return (
      this.garbage.length === 0 &&
      Object.values(this.collectedGarbage).every((arr) => arr.length === 0)
    );
  }

  enableSelfieMode() {
    this.isSelfieMode = true;

    // Disable controls
    this.controls.enabled = false;

    // Position camera for selfie
    const selfiePosition = new THREE.Vector3(
      this.player.position.x - 3,
      this.player.position.y + 2,
      this.player.position.z
    );

    // Animate camera movement
    const startPosition = this.camera.position.clone();
    const startRotation = this.camera.rotation.clone();
    const duration = 2000;
    const startTime = Date.now();

    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth animation using easing
      const eased = this.easeInOutCubic(progress);

      this.camera.position.lerpVectors(startPosition, selfiePosition, eased);
      this.camera.lookAt(this.player.position);

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      } else {
        this.createSelfieButton();
      }
    };

    animateCamera();
  }

  easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  createSelfieButton() {
    const selfieButton = document.createElement("button");
    selfieButton.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          padding: 15px 30px;
          font-size: 18px;
          background: #FF4081;
          color: white;
          border: none;
          border-radius: 25px;
          cursor: pointer;
          transition: background 0.3s;
      `;
    selfieButton.textContent = "📸 Take Selfie";
    selfieButton.onmouseover = () =>
      (selfieButton.style.background = "#FF80AB");
    selfieButton.onmouseout = () => (selfieButton.style.background = "#FF4081");
    selfieButton.onclick = () => this.takeSelfie();
    document.body.appendChild(selfieButton);
  }

  takeSelfie() {
    // Flash effect
    const flash = document.createElement("div");
    flash.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: white;
          opacity: 0;
          transition: opacity 0.1s;
          pointer-events: none;
          z-index: 1000;
      `;
    document.body.appendChild(flash);

    // Flash animation
    flash.style.opacity = "1";
    setTimeout(() => {
      flash.style.opacity = "0";
      setTimeout(() => flash.remove(), 100);
      this.createCompletionScreen();
    }, 100);
  }

  createCompletionScreen() {
    const completionScreen = document.createElement("div");
    completionScreen.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-family: Arial, sans-serif;
          z-index: 1000;
      `;

    const content = document.createElement("div");
    content.style.cssText = `
          text-align: center;
          max-width: 600px;
          padding: 20px;
      `;

    content.innerHTML = `
          <h1 style="color: #4CAF50; margin-bottom: 20px;">🎉 Congratulations! 🎉</h1>
          <h2>Final Score: ${this.score} points</h2>
          <div style="margin: 20px 0;">
              <img src="${this.renderer.domElement.toDataURL("image/png")}" 
                   style="max-width: 100%; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
          </div>
          <p style="font-size: 18px; line-height: 1.6;">
              Thank you for helping clean the beach! Remember:
              <br>• Keep our oceans clean
              <br>• Always segregate your waste
              <br>• Protect marine life
          </p>
          <button id="playAgain" style="
              margin-top: 20px;
              padding: 15px 30px;
              font-size: 18px;
              background: #2196F3;
              color: white;
              border: none;
              border-radius: 25px;
              cursor: pointer;
              transition: background 0.3s;
          ">Play Again</button>
      `;

    completionScreen.appendChild(content);
    document.body.appendChild(completionScreen);

    document.getElementById("playAgain").onclick = () => location.reload();
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Update controls
    this.controls.update();

    // Update score display
    this.scoreElement.textContent = `Score: ${this.score}`;

    // Simple water animation
    this.scene.children.forEach((child) => {
      if (child.material && child.material.map === this.textures.water) {
        child.material.map.offset.y += 0.0005;
      }
    });

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize game
const game = new BeachCleanupGame();
