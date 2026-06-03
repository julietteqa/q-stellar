// Elementos UI: DOM Lookups masivos
const ui = {
    container: document.getElementById('ui-container'), toggle: document.getElementById('btnToggleUI'),
    loading: document.getElementById('loading'), loadProgress: document.getElementById('loadProgress'),
    labels: document.getElementById('labels-container'),
    // Telemetry
    tFPS: document.getElementById('tFPS'), tObj: document.getElementById('tObj'), tMass: document.getElementById('tMass'),
    tEnt: document.getElementById('tEnt'), tCoh: document.getElementById('tCoh'), tTime: document.getElementById('tTime'),
    tCamX: document.getElementById('tCamX'), tCamY: document.getElementById('tCamY'), tCamZ: document.getElementById('tCamZ'),
    // Physics
    simTime: document.getElementById('simTime'), valTime: document.getElementById('valTime'),
    simG: document.getElementById('simG'), valG: document.getElementById('valG'),
    simDark: document.getElementById('simDark'), valDark: document.getElementById('valDark'),
    tglBounce: document.getElementById('tglBounce'), tglAntiG: document.getElementById('tglAntiG'),
    btnPlayPause: document.getElementById('btnPlayPause'), btnReverse: document.getElementById('btnReverse'),
    // Creator
    spawnType: document.getElementById('spawnType'), spawnMass: document.getElementById('spawnMass'), valSpawnMass: document.getElementById('valSpawnMass'),
    spawnVx: document.getElementById('spawnVx'), valVx: document.getElementById('valVx'), spawnVz: document.getElementById('spawnVz'), valVz: document.getElementById('valVz'),
    btnSwarm: document.getElementById('btnSwarm'), btnClear: document.getElementById('btnClear'), presetBtns: document.querySelectorAll('.preset-btn'),
    // Quantum
    tglHeisenberg: document.getElementById('tglHeisenberg'), tglTunneling: document.getElementById('tglTunneling'),
    simTunnelProb: document.getElementById('simTunnelProb'), valTunnel: document.getElementById('valTunnel'),
    btnEntangle: document.getElementById('btnEntangle'), btnCollapse: document.getElementById('btnCollapse'),
    // Graphics
    tglTrails: document.getElementById('tglTrails'), simTrails: document.getElementById('simTrails'), valTrails: document.getElementById('valTrails'),
    tglLabels: document.getElementById('tglLabels'), tglGrid: document.getElementById('tglGrid'),
    tglBloom: document.getElementById('tglBloom'), tglVectors: document.getElementById('tglVectors'),
    simBg: document.getElementById('simBg'), valBg: document.getElementById('valBg'), btnResetCam: document.getElementById('btnResetCam'),
    // Inspector
    inspectorPanel: document.getElementById('inspectorPanel'), inspName: document.getElementById('inspName'),
    inspType: document.getElementById('inspType'), inspState: document.getElementById('inspState'), inspDist: document.getElementById('inspDist'),
    iPx: document.getElementById('iPx'), iPy: document.getElementById('iPy'), iPz: document.getElementById('iPz'),
    iVx: document.getElementById('iVx'), iVy: document.getElementById('iVy'), iVz: document.getElementById('iVz'), iSpd: document.getElementById('iSpd'),
    inspMassSlider: document.getElementById('inspMassSlider'), iMassVal: document.getElementById('iMassVal'),
    btnFollow: document.getElementById('btnFollow'), btnDupe: document.getElementById('btnDupe'), btnDelete: document.getElementById('btnDelete'), btnCloseInsp: document.getElementById('btnCloseInsp')
};

// GLOBAL STATE
let bodies = []; let isPaused = false; let timeDirection = 1; let entropy = 0; let runtime = 0; let frames = 0; let fps = 60;
setInterval(() => { fps = frames; frames = 0; ui.tFPS.innerText = fps; }, 1000);
let selectedBody = null; let followedBody = null; let entangleOrigin = null; let isEntangling = false;

// THREE.JS SETUP
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 100000);
camera.position.set(0, 1500, 2000);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.05;

const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.8);
scene.add(ambientLight);

const gridHelper = new THREE.GridHelper(10000, 100, 0x00f0ff, 0x00f0ff);
gridHelper.material.opacity = 0.1; gridHelper.material.transparent = true; gridHelper.visible = false;
scene.add(gridHelper);

// ASSETS / TEXTURES (Reliable GitHub URLs)
const textureLoader = new THREE.TextureLoader();
const textures = {};
const texUrls = {
    earth: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    earthSpec: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
    moon: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg',
    gas_giant: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/jupiter.jpg',
    star: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/lava/lavatile.jpg'
};

let loadedCount = 0; let toLoad = Object.keys(texUrls).length; let engineStarted = false;

for(const key in texUrls) {
    textures[key] = textureLoader.load(texUrls[key], () => {
        loadedCount++; ui.loadProgress.style.width = (loadedCount/toLoad)*100 + '%';
        if(loadedCount === toLoad && !engineStarted) initEngine();
    }, undefined, () => {
        loadedCount++; if(loadedCount === toLoad && !engineStarted) initEngine(); // Ignore errors
    });
}
setTimeout(() => { if(!engineStarted) initEngine(); }, 3000);

function initEngine() {
    engineStarted = true; ui.loading.style.display = 'none';
    
    // Procedural Star Background
    const starGeo = new THREE.BufferGeometry();
    const starCount = 8000;
    const posArray = new Float32Array(starCount * 3);
    for(let i=0; i<starCount*3; i++) posArray[i] = (Math.random() - 0.5) * 40000;
    starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starMat = new THREE.PointsMaterial({ size: 15, color: 0xffffff, transparent: true, opacity: parseFloat(ui.simBg.value) });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    
    ui.simBg.addEventListener('input', e => { starMat.opacity = parseFloat(e.target.value); ui.valBg.innerText = e.target.value; });
    ui.tglGrid.addEventListener('change', e => { gridHelper.visible = e.target.checked; });
    ui.btnResetCam.addEventListener('click', () => { camera.position.set(0, 1500, 2000); controls.target.set(0,0,0); followedBody = null; });
    
    loadPreset('solar'); animate();
}

// ENTITIES
const sphereGeo = new THREE.SphereGeometry(1, 64, 64);
const ringGeo = new THREE.RingGeometry(1.5, 2.5, 64);

const TYPES = {
    earth: { type: 'Terrestrial', r: 12, mat: () => new THREE.MeshStandardMaterial({map: textures.earth, bumpMap: textures.earthSpec, bumpScale: 0.5, roughness: 0.6, metalness: 0.1}), hasAtmosphere: true, atmColor: 0x38bdf8 },
    mars: { type: 'Terrestrial', r: 8, mat: () => new THREE.MeshStandardMaterial({map: textures.earth, bumpMap: textures.earthSpec, bumpScale: 0.8, color: 0xe74c3c, roughness: 0.9}), hasAtmosphere: true, atmColor: 0xe74c3c },
    moon: { type: 'Satellite', r: 4, mat: () => new THREE.MeshStandardMaterial({map: textures.moon, bumpMap: textures.moon, bumpScale: 0.2, roughness: 1.0}) },
    gas_giant: { type: 'Gas Giant', r: 35, mat: () => new THREE.MeshStandardMaterial({map: textures.gas_giant, roughness: 0.5}), hasRings: true, ringColor: 0xd4a373 },
    star: { type: 'G-Star', r: 70, isLight: true, color: 0xffdd88, mat: () => new THREE.MeshBasicMaterial({map: textures.star, color: 0xffaa00}) },
    blackhole: { type: 'Singularity', r: 15, isLight: false, color: 0x000000, mat: () => new THREE.MeshBasicMaterial({color: 0x000000}), hasAccretion: true },
    quantum: { type: 'Q-Planet', r: 6, isQuantum: true, color: 0xff00ff, mat: () => new THREE.MeshStandardMaterial({color: 0xff00ff, transparent: true, opacity: 0.4, wireframe: true}) }
};

class Body {
    constructor(x, z, vx, vz, mass, config) {
        this.id = 'QOBJ_' + Math.floor(Math.random()*99999);
        this.x = x; this.y = 0; this.z = z;
        this.vx = vx; this.vy = 0; this.vz = vz;
        this.mass = mass; this.radius = config.r;
        this.type = config.type;
        this.isLight = config.isLight; this.isQuantum = config.isQuantum;
        this.color = config.color || 0xffffff;
        
        this.mesh = new THREE.Group();
        this.states = []; this.collapsed = !this.isQuantum; this.entangledWith = null;

        const createVisuals = () => {
            let group = new THREE.Group();
            
            let core = new THREE.Mesh(sphereGeo, config.mat());
            core.scale.set(this.radius, this.radius, this.radius);
            group.add(core);
            
            // Atmospheres
            if (config.hasAtmosphere) {
                let atm = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({color: config.atmColor, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending}));
                atm.scale.set(this.radius*1.1, this.radius*1.1, this.radius*1.1);
                group.add(atm);
            }
            // Rings
            if (config.hasRings) {
                let ringGeoPlanet = new THREE.RingGeometry(1.2, 2.2, 64);
                let ring = new THREE.Mesh(ringGeoPlanet, new THREE.MeshBasicMaterial({color: config.ringColor, side: THREE.DoubleSide, transparent: true, opacity: 0.7}));
                ring.scale.set(this.radius, this.radius, 1);
                ring.rotation.x = Math.PI / 2.2;
                group.add(ring);
            }
            // Accretion Disk (Black Hole)
            if (config.hasAccretion) {
                let diskGeo = new THREE.RingGeometry(1.05, 2.5, 64);
                let disk = new THREE.Mesh(diskGeo, new THREE.MeshBasicMaterial({map: textures.star, color: 0xff4400, side: THREE.DoubleSide, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending}));
                disk.scale.set(this.radius, this.radius, 1);
                disk.rotation.x = Math.PI / 2.1;
                group.add(disk);
            }
            return group;
        };

        if (this.isQuantum) {
            for(let i=0; i<3; i++) {
                let sm = createVisuals();
                this.states.push({ mesh: sm, ox: (Math.random()-0.5)*50, oz: (Math.random()-0.5)*50 });
                this.mesh.add(sm);
            }
        } else {
            this.mesh.add(createVisuals());
        }

        if (this.isLight) {
            this.light = new THREE.PointLight(this.color, 3, 20000);
            this.mesh.add(this.light);
            const glow = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({color: this.color, transparent:true, opacity:0.15, blending: THREE.AdditiveBlending}));
            glow.scale.set(this.radius*1.8, this.radius*1.8, this.radius*1.8); glow.name = 'glow';
            this.mesh.add(glow);
        }
        
        scene.add(this.mesh);

        this.trailPositions = [];
        const trailGeo = new THREE.BufferGeometry();
        const trailMat = new THREE.LineBasicMaterial({ color: this.isQuantum ? 0xff00ff : 0x00f0ff, transparent: true, opacity: 0.3 });
        this.trailLine = new THREE.Line(trailGeo, trailMat);
        scene.add(this.trailLine);

        this.labelEl = document.createElement('div');
        this.labelEl.className = 'body-label hidden';
        this.labelEl.innerText = this.id;
        ui.labels.appendChild(this.labelEl);
    }

    collapse() {
        if (!this.collapsed && this.isQuantum) {
            this.collapsed = true;
            while(this.mesh.children.length > 1) { this.mesh.remove(this.mesh.children[1]); }
            this.mesh.children[0].material.opacity = 1.0;
            this.mesh.children[0].material.wireframe = false;
            this.mesh.children[0].position.set(0,0,0);
        }
    }

    updateRender(camDist) {
        if (ui.tglHeisenberg.checked && camDist < 300 && this.mass > 0) {
            let jitter = (300 - camDist)/50;
            this.mesh.position.set(this.x + (Math.random()-0.5)*jitter, this.y, this.z + (Math.random()-0.5)*jitter);
        } else {
            this.mesh.position.set(this.x, this.y, this.z);
        }

        if (!this.collapsed) {
            for(let s of this.states) {
                s.ox += (Math.random()-0.5); s.oz += (Math.random()-0.5);
                s.mesh.position.set(s.ox, 0, s.oz);
                s.mesh.rotation.y += 0.01;
            }
        } else {
            this.mesh.children[0].rotation.y += 0.005;
            if(this.mesh.children[0].children[0] && this.mesh.children[0].children[0].geometry.type === 'RingGeometry') {
                this.mesh.children[0].children[0].rotation.z -= 0.01; // Rotate rings
            }
        }

        if(this.isLight) {
            let glow = this.mesh.children.find(c => c.name === 'glow');
            if(glow) glow.visible = ui.tglBloom.checked;
        }

        if (ui.tglTrails.checked && this.collapsed) {
            if (this.trailPositions.length === 0 || Math.hypot(this.x - this.trailPositions[this.trailPositions.length-1].x, this.z - this.trailPositions[this.trailPositions.length-1].z) > 10) {
                this.trailPositions.push(new THREE.Vector3(this.x, this.y, this.z));
                let max = parseInt(ui.simTrails.value);
                if (this.trailPositions.length > max) this.trailPositions.shift();
                this.trailLine.geometry.setFromPoints(this.trailPositions);
            }
            this.trailLine.visible = true;
        } else {
            this.trailLine.visible = false;
        }
    }

    destroy() {
        scene.remove(this.mesh); scene.remove(this.trailLine);
        this.trailLine.geometry.dispose(); this.trailLine.material.dispose();
        if(this.labelEl.parentNode) this.labelEl.parentNode.removeChild(this.labelEl);
        this.mass = 0;
    }
}

// PHYSICS
let raycaster = new THREE.Raycaster(); let mouse = new THREE.Vector2();

function physicsLoop(dt) {
    if(isPaused) return;
    let ts = parseFloat(ui.simTime.value) * timeDirection;
    let scaledDt = dt * ts;
    if(Math.abs(scaledDt) > 0.1) scaledDt = Math.sign(scaledDt)*0.1;
    
    let G_val = parseFloat(ui.simG.value); if(ui.tglAntiG.checked) G_val *= -1;
    let darkMatter = parseFloat(ui.simDark.value);
    let bounce = ui.tglBounce.checked; let tunneling = ui.tglTunneling.checked; let tunnelProb = parseFloat(ui.simTunnelProb.value)/100;

    const steps = 4; const stepDt = scaledDt / steps;
    let totalMass = 0; entropy += Math.abs(scaledDt) * 0.05;

    for (let s = 0; s < steps; s++) {
        for (let i = 0; i < bodies.length; i++) {
            let b1 = bodies[i]; let ax = 0, az = 0;
            for (let j = 0; j < bodies.length; j++) {
                if (i === j) continue;
                let b2 = bodies[j]; let dx = b2.x - b1.x, dz = b2.z - b1.z;
                let distSq = dx*dx + dz*dz; let dist = Math.sqrt(distSq);

                if (dist < b1.radius + b2.radius) {
                    if (tunneling && Math.random() < tunnelProb) continue;
                    if (bounce) {
                        let nx = dx/dist, nz = dz/dist;
                        let p = 2 * (b1.vx * nx + b1.vz * nz - b2.vx * nx - b2.vz * nz) / (b1.mass + b2.mass);
                        b1.vx -= p * b2.mass * nx; b1.vz -= p * b2.mass * nz;
                        b2.vx += p * b1.mass * nx; b2.vz += p * b1.mass * nz;
                        let overlap = (b1.radius + b2.radius - dist)/2;
                        b1.x -= nx*overlap; b1.z -= nz*overlap; b2.x += nx*overlap; b2.z += nz*overlap;
                    } else {
                        if(b1.type === 'Singularity' && b2.type !== 'Singularity') { b1.mass += b2.mass; b1.radius += 0.5; b2.mass = 0; }
                        else if(b2.type === 'Singularity' && b1.type !== 'Singularity') { b2.mass += b1.mass; b2.radius += 0.5; b1.mass = 0; }
                        else {
                            let nMass = b1.mass + b2.mass; let nVx = (b1.vx*b1.mass + b2.vx*b2.mass)/nMass; let nVz = (b1.vz*b1.mass + b2.vz*b2.mass)/nMass;
                            if(b1.mass >= b2.mass) { b1.mass = nMass; b1.vx = nVx; b1.vz = nVz; b2.mass = 0; b1.radius = Math.pow(Math.pow(b1.radius,3)+Math.pow(b2.radius,3), 1/3); }
                            else { b2.mass = nMass; b2.vx = nVx; b2.vz = nVz; b1.mass = 0; b2.radius = Math.pow(Math.pow(b1.radius,3)+Math.pow(b2.radius,3), 1/3); }
                        }
                    }
                    continue;
                }
                let f = (G_val * b2.mass) / distSq; ax += f * (dx/dist); az += f * (dz/dist);
            }
            b1.vx += ax * stepDt; b1.vz += az * stepDt;
            b1.vx *= (1 - darkMatter*Math.abs(stepDt)); b1.vz *= (1 - darkMatter*Math.abs(stepDt));
        }

        for(let b of bodies) {
            if(b.entangledWith && b.entangledWith.mass > 0) {
                let e = b.entangledWith; b.vx = (b.vx + e.vx)/2; e.vx = b.vx; b.vz = (b.vz + e.vz)/2; e.vz = b.vz;
            }
        }

        for(let i=bodies.length-1; i>=0; i--) {
            if(bodies[i].mass <= 0) {
                if(selectedBody === bodies[i]) closeInspector();
                if(followedBody === bodies[i]) followedBody = null;
                bodies[i].destroy(); bodies.splice(i, 1);
            }
        }

        for(let b of bodies) { b.x += b.vx * stepDt; b.z += b.vz * stepDt; totalMass += b.mass; }
    }

    ui.tObj.innerText = bodies.length; ui.tMass.innerText = Math.round(totalMass); ui.tEnt.innerText = entropy.toFixed(2) + '%';
    let c = 100 - bodies.filter(b=>!b.collapsed).length * 5; ui.tCoh.innerText = Math.max(0, c).toFixed(1) + '%';
}

// RENDER LOOP
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate); frames++;
    let dt = clock.getDelta(); runtime += dt; ui.tTime.innerText = Math.round(runtime) + 's';
    physicsLoop(dt);
    if (followedBody && followedBody.mass > 0) controls.target.set(followedBody.x, followedBody.y, followedBody.z);
    controls.update();
    ui.tCamX.innerText = Math.round(camera.position.x); ui.tCamY.innerText = Math.round(camera.position.y); ui.tCamZ.innerText = Math.round(camera.position.z);

    const showLabels = ui.tglLabels.checked;
    for(let b of bodies) {
        let dist = camera.position.distanceTo(b.mesh.position);
        b.updateRender(dist);
        if(showLabels) {
            const tempV = new THREE.Vector3(b.x, b.y, b.z).project(camera);
            if(tempV.z < 1) {
                b.labelEl.style.left = (tempV.x * .5 + .5) * window.innerWidth + 'px';
                b.labelEl.style.top = (tempV.y * -.5 + .5) * window.innerHeight + 15 + 'px';
                b.labelEl.classList.remove('hidden');
            } else b.labelEl.classList.add('hidden');
        } else b.labelEl.classList.add('hidden');
    }
    updateInspector(); renderer.render(scene, camera);
}

// UI EVENTS
ui.toggle.addEventListener('click', () => ui.container.classList.toggle('hidden'));
ui.simTime.addEventListener('input', e => ui.valTime.innerText = e.target.value);
ui.simG.addEventListener('input', e => ui.valG.innerText = e.target.value);
ui.simDark.addEventListener('input', e => ui.valDark.innerText = e.target.value);
ui.btnPlayPause.addEventListener('click', () => { isPaused = !isPaused; ui.btnPlayPause.innerText = isPaused ? 'RESUME SIM' : 'PAUSE SIM'; ui.btnPlayPause.classList.toggle('outline'); });
ui.btnReverse.addEventListener('click', () => { timeDirection *= -1; ui.btnReverse.classList.toggle('outline'); });

ui.spawnMass.addEventListener('input', e => ui.valSpawnMass.innerText = e.target.value);
ui.spawnVx.addEventListener('input', e => ui.valVx.innerText = e.target.value);
ui.spawnVz.addEventListener('input', e => ui.valVz.innerText = e.target.value);
ui.simTunnelProb.addEventListener('input', e => ui.valTunnel.innerText = e.target.value);
ui.btnCollapse.addEventListener('click', () => { bodies.forEach(b => b.collapse()); });
ui.simTrails.addEventListener('input', e => ui.valTrails.innerText = e.target.value);

container.addEventListener('mousedown', e => {
    if(e.button !== 0) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    let intersects = raycaster.intersectObjects(bodies.map(b => b.mesh), true);
    if(intersects.length > 0) {
        let clickedBody = bodies.find(b => b.mesh === intersects[0].object || b.mesh.children.some(c => c === intersects[0].object || (c.children && c.children.includes(intersects[0].object))));
        if(clickedBody) {
            if(clickedBody.isQuantum) clickedBody.collapse();
            if(isEntangling) {
                if(entangleOrigin && entangleOrigin !== clickedBody) {
                    entangleOrigin.entangledWith = clickedBody; clickedBody.entangledWith = entangleOrigin;
                    isEntangling = false; ui.btnEntangle.innerText = "ENTANGLE TARGETS"; ui.btnEntangle.classList.remove('outline');
                }
            } else openInspector(clickedBody);
        }
    } else {
        closeInspector();
        if(isEntangling) { isEntangling = false; ui.btnEntangle.innerText = "ENTANGLE TARGETS"; ui.btnEntangle.classList.remove('outline'); }
        let plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0); let point = new THREE.Vector3(); raycaster.ray.intersectPlane(plane, point);
        if(point) {
            let t = ui.spawnType.value; let m = parseFloat(ui.spawnMass.value); let vx = parseFloat(ui.spawnVx.value); let vz = parseFloat(ui.spawnVz.value);
            bodies.push(new Body(point.x, point.z, vx, vz, m, TYPES[t]));
        }
    }
});

ui.btnEntangle.addEventListener('click', () => { if(selectedBody) { isEntangling = true; entangleOrigin = selectedBody; ui.btnEntangle.innerText = "SELECT SECOND TARGET..."; ui.btnEntangle.classList.add('outline'); } });

// Inspector
function openInspector(b) { selectedBody = b; ui.inspectorPanel.classList.remove('hidden'); ui.inspName.innerText = b.id; ui.inspType.innerText = b.type; ui.inspMassSlider.value = b.mass; }
function closeInspector() { selectedBody = null; ui.inspectorPanel.classList.add('hidden'); }
function updateInspector() {
    if(!selectedBody) return;
    ui.inspState.innerText = selectedBody.collapsed ? "DETERMINED" : "SUPERPOSITION";
    ui.inspDist.innerText = (Math.hypot(selectedBody.x, selectedBody.z)/10).toFixed(2);
    ui.iPx.innerText = Math.round(selectedBody.x); ui.iPy.innerText = Math.round(selectedBody.y); ui.iPz.innerText = Math.round(selectedBody.z);
    ui.iVx.innerText = selectedBody.vx.toFixed(2); ui.iVy.innerText = selectedBody.vy.toFixed(2); ui.iVz.innerText = selectedBody.vz.toFixed(2);
    ui.iSpd.innerText = Math.hypot(selectedBody.vx, selectedBody.vz).toFixed(2); ui.iMassVal.innerText = Math.round(selectedBody.mass);
}

ui.inspMassSlider.addEventListener('input', e => { if(selectedBody) selectedBody.mass = parseFloat(e.target.value); });
ui.btnDelete.addEventListener('click', () => { if(selectedBody) selectedBody.mass = 0; });
ui.btnCloseInsp.addEventListener('click', closeInspector);
ui.btnFollow.addEventListener('click', () => { followedBody = followedBody===selectedBody ? null : selectedBody; ui.btnFollow.classList.toggle('outline'); });
ui.btnDupe.addEventListener('click', () => {
    if(selectedBody) {
        let conf = TYPES[Object.keys(TYPES).find(k => TYPES[k].type === selectedBody.type)] || TYPES.earth;
        bodies.push(new Body(selectedBody.x+50, selectedBody.z+50, selectedBody.vx, selectedBody.vz, selectedBody.mass, conf));
    }
});

// Presets
ui.btnClear.addEventListener('click', () => { bodies.forEach(b=>b.destroy()); bodies = []; followedBody=null; closeInspector(); entropy=0; });
ui.btnSwarm.addEventListener('click', () => {
    for(let i=0; i<50; i++) {
        let ang = Math.random()*Math.PI*2, dist = Math.random()*1500+200, spd = Math.random()*10;
        bodies.push(new Body(Math.cos(ang)*dist, Math.sin(ang)*dist, -Math.sin(ang)*spd, Math.cos(ang)*spd, Math.random()*20+5, TYPES.moon));
    }
});

function loadPreset(name) {
    ui.btnClear.click();
    if(name==='solar') {
        bodies.push(new Body(0,0, 0,0, 10000, TYPES.star));
        bodies.push(new Body(400,0, Math.sqrt(10000/400),0, 50, TYPES.earth));
        bodies.push(new Body(600,0, Math.sqrt(10000/600),0, 30, TYPES.mars));
        bodies.push(new Body(1200,0, Math.sqrt(10000/1200),0, 500, TYPES.gas_giant));
    } else if(name==='binary') {
        bodies.push(new Body(-200,0, 0,-4, 5000, TYPES.star));
        bodies.push(new Body(200,0, 0,4, 5000, TYPES.star));
        bodies.push(new Body(800,0, 0,5, 50, TYPES.earth));
    } else if(name==='threebody') {
        let p1=0.347, p2=0.532;
        bodies.push(new Body(-150,0, p1*15, p2*15, 1000, TYPES.star));
        bodies.push(new Body(150,0, p1*15, p2*15, 1000, TYPES.star));
        bodies.push(new Body(0,0, -2*p1*15, -2*p2*15, 1000, TYPES.star));
    } else if(name==='galaxy') {
        camera.position.set(0, 3000, 4000);
        bodies.push(new Body(0,0, 0,0, 50000, TYPES.blackhole));
        ui.btnSwarm.click(); ui.btnSwarm.click(); ui.btnSwarm.click();
    } else if(name==='quantum') {
        for(let i=0; i<10; i++) bodies.push(new Body((Math.random()-0.5)*1000, (Math.random()-0.5)*1000, (Math.random()-0.5)*5, (Math.random()-0.5)*5, 10, TYPES.quantum));
    }
}
ui.presetBtns.forEach(b => b.addEventListener('click', () => loadPreset(b.dataset.preset)));

window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
