let currentTab = 'pendulo';
let animationFrameIds = {};
const canvases = {
    pendulo: document.getElementById('canvas-pendulo'),
    colisiones: document.getElementById('canvas-colisiones'),
    fractales: document.getElementById('canvas-fractales'),
    trigo: document.getElementById('canvas-trigo'),
    vida: document.getElementById('canvas-vida')
};

const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
        const canvas = entry.target.querySelector('canvas');
        if (canvas) {
            canvas.width = entry.contentRect.width;
            canvas.height = entry.contentRect.height;
            
            if (currentTab === 'pendulo' && pData) initPendulo();
            if (currentTab === 'fractales') renderJulia();
            if (currentTab === 'trigo') initTrigo();
            if (currentTab === 'vida') syncVidaDimensions();
        }
    }
});

document.querySelectorAll('.canvas-container').forEach(container => {
    resizeObserver.observe(container);
});

function switchTab(tabId) {
    cancelAnimationFrame(animationFrameIds[currentTab]);
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if(event && event.target.classList) event.target.classList.add('active');

    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`panel-${tabId}`).classList.add('active');

    currentTab = tabId;
    
    const activeContainer = document.querySelector(`#panel-${tabId} .canvas-container`);
    canvases[tabId].width = activeContainer.clientWidth;
    canvases[tabId].height = activeContainer.clientHeight;

    if(tabId === 'pendulo') initPendulo();
    if(tabId === 'colisiones') resetParticles();
    if(tabId === 'fractales') renderJulia();
    if(tabId === 'trigo') initTrigo();
    if(tabId === 'vida') initVida();
}

// --- 1. PÉNDULO DOBLE ---
const ctxPen = canvases.pendulo.getContext('2d');
let pData = null;

function initPendulo() {
    const w = canvases.pendulo.width;
    const h = canvases.pendulo.height;
    pData = {
        r1: parseInt(document.getElementById('param-l1').value),
        r2: parseInt(document.getElementById('param-l2').value),
        m1: 20, m2: 20,
        a1: Math.PI / 2, a2: Math.PI / 2,
        a1_v: 0.0, a2_v: 0.0,
        g: parseInt(document.getElementById('param-g-pen').value) / 10,
        damping: 1 - (parseInt(document.getElementById('param-f-pen').value) / 2000), 
        cx: w / 2, 
        cy: h / 2, // Anclaje centrado verticalmente para dar espacio a giros de 360º
        trailCanvas: document.createElement('canvas')
    };
    pData.trailCanvas.width = w;
    pData.trailCanvas.height = h;
    pData.tCtx = pData.trailCanvas.getContext('2d');
    pData.tCtx.fillStyle = '#05070c';
    pData.tCtx.fillRect(0, 0, w, h);
    pData.lastX2 = null; pData.lastY2 = null;

    loopPendulo();
}

function updatePenduloParams() {
    if(!pData) return;
    pData.r1 = parseInt(document.getElementById('param-l1').value);
    pData.r2 = parseInt(document.getElementById('param-l2').value);
    pData.g = parseInt(document.getElementById('param-g-pen').value) / 10;
    let fVal = parseInt(document.getElementById('param-f-pen').value);
    pData.damping = 1 - (fVal / 2000); 
    document.getElementById('val-l1').innerText = pData.r1;
    document.getElementById('val-l2').innerText = pData.r2;
    document.getElementById('val-g-pen').innerText = pData.g.toFixed(1);
    document.getElementById('val-f-pen').innerText = `${fVal}.0 %`;
}

function loopPendulo() {
    if (currentTab !== 'pendulo') return;

    let num1 = -pData.g * (2 * pData.m1 + pData.m2) * Math.sin(pData.a1);
    let num2 = -pData.m2 * pData.g * Math.sin(pData.a1 - 2 * pData.a2);
    let num3 = -2 * Math.sin(pData.a1 - pData.a2) * pData.m2;
    let num4 = pData.a2_v * pData.a2_v * pData.r2 + pData.a1_v * pData.a1_v * pData.r1 * Math.cos(pData.a1 - pData.a2);
    let den = pData.r1 * (2 * pData.m1 + pData.m2 - pData.m2 * Math.cos(2 * pData.a1 - 2 * pData.a2));
    let a1_a = den === 0 ? 0 : (num1 + num2 + num3 * num4) / den;

    num1 = 2 * Math.sin(pData.a1 - pData.a2);
    num2 = (pData.a1_v * pData.a1_v * pData.r1 * (pData.m1 + pData.m2)) + pData.g * (pData.m1 + pData.m2) * Math.cos(pData.a1) + pData.a2_v * pData.a2_v * pData.r2 * pData.m2 * Math.cos(pData.a1 - pData.a2);
    den = pData.r2 * (2 * pData.m1 + pData.m2 - pData.m2 * Math.cos(2 * pData.a1 - 2 * pData.a2));
    let a2_a = den === 0 ? 0 : (num1 * num2) / den;

    pData.a1_v += a1_a; pData.a2_v += a2_a;
    pData.a1_v *= pData.damping;
    pData.a2_v *= pData.damping;
    pData.a1 += pData.a1_v; pData.a2 += pData.a2_v;

    let x1 = pData.cx + pData.r1 * Math.sin(pData.a1);
    let y1 = pData.cy + pData.r1 * Math.cos(pData.a1);
    let x2 = x1 + pData.r2 * Math.sin(pData.a2);
    let y2 = y1 + pData.r2 * Math.cos(pData.a2);

    let vel = Math.sqrt(pData.a2_v * pData.a2_v * pData.r2 * pData.r2 + pData.a1_v * pData.a1_v * pData.r1 * pData.r1);
    let normVel = Math.min(vel / 25, 1); 
    let hue = 190 + (normVel * 130);

    pData.tCtx.fillStyle = 'rgba(5, 7, 12, 0.04)';
    pData.tCtx.fillRect(0, 0, canvases.pendulo.width, canvases.pendulo.height);

    if (pData.lastX2 !== null) {
        pData.tCtx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
        pData.tCtx.lineWidth = 3;
        pData.tCtx.beginPath();
        pData.tCtx.moveTo(pData.lastX2, pData.lastY2);
        pData.tCtx.lineTo(x2, y2);
        pData.tCtx.stroke();
    }
    pData.lastX2 = x2; pData.lastY2 = y2;

    ctxPen.drawImage(pData.trailCanvas, 0, 0);

    ctxPen.strokeStyle = '#475569';
    ctxPen.lineWidth = 4;
    ctxPen.beginPath();
    ctxPen.moveTo(pData.cx, pData.cy);
    ctxPen.lineTo(x1, y1);
    ctxPen.lineTo(x2, y2);
    ctxPen.stroke();

    ctxPen.fillStyle = '#f8fafc';
    ctxPen.beginPath();
    ctxPen.arc(x1, y1, 7, 0, 2*Math.PI);
    ctxPen.arc(x2, y2, 7, 0, 2*Math.PI);
    ctxPen.fill();

    animationFrameIds['pendulo'] = requestAnimationFrame(loopPendulo);
}

// --- 2. CAJA DE GRAVEDAD ---
const ctxCol = canvases.colisiones.getContext('2d');
let particles = [];
let colParams = { g: 0, friction: 1 };

function resetParticles() {
    particles = [];
    const w = canvases.colisiones.width || 600;
    const h = canvases.colisiones.height || 500;
    
    for(let i=0; i<30; i++) {
        let radius = Math.random() * 8 + 8;
        particles.push({
            x: Math.random() * (w - radius * 4) + radius * 2,
            y: Math.random() * (h - radius * 4) + radius * 2,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            r: radius,
            mass: radius * radius,
            color: `hsl(${Math.random() * 40 + 190}, 90%, 65%)`
        });
    }
    updateColisionesParams();
    loopColisiones();
}

function updateColisionesParams() {
    colParams.g = parseInt(document.getElementById('param-g').value) / 45;
    let viscInput = parseInt(document.getElementById('param-visc').value);
    colParams.friction = 1 - (viscInput / 2500); 
    
    document.getElementById('val-g').innerText = parseInt(document.getElementById('param-g').value);
    document.getElementById('val-visc').innerText = `${viscInput} %`;
}

function resolveCollision(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const nx = dx / dist;
    const ny = dy / dist;

    const kx = p1.vx - p2.vx;
    const ky = p1.vy - p2.vy;
    const p = 2 * (nx * kx + ny * ky) / (p1.mass + p2.mass);

    if ((nx * kx + ny * ky) > 0) { 
        p1.vx -= p * p2.mass * nx;
        p1.vy -= p * p2.mass * ny;
        p2.vx += p * p1.mass * nx;
        p2.vy += p * p1.mass * ny;
    }
}

function loopColisiones() {
    if (currentTab !== 'colisiones') return;
    const w = canvases.colisiones.width;
    const h = canvases.colisiones.height;

    ctxCol.fillStyle = '#05070c';
    ctxCol.fillRect(0,0,w,h);

    particles.forEach(p => {
        p.vy += colParams.g;
        p.vx *= colParams.friction;
        p.vy *= colParams.friction;
        p.x += p.vx; p.y += p.vy;

        if(p.x - p.r < 0) { p.x = p.r; p.vx = Math.abs(p.vx); }
        if(p.x + p.r > w) { p.x = w - p.r; p.vx = -Math.abs(p.vx); }
        if(p.y - p.r < 0) { p.y = p.r; p.vy = Math.abs(p.vy); }
        if(p.y + p.r > h) { p.y = h - p.r; p.vy = -Math.abs(p.vy) * 0.85; if(Math.abs(p.vy) < 0.08) p.vy = 0; }
    });

    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            let pi = particles[i]; let pj = particles[j];
            let dx = pj.x - pi.x;
            let dy = pj.y - pi.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            let minDist = pi.r + pj.r;

            if (dist < minDist) {
                let overlap = minDist - dist;
                let nx = dx / (dist || 1); 
                let ny = dy / (dist || 1);
                pi.x -= nx * overlap * 0.5; pi.y -= ny * overlap * 0.5;
                pj.x += nx * overlap * 0.5; pj.y += ny * overlap * 0.5;

                resolveCollision(pi, pj);
            }
        }
    }

    particles.forEach(p => {
        ctxCol.fillStyle = p.color;
        ctxCol.beginPath();
        ctxCol.arc(p.x, p.y, p.r, 0, 2*Math.PI);
        ctxCol.fill();
    });

    animationFrameIds['colisiones'] = requestAnimationFrame(loopColisiones);
}

// --- 3. FRACTAL DE JULIA ---
const ctxFrac = canvases.fractales.getContext('2d');
let juliaCam = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouseX: 0, lastMouseY: 0 };

function resetJuliaCamera() {
    juliaCam.x = 0; 
    juliaCam.y = 0; 
    juliaCam.zoom = 1;
    ctxFrac.clearRect(0, 0, canvases.fractales.width, canvases.fractales.height);
    renderJulia(); 
}

canvases.fractales.addEventListener('mousedown', (e) => {
    juliaCam.isDragging = true;
    juliaCam.lastMouseX = e.clientX;
    juliaCam.lastMouseY = e.clientY;
});

canvases.fractales.addEventListener('mousemove', (e) => {
    if (!juliaCam.isDragging) return;
    let dx = e.clientX - juliaCam.lastMouseX;
    let dy = e.clientY - juliaCam.lastMouseY;
    
    let w = canvases.fractales.width;
    let h = canvases.fractales.height;
    let factor = Math.min(w, h) * 0.4 * juliaCam.zoom;

    juliaCam.x -= (dx * 1.5) / factor;
    juliaCam.y -= (dy * 1.5) / factor;

    juliaCam.lastMouseX = e.clientX;
    juliaCam.lastMouseY = e.clientY;
    renderJulia();
});

window.addEventListener('mouseup', () => juliaCam.isDragging = false);

canvases.fractales.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvases.fractales.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;

    let w = canvases.fractales.width;
    let h = canvases.fractales.height;
    let scaleFactor = Math.min(w, h) * 0.4;

    let cxBefore = 1.5 * (mouseX - w / 2) / (scaleFactor * juliaCam.zoom) + juliaCam.x;
    let cyBefore = 1.5 * (mouseY - h / 2) / (scaleFactor * juliaCam.zoom) + juliaCam.y;

    if (e.deltaY < 0) juliaCam.zoom *= 1.25;
    else juliaCam.zoom /= 1.25;
    if(juliaCam.zoom < 0.2) juliaCam.zoom = 0.2;

    juliaCam.x = cxBefore - 1.5 * (mouseX - w / 2) / (scaleFactor * juliaCam.zoom);
    juliaCam.y = cyBefore - 1.5 * (mouseY - h / 2) / (scaleFactor * juliaCam.zoom);

    renderJulia();
}, { passive: false });

function renderJulia() {
    if (currentTab !== 'fractales') return;
    let slideVal = parseInt(document.getElementById('param-julia').value) / 100;
    let cx = -0.7 + (slideVal * 0.08); 
    let cy = 0.27015; 
    
    let w = canvases.fractales.width; 
    let h = canvases.fractales.height;
    if(w === 0 || h === 0) return;
    
    let imgData = ctxFrac.createImageData(w, h);
    let maxIter = 40;
    let baseScale = Math.min(w, h) * 0.4 * juliaCam.zoom;

    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            let zx = 1.5 * (x - w / 2) / baseScale + juliaCam.x;
            let zy = 1.5 * (y - h / 2) / baseScale + juliaCam.y;
            let i = maxIter;
            
            while (zx * zx + zy * zy < 4 && i > 0) {
                let tmp = zx * zx - zy * zy + cx;
                zy = 2.0 * zx * zy + cy;
                zx = tmp;
                i--;
            }

            let pix = (x + y * w) * 4;
            if (i === 0) {
                imgData.data[pix] = 5; imgData.data[pix + 1] = 8; imgData.data[pix + 2] = 18;
            } else {
                imgData.data[pix] = (i * 7) % 255;
                imgData.data[pix + 1] = (i * 3) % 110 + 40;
                imgData.data[pix + 2] = (i * 18) % 220 + 35;
            }
            imgData.data[pix + 3] = 255;
        }
    }
    ctxFrac.putImageData(imgData, 0, 0);
}

// --- 4. SINTETIZADOR DE FOURIER ---
const ctxTri = canvases.trigo.getContext('2d');
let fourierState = { t: 0, speed: 0.004, harmonics: 3, history: [] };

function initTrigo() {
    fourierState.history = [];
    updateTrigoParams();
    loopTrigo();
}

function updateTrigoParams() {
    fourierState.speed = parseInt(document.getElementById('param-w').value) / 500;
    fourierState.harmonics = parseInt(document.getElementById('param-harmonics').value);
    document.getElementById('val-w').innerText = (fourierState.speed * 500).toFixed(0);
    document.getElementById('val-harmonics').innerText = fourierState.harmonics;
}

function loopTrigo() {
    if (currentTab !== 'trigo') return;
    const w = canvases.trigo.width;
    const h = canvases.trigo.height;

    ctxTri.fillStyle = '#05070c';
    ctxTri.fillRect(0,0,w,h);

    let originX = w * 0.25; 
    let originY = h / 2;
    let baseRadius = Math.min(w, h) * 0.16;

    fourierState.t += fourierState.speed;

    let x = originX;
    let y = originY;

    for (let i = 0; i < fourierState.harmonics; i++) {
        let prevX = x;
        let prevY = y;
        
        let n = i * 2 + 1; 
        let radius = baseRadius * (4 / (n * Math.PI));

        x += radius * Math.cos(n * fourierState.t);
        y += radius * Math.sin(n * fourierState.t);

        ctxTri.strokeStyle = i === 0 ? '#334155' : 'rgba(56, 189, 248, 0.15)';
        ctxTri.lineWidth = 1;
        ctxTri.beginPath();
        ctxTri.arc(prevX, prevY, radius, 0, 2 * Math.PI);
        ctxTri.stroke();

        ctxTri.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctxTri.beginPath();
        ctxTri.moveTo(prevX, prevY);
        ctxTri.lineTo(x, y);
        ctxTri.stroke();
    }

    fourierState.history.unshift(y);
    let graphStartX = originX + baseRadius + 110;
    if (fourierState.history.length > (w - graphStartX)) fourierState.history.pop();

    ctxTri.strokeStyle = '#64748b';
    ctxTri.setLineDash([3, 4]);
    ctxTri.beginPath();
    ctxTri.moveTo(x, y);
    ctxTri.lineTo(graphStartX, y);
    ctxTri.stroke();
    ctxTri.setLineDash([]);

    ctxTri.strokeStyle = '#38bdf8';
    ctxTri.lineWidth = 3;
    ctxTri.beginPath();
    for (let i = 0; i < fourierState.history.length; i++) {
        ctxTri.lineTo(graphStartX + i, fourierState.history[i]);
    }
    ctxTri.stroke();

    animationFrameIds['trigo'] = requestAnimationFrame(loopTrigo);
}

// --- 5. JUEGO DE LA VIDA ---
const ctxVid = canvases.vida.getContext('2d');
let res = 15; let cols = 0, rows = 0;
let grid = [];
let isRunningVida = true; let isDrawingVida = false;

function initVida() {
    syncVidaDimensions();
    grid = Array.from({length: cols}, () => Array.from({length: rows}, () => Math.random() > 0.85 ? 1 : 0));
    loopVida();
}

function syncVidaDimensions() {
    const w = canvases.vida.width; const h = canvases.vida.height;
    if(w === 0 || h === 0) return;
    const targetCols = Math.floor(w / res); const targetRows = Math.floor(h / res);
    if (targetCols !== cols || targetRows !== rows) {
        cols = targetCols; rows = targetRows;
        grid = Array.from({length: cols}, () => Array.from({length: rows}, () => 0));
    }
}

function toggleVida() {
    isRunningVida = !isRunningVida;
    document.getElementById('btn-play-vida').innerText = isRunningVida ? 'Pausar' : 'Reanudar';
}

function clearVida() {
    grid = Array.from({length: cols}, () => Array.from({length: rows}, () => 0));
}

function injectLife(e) {
    const rect = canvases.vida.getBoundingClientRect();
    let mx = Math.floor((e.clientX - rect.left) / res);
    let my = Math.floor((e.clientY - rect.top) / res);
    if (mx >= 0 && mx < cols && my >= 0 && my < rows) {
        grid[mx][my] = 1;
    }
}

canvases.vida.addEventListener('mousedown', (e) => { 
    isDrawingVida = true; 
    injectLife(e); 
});

canvases.vida.addEventListener('mousemove', (e) => {
    if(isDrawingVida) injectLife(e);
});

window.addEventListener('mouseup', () => isDrawingVida = false);

let lastUpdateTime = 0;
function loopVida(timestamp) {
    if (currentTab !== 'vida') return;
    let speedInput = parseInt(document.getElementById('param-speed-vida').value);
    let targetInterval = 1000 / speedInput; 
    
    ctxVid.fillStyle = '#05070c';
    ctxVid.fillRect(0,0,canvases.vida.width,canvases.vida.height);

    for(let x=0; x<cols; x++) {
        for(let y=0; y<rows; y++) {
            if(grid[x] && grid[x][y] === 1) {
                ctxVid.fillStyle = '#38bdf8';
                ctxVid.fillRect(x*res, y*res, res-1, res-1);
            }
        }
    }

    if(isRunningVida && timestamp - lastUpdateTime > targetInterval) {
        let nextGrid = Array.from({length: cols}, () => Array.from({length: rows}, () => 0));
        for(let x=0; x<cols; x++) {
            for(let y=0; y<rows; y++) {
                let neighbors = 0;
                for(let i=-1; i<2; i++) {
                    for(let j=-1; j<2; j++) {
                        if(i===0 && j===0) continue;
                        let nx = (x + i + cols) % cols;
                        let ny = (y + j + rows) % rows;
                        if (grid[nx]) neighbors += grid[nx][ny] || 0;
                    }
                }
                let currentStatus = (grid[x]) ? grid[x][y] : 0;
                if(currentStatus === 1 && (neighbors === 2 || neighbors === 3)) nextGrid[x][y] = 1;
                else if(currentStatus === 0 && neighbors === 3) nextGrid[x][y] = 1;
            }
        }
        grid = nextGrid;
        lastUpdateTime = timestamp;
    }
    animationFrameIds['vida'] = requestAnimationFrame(loopVida);
}

window.onload = () => { 
    const container = document.querySelector('.canvas-container');
    canvases.pendulo.width = container.clientWidth;
    canvases.pendulo.height = container.clientHeight;
    initPendulo(); 
};