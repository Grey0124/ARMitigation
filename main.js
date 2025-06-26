let camera, scene, renderer;
let controller;
let placedObject = null;
let selectedType = 'tree';
let selectedTreeModel = 'quick_treeit_tree.glb';
let selectedBuildingModel = 'low_poly_building_no_17_3d_model.glb';
const glbPaths = {
  tree: {
    'quick_treeit_tree.glb': 'quick_treeit_tree.glb'
  },
  building: {
    'low_poly_building_no_17_3d_model.glb': 'low_poly_building_no_17_3d_model.glb',
    'brick_building_graffiti.glb': 'brick_building_graffiti.glb',
    'old_building.glb': 'old_building.glb'
  }
};
let placedObjects = [];

// Updated coefficients: tree cools, building heats
const coolingCoefficients = {
  tree: 0.02,      // °C per m² (cooling)
  building: -0.03  // °C per m² (heating)
};

function computeCoolingEffect(objects) {
  let total = 0;
  for (const obj of objects) {
    const size = obj.size || 10;
    total += (coolingCoefficients[obj.type] || 0) * size;
  }
  return total;
}

// Fetch baseline temperature using Open-Meteo API (or your .env API)
async function fetchBaselineTemperature(lat, lon) {
  // Use your .env API key if needed
  // Example with Open-Meteo (no key required)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
  const res = await fetch(url);
  const data = await res.json();
  return data.current_weather ? data.current_weather.temperature : null;
}

// Generate the report
window.generateMitigationReport = async function() {
  if (placedObjects.length === 0) {
    alert('No interventions placed.');
    return;
  }
  // Use the first object's location for the report
  const { lat, lon } = placedObjects[0];
  document.getElementById('report-modal').style.display = 'flex';
  document.getElementById('report-body').innerHTML = '<div style="text-align:center;">Loading report...</div>';

  let baselineTemp = await fetchBaselineTemperature(lat, lon);
  let cooling = computeCoolingEffect(placedObjects);
  let postTemp = baselineTemp !== null ? (baselineTemp - cooling).toFixed(2) : 'N/A';

  // Build the report HTML
  let html = `
    <h2 style="color:#2194ce;">Mitigation Report</h2>
    <p><b>Location:</b> ${lat.toFixed(5)}, ${lon.toFixed(5)}</p>
    <p><b>Baseline Temperature:</b> ${baselineTemp !== null ? baselineTemp + '°C' : 'N/A'}</p>
    <p><b>Estimated Temperature After Interventions:</b> <span style="color:#27ae60;">${postTemp}°C</span></p>
    <h3>Interventions:</h3>
    <table style="width:100%; border-collapse:collapse;">
      <tr style="background:#f0f0f0;">
        <th style="padding:8px;">Type</th>
        <th style="padding:8px;">Placed At</th>
        <th style="padding:8px;">Lat</th>
        <th style="padding:8px;">Lon</th>
        <th style="padding:8px;">Size (m²)</th>
      </tr>
      ${placedObjects.map(obj => `
        <tr>
          <td style="padding:8px;">${obj.type}</td>
          <td style="padding:8px;">${obj.createdAt.toLocaleString ? obj.createdAt.toLocaleString() : obj.createdAt}</td>
          <td style="padding:8px;">${obj.lat ? obj.lat.toFixed(5) : ''}</td>
          <td style="padding:8px;">${obj.lon ? obj.lon.toFixed(5) : ''}</td>
          <td style="padding:8px;">${obj.size || 10}</td>
        </tr>
      `).join('')}
    </table>
    <p style="margin-top:16px; color:#888;">This report estimates the cooling effect of your interventions for urban planning and heat mitigation.</p>
  `;
  document.getElementById('report-body').innerHTML = html;
};

document.getElementById('generate-report').onclick = window.generateMitigationReport;

// Download PDF logic using jsPDF
function downloadReportAsPDF() {
  const doc = new window.jspdf.jsPDF();
  let y = 15;
  doc.setFontSize(20);
  doc.setTextColor(33, 148, 206);
  doc.text('Mitigation Report', 10, y);
  y += 10;
  doc.setFontSize(12);
  doc.setTextColor(0,0,0);
  if (placedObjects.length > 0) {
    const { lat, lon } = placedObjects[0];
    doc.text(`Location: ${lat.toFixed(5)}, ${lon.toFixed(5)}`, 10, y); y += 8;
  }
  const baselineTemp = document.querySelector('#report-body').innerText.match(/Baseline Temperature: ([^\n]+)/);
  const postTemp = document.querySelector('#report-body').innerText.match(/Estimated Temperature After Interventions: ([^\n]+)/);
  if (baselineTemp) { doc.text(baselineTemp[0], 10, y); y += 8; }
  if (postTemp) { doc.text(postTemp[0], 10, y); y += 8; }
  y += 4;
  doc.setFontSize(14);
  doc.setTextColor(33, 148, 206);
  doc.text('Interventions:', 10, y); y += 8;
  doc.setFontSize(11);
  doc.setTextColor(0,0,0);
  doc.text('Type', 10, y);
  doc.text('Placed At', 35, y);
  doc.text('Lat', 90, y);
  doc.text('Lon', 115, y);
  doc.text('Size (m²)', 140, y);
  y += 6;
  placedObjects.forEach(obj => {
    doc.text(obj.type, 10, y);
    doc.text(obj.createdAt.toLocaleString ? obj.createdAt.toLocaleString() : String(obj.createdAt), 35, y, { maxWidth: 50 });
    doc.text(obj.lat ? obj.lat.toFixed(5) : '', 90, y);
    doc.text(obj.lon ? obj.lon.toFixed(5) : '', 115, y);
    doc.text(String(obj.size || 10), 140, y);
    y += 6;
    if (y > 270) { doc.addPage(); y = 15; }
  });
  doc.save('mitigation_report.pdf');
}

// Attach PDF download handler after DOM loaded
window.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('download-pdf');
  if (btn) btn.onclick = downloadReportAsPDF;
  setObjectType(selectedType);
  document.getElementById('tree-model-select').onchange = function(e) {
    selectedTreeModel = e.target.value;
  };
  document.getElementById('building-model-select').onchange = function(e) {
    selectedBuildingModel = e.target.value;
  };
});

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  // Add light
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // Controller for input (tapping to place)
  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  // Reticle for placement (make it much larger for long distance)
  const geometry = new THREE.RingGeometry(0.3, 0.35, 64).rotateX(-Math.PI / 2); // Increased radius
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  window.reticle = new THREE.Mesh(geometry, material);
  window.reticle.matrixAutoUpdate = false;
  window.reticle.visible = false;
  scene.add(window.reticle);

  // Hit test source
  window.hitTestSourceRequested = false;
  window.hitTestSource = null;

  renderer.xr.addEventListener('sessionstart', onSessionStart);

  // Add zoom in/out UI for AR (optional, since pinch is not natively supported in WebXR)
  addZoomUI();
}

function onSessionStart() {
  window.hitTestSourceRequested = false;
  window.hitTestSource = null;
}

function onSelect() {
  if (window.reticle.visible) {
    setPlacementStatus('Placing...');
    let modelPath = '';
    if (selectedType === 'tree') {
      modelPath = glbPaths.tree[selectedTreeModel];
    } else if (selectedType === 'building') {
      modelPath = glbPaths.building[selectedBuildingModel];
    }
    console.log('Selected type:', selectedType, 'Model:', selectedType === 'tree' ? selectedTreeModel : selectedBuildingModel, 'Path:', modelPath);
    if (!modelPath) {
      setPlacementStatus('Model not found!');
      return;
    }
    const loader = new THREE.GLTFLoader();
    loader.load(modelPath, function(gltf) {
      const model = gltf.scene;
      model.position.setFromMatrixPosition(window.reticle.matrix);
      model.quaternion.setFromRotationMatrix(window.reticle.matrix);
      model.scale.set(0.3, 0.3, 0.3); // Adjust scale as needed
      scene.add(model);
      // Get geolocation if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(pos) {
          placedObjects.push({
            type: selectedType,
            model,
            createdAt: new Date(),
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            size: 10, // You can add a UI for size if needed
            modelName: selectedType === 'tree' ? selectedTreeModel : selectedBuildingModel
          });
          updateObjectCount();
          setPlacementStatus('Placed ' + selectedType);
        }, function() {
          placedObjects.push({
            type: selectedType,
            model,
            createdAt: new Date(),
            size: 10,
            modelName: selectedType === 'tree' ? selectedTreeModel : selectedBuildingModel
          });
          updateObjectCount();
          setPlacementStatus('Placed ' + selectedType);
        });
      } else {
        placedObjects.push({
          type: selectedType,
          model,
          createdAt: new Date(),
          size: 10,
          modelName: selectedType === 'tree' ? selectedTreeModel : selectedBuildingModel
        });
        updateObjectCount();
        setPlacementStatus('Placed ' + selectedType);
      }
    }, undefined, function(error) {
      setPlacementStatus('Error loading model');
      console.error('Error loading model:', error);
    });
  } else {
    setPlacementStatus('No surface detected');
  }
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if (!window.hitTestSourceRequested) {
      session.requestReferenceSpace('viewer').then(function (referenceSpace) {
        session.requestHitTestSource({ space: referenceSpace }).then(function (source) {
          window.hitTestSource = source;
        });
      });
      session.addEventListener('end', function () {
        window.hitTestSourceRequested = false;
        window.hitTestSource = null;
      });
      window.hitTestSourceRequested = true;
    }

    if (window.hitTestSource) {
      const hitTestResults = frame.getHitTestResults(window.hitTestSource);
      if (hitTestResults.length) {
        const hit = hitTestResults[0];
        window.reticle.visible = true;
        window.reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        window.reticle.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
}

window.setObjectType = function(type) {
  selectedType = type;
  document.getElementById('btn-tree').classList.remove('selected');
  document.getElementById('btn-building').classList.remove('selected');
  if (type === 'tree') {
    document.getElementById('btn-tree').classList.add('selected');
  } else if (type === 'building') {
    document.getElementById('btn-building').classList.add('selected');
  }
};

window.removeLastObject = function() {
  if (placedObjects.length > 0) {
    const last = placedObjects.pop();
    scene.remove(last.model);
    updateObjectCount();
    setPlacementStatus('Last object removed');
  } else {
    setPlacementStatus('No objects to remove');
  }
};

function updateObjectCount() {
  document.getElementById('object-count').textContent = 'Objects: ' + placedObjects.length;
}

function setPlacementStatus(msg) {
  document.getElementById('placement-status').textContent = 'Status: ' + msg;
}

// Add zoom in/out UI buttons for AR mode
function addZoomUI() {
  if (document.getElementById('zoom-controls')) return;
  const zoomDiv = document.createElement('div');
  zoomDiv.id = 'zoom-controls';
  zoomDiv.style.position = 'absolute';
  zoomDiv.style.bottom = '40px';
  zoomDiv.style.right = '40px';
  zoomDiv.style.zIndex = '2001';
  zoomDiv.innerHTML = `
    <button id="zoom-in" style="font-size:32px; padding:8px 16px; border-radius:50%; background:#2194ce; color:#fff; border:none; margin-bottom:8px;">+</button><br>
    <button id="zoom-out" style="font-size:32px; padding:8px 16px; border-radius:50%; background:#2194ce; color:#fff; border:none;">-</button>
  `;
  document.body.appendChild(zoomDiv);
  document.getElementById('zoom-in').onclick = function() {
    camera.fov = Math.max(10, camera.fov - 5);
    camera.updateProjectionMatrix();
  };
  document.getElementById('zoom-out').onclick = function() {
    camera.fov = Math.min(120, camera.fov + 5);
    camera.updateProjectionMatrix();
  };
} 