
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import './style.css';

// =====================================
// APP
// =====================================

const app = document.querySelector('#app');

if (!app) {
  throw new Error('HTML element #app not found');
}

// =====================================
// SCENE
// =====================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8edf2);

// =====================================
// CAMERA
// =====================================

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100000
);

camera.position.set(5, 4, 7);

// =====================================
// RENDERER
// =====================================

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

app.appendChild(renderer.domElement);

// =====================================
// LIGHTING
// =====================================

const ambientLight = new THREE.AmbientLight(
  0xffffff,
  1.5
);

scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(
  0xffffff,
  2
);

directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// =====================================
// GRID
// =====================================

const grid = new THREE.GridHelper(300, 30);
scene.add(grid);

// =====================================
// CAMERA CONTROLS
// =====================================

const controls = new OrbitControls(
  camera,
  renderer.domElement
);

controls.enableDamping = true;
controls.dampingFactor = 0.05;

controls.target.set(0, 2, 0);
controls.update();

// =====================================
// MODEL CONFIGURATION
// =====================================


const gltfLoader = new GLTFLoader();

const modelFolder = `${import.meta.env.BASE_URL}models 3/`;

const modelFiles = {
  Phase1: {
    filename: 'FOUNDATION 4.glb',
    format: 'glb'
  },

  Phase2: {
    filename: 'Framming 4.glb',
    format: 'glb'
  },

  Phase3: {
    filename: 'SEPARATED 4.glb',
    format: 'glb'
  },

  
Phase4: {
  filename: 'COMPLETED 6.glb',
  format: 'glb'
}

};

const phaseNames = {
  Phase1: 'Foundation',
  Phase2: 'Framming',
  Phase3: 'Separated',
  Phase4: 'All in One'
};


// =====================================
// MODEL CONTAINER
// =====================================

const realBuilding = new THREE.Group();
scene.add(realBuilding);

const models = {
  Phase1: null,
  Phase2: null,
  Phase3: null,
  Phase4: null
};

const modelErrors = {};

let currentPhase = 'Phase1';
let modelOffset = null;

// =====================================
// STATUS MESSAGE
// =====================================

const statusMessage = document.createElement('div');

statusMessage.className = 'status-message';

app.appendChild(statusMessage);

function showStatus(message, isError = false) {
  statusMessage.textContent = message;

  statusMessage.style.background = isError
    ? 'rgba(160,35,35,0.92)'
    : 'rgba(20,28,40,0.85)';

  statusMessage.style.display = 'block';
}

function hideStatus() {
  statusMessage.style.display = 'none';
}

showStatus('Loading Foundation...');

// =====================================
// MODEL PATH
// =====================================

function getModelPath(filename) {
  return (
    encodeURI(modelFolder) +
    encodeURIComponent(filename)
  );
}

// =====================================
// SHARED MODEL ALIGNMENT
// =====================================

function alignModel(model) {
  if (!modelOffset) return;

  model.position.add(modelOffset);
}

// =====================================
// CAMERA FIT
// =====================================

function fitCameraToModel(model) {
  const box = new THREE.Box3().setFromObject(model);

  if (box.isEmpty()) return;

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  box.getCenter(center);
  box.getSize(size);

  const maxDimension = Math.max(
    size.x,
    size.y,
    size.z,
    1
  );

  const verticalFOV = THREE.MathUtils.degToRad(
    camera.fov
  );

  const horizontalFOV = 2 * Math.atan(
    Math.tan(verticalFOV / 2) * camera.aspect
  );

  const distance = Math.max(
    size.y / (2 * Math.tan(verticalFOV / 2)),
    Math.max(size.x, size.z) /
      (2 * Math.tan(horizontalFOV / 2))
  ) * 2.2;

  // Extra margin for taller models
  const finalDistance = Math.max(
    distance,
    maxDimension * 1.5
  );

  camera.position.set(
    center.x + finalDistance,
    center.y + finalDistance * 0.7,
    center.z + finalDistance
  );

  camera.near = Math.max(
    finalDistance / 10000,
    0.01
  );

  camera.far = Math.max(
    finalDistance * 100,
    10000
  );

  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();
}

// =====================================
// RESET CAMERA
// =====================================

function resetCamera() {
  const model = models[currentPhase];

  if (!model) return;

  fitCameraToModel(model);
}

// =====================================
// PHASE VISIBILITY
// =====================================

function setBuildingPhase(phase, fitCamera = true) {
  currentPhase = phase;

  Object.keys(models).forEach((key) => {
    const model = models[key];

    if (model) {
      model.visible = key === phase;
    }
  });

  if (models[phase]) {
    hideStatus();

    if (fitCamera) {
      fitCameraToModel(models[phase]);
    }

  } else if (modelErrors[phase]) {
    showStatus(
      `Error loading ${phaseNames[phase]}: ${
        modelErrors[phase]
      }`,
      true
    );

  } else {
    showStatus(
      `Loading ${phaseNames[phase]}...`
    );
  }
}

// =====================================
// REGISTER MODEL
// =====================================

function registerModel(phase, model) {
  alignModel(model);

  realBuilding.add(model);
  models[phase] = model;

  // Refresh visibility without resetting camera
  setBuildingPhase(currentPhase, false);
}

// =====================================
// LOAD MODEL (GLB)
// =====================================

function loadModel(phase) {
  const config = modelFiles[phase];
  const path = getModelPath(config.filename);

  console.log(
    `Loading ${phaseNames[phase]}: ${path}`
  );

  gltfLoader.load(
    path,

    (gltf) => {
      const model = gltf.scene;

      if (phase === 'Phase1') {
        const box = new THREE.Box3().setFromObject(model);

        if (box.isEmpty()) {
          showStatus(
            'Foundation GLB contains no visible geometry.',
            true
          );
          return;
        }

        const center = new THREE.Vector3();
        box.getCenter(center);

        modelOffset = new THREE.Vector3(
          -center.x,
          -box.min.y,
          -center.z
        );
      }

      registerModel(phase, model);

      if (phase === 'Phase1') {
        fitCameraToModel(model);

        // Load remaining phases
        loadModel('Phase2');
        loadModel('Phase3');
        loadModel('Phase4');

      } else if (currentPhase === phase) {
        // Fit camera when a selected phase finishes loading
        fitCameraToModel(model);
      }

      console.log(
        `${config.filename} loaded successfully`
      );
    },

    undefined,

    (error) => {
      console.error(
        `Error loading ${config.filename}:`,
        error
      );

      modelErrors[phase] =
        error?.message || 'Invalid GLB file';

      if (currentPhase === phase) {
        showStatus(
          `Error loading ${config.filename}: ${
            modelErrors[phase]
          }`,
          true
        );
      }
    }
  );
}

// =====================================
// LOAD FOUNDATION FIRST
// =====================================

loadModel('Phase1');

// =====================================
// PHASE MENU
// =====================================

const phaseMenu = document.createElement('div');
phaseMenu.className = 'phase-menu';

const phases = [
  { label: 'Foundation', id: 'Phase1' },
  { label: 'Framming', id: 'Phase2' },
  { label: 'Separated', id: 'Phase3' },
  { label: 'All in One', id: 'Phase4' }
];

phases.forEach((phase) => {
  const button = document.createElement('button');

  button.textContent = phase.label;
  button.className = 'phase-button';

  button.addEventListener('click', () => {
    setBuildingPhase(phase.id, true);

    document
      .querySelectorAll('.phase-button')
      .forEach((btn) => {
        btn.classList.remove('active');
      });

    button.classList.add('active');
  });

  if (phase.id === 'Phase1') {
    button.classList.add('active');
  }

  phaseMenu.appendChild(button);
});

app.appendChild(phaseMenu);

// =====================================
// RESET CAMERA BUTTON
// =====================================

const resetButton = document.createElement('button');

resetButton.textContent = 'Reset Camera';
resetButton.className = 'reset-button';

resetButton.addEventListener(
  'click',
  resetCamera
);

app.appendChild(resetButton);

// =====================================
// WINDOW RESIZE
// =====================================

window.addEventListener('resize', () => {
  camera.aspect =
    window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
});

// =====================================
// ANIMATION LOOP
// =====================================

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  renderer.render(scene, camera);
}

animate();
