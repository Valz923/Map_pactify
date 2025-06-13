document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('mapCanvas');
    const ctx = canvas.getContext('2d');
    const addPointBtn = document.getElementById('addPointBtn');
    const pointXInput = document.getElementById('pointX');
    const pointYInput = document.getElementById('pointY');
    const pointLabelInput = document.getElementById('pointLabel');
    const pointsList = document.getElementById('pointsList');

    // Define the map's real-world coordinate range
    const MIN_COORD = -6400;
    const MAX_COORD = 6400;
    const MAP_RANGE = MAX_COORD - MIN_COORD; // 12800

    // Canvas dimensions (adjust as needed, making it square is good)
    const CANVAS_SIZE = 800; // Increased size for better panning experience
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // --- Zoom and Pan Variables ---
    let scale = 1.0; // Initial zoom level (1.0 = no zoom)
    let offsetX = 0; // X-offset for panning
    let offsetY = 0; // Y-offset for panning
    let isDragging = false;
    let lastMouseX, lastMouseY;

    // Array to store our points
    let points = []; // This will now be loaded from localStorage

    // --- Persistence Functions ---

    // Sauvegarde les points dans localStorage
    function savePoints() {
        // Convertit le tableau de points en chaîne JSON et le stocke
        localStorage.setItem('mapPoints', JSON.stringify(points));
    }

    // Charge les points depuis localStorage
    function loadPoints() {
        const storedPoints = localStorage.getItem('mapPoints');
        if (storedPoints) {
            // Parse la chaîne JSON pour la convertir en tableau d'objets
            points = JSON.parse(storedPoints);
        } else {
            points = []; // Si rien n'est stocké, initialise un tableau vide
        }
    }

    // --- Coordinate Transformation Functions (updated for zoom/pan) ---

    // Converts a real-world X coordinate to a canvas pixel X coordinate
    function worldToCanvasX(worldX) {
        // Normalize the world coordinate (0 to 1)
        const normalizedX = (worldX - MIN_COORD) / MAP_RANGE;
        // Scale to canvas size and apply zoom and pan
        return (normalizedX * CANVAS_SIZE * scale) + offsetX;
    }

    // Converts a real-world Y coordinate to a canvas pixel Y coordinate
    function worldToCanvasY(worldY) {
        // Normalize the world coordinate (0 to 1)
        const normalizedY = (worldY - MIN_COORD) / MAP_RANGE;
        // Invert Y for canvas (canvas Y increases downwards, world Y increases upwards)
        // Apply scale and pan
        return (CANVAS_SIZE - (normalizedY * CANVAS_SIZE)) * scale + offsetY;
    }

    // Converts a canvas pixel X coordinate to a real-world X coordinate
    function canvasToWorldX(canvasX) {
        // Reverse pan and scale
        const scaledX = (canvasX - offsetX) / scale;
        // Reverse canvas scaling and normalization
        return (scaledX / CANVAS_SIZE) * MAP_RANGE + MIN_COORD;
    }

    // Converts a canvas pixel Y coordinate to a real-world Y coordinate
    function canvasToWorldY(canvasY) {
        // Reverse pan and scale
        const scaledY = (canvasY - offsetY) / scale;
        // Reverse canvas Y inversion and scaling/normalization
        return MAX_COORD - (scaledY / CANVAS_SIZE) * MAP_RANGE;
    }

    // --- Drawing Functions ---

    function drawMap() {
        // Clear the canvas
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Save current transformation state
        ctx.save();

        // Draw background before transformation
        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);


        // --- Draw Grid (optional, helps with navigation) ---
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        const gridStep = 1000; // Draw grid lines every 1000 units
        for (let x = MIN_COORD; x <= MAX_COORD; x += gridStep) {
            const canvasX = worldToCanvasX(x);
            if (canvasX >= -CANVAS_SIZE * 2 && canvasX <= CANVAS_SIZE * 2) { // Only draw if roughly in view
                ctx.beginPath();
                ctx.moveTo(canvasX, worldToCanvasY(MIN_COORD));
                ctx.lineTo(canvasX, worldToCanvasY(MAX_COORD));
                ctx.stroke();
            }
        }
        for (let y = MIN_COORD; y <= MAX_COORD; y += gridStep) {
            const canvasY = worldToCanvasY(y);
            if (canvasY >= -CANVAS_SIZE * 2 && canvasY <= CANVAS_SIZE * 2) { // Only draw if roughly in view
                ctx.beginPath();
                ctx.moveTo(worldToCanvasX(MIN_COORD), canvasY);
                ctx.lineTo(worldToCanvasX(MAX_COORD), canvasY);
                ctx.stroke();
            }
        }


        // Draw axes (center lines)
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;

        // X-axis (line at Y=0)
        const centerY_world = 0;
        const centerY_canvas = worldToCanvasY(centerY_world);
        ctx.beginPath();
        ctx.moveTo(worldToCanvasX(MIN_COORD), centerY_canvas);
        ctx.lineTo(worldToCanvasX(MAX_COORD), centerY_canvas);
        ctx.stroke();

        // Y-axis (line at X=0)
        const centerX_world = 0;
        const centerX_canvas = worldToCanvasX(centerX_world);
        ctx.beginPath();
        ctx.moveTo(centerX_canvas, worldToCanvasY(MIN_COORD));
        ctx.lineTo(centerX_canvas, worldToCanvasY(MAX_COORD));
        ctx.stroke();


        // Draw points
        points.forEach(point => {
            drawPoint(point.x, point.y, point.label);
        });

        // Restore context (important if you apply global transforms that you don't want to affect subsequent draws)
        ctx.restore();
    }

    function drawPoint(worldX, worldY, label = '') {
        const canvasX = worldToCanvasX(worldX);
        const canvasY = worldToCanvasY(worldY);

        // Only draw points if they are roughly visible on the canvas
        if (canvasX < -10 || canvasX > CANVAS_SIZE + 10 || canvasY < -10 || canvasY > CANVAS_SIZE + 10) {
            return; // Point is out of view
        }

        // Make point size scale directly with zoom, with a minimum and maximum.
        const basePointRadius = 3; // The desired size at scale 1.0
        const minPointRadius = 2; // Minimum size to ensure visibility when very zoomed out
        const maxPointRadius = 15; // Maximum size to prevent points from becoming too large when very zoomed in

        const pointRadius = Math.min(maxPointRadius, Math.max(minPointRadius, basePointRadius * scale));

        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, pointRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw label (only if zoomed in enough or if point is large enough)
        if (label && scale > 0.5) { // Only show labels when sufficiently zoomed in
            // Adjust font size with zoom, but also clamp it for readability
            const labelFontSize = Math.min(20, Math.max(10, 12 * scale));
            ctx.fillStyle = 'black';
            ctx.font = `${labelFontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            // Offset adjusts with pointRadius to stay above the circle
            ctx.fillText(label, canvasX, canvasY - (pointRadius + 5));
        }
    }

    // --- Point Management Functions ---

    function addPoint(x, y, label = '') {
        // Basic validation
        if (isNaN(x) || isNaN(y) || x < MIN_COORD || x > MAX_COORD || y < MIN_COORD || y > MAX_COORD) {
            alert(`Please enter valid coordinates within the range ${MIN_COORD} to ${MAX_COORD}.`);
            return;
        }

        const newPoint = { x: x, y: y, label: label };
        points.push(newPoint);
        savePoints(); // Sauvegarde après ajout
        renderPointsList();
        drawMap(); // Redraw map with the new point
    }

    function removePoint(index) {
        points.splice(index, 1); // Remove 1 element at the given index
        savePoints(); // Sauvegarde après suppression
        renderPointsList();
        drawMap(); // Redraw map without the removed point
    }

    function renderPointsList() {
        pointsList.innerHTML = ''; // Clear existing list
        points.forEach((point, index) => {
            const listItem = document.createElement('li');
            const labelText = point.label ? ` (${point.label})` : '';
            listItem.innerHTML = `
                <span>X: ${point.x}, Y: ${point.y}${labelText}</span>
                <button data-index="${index}">Remove</button>
            `;
            pointsList.appendChild(listItem);
        });

        // Add event listeners to the new "Remove" buttons
        pointsList.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (event) => {
                const indexToRemove = parseInt(event.target.dataset.index);
                removePoint(indexToRemove);
            });
        });
    }

    // --- Event Listeners ---

    addPointBtn.addEventListener('click', () => {
        const x = parseFloat(pointXInput.value);
        const y = parseFloat(pointYInput.value);
        const label = pointLabelInput.value.trim();

        addPoint(x, y, label);

        // Clear input fields after adding
        pointXInput.value = '0';
        pointYInput.value = '0';
        pointLabelInput.value = '';
    });

    // --- Mouse Events for Panning ---
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;

        offsetX += deltaX;
        offsetY += deltaY;

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        drawMap();
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
    });

    canvas.addEventListener('mouseout', () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
    });

    // --- Mouse Wheel for Zooming ---
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault(); // Prevent page scrolling

        const zoomFactor = 1.1; // How much to zoom in/out
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;
        const mouseY = e.clientY - canvas.getBoundingClientRect().top;

        // Calculate world coordinates at mouse position before zoom
        const worldXAtMouse = canvasToWorldX(mouseX);
        const worldYAtMouse = canvasToWorldY(mouseY);

        if (e.deltaY < 0) {
            // Zoom in
            scale *= zoomFactor;
        } else {
            // Zoom out
            scale /= zoomFactor;
        }

        // Clamp scale to prevent too much zoom in/out
        scale = Math.max(0.1, Math.min(10, scale)); // Min 0.1x, Max 10x zoom

        // Recalculate offsets to keep mouse position fixed on world coordinate
        // This is the "zoom to mouse" logic
        offsetX = mouseX - (worldToCanvasX(worldXAtMouse) - offsetX);
        offsetY = mouseY - (worldToCanvasY(worldYAtMouse) - offsetY);

        drawMap();
    });

    // --- Initialisation ---
    loadPoints(); // Charge les points au démarrage
    renderPointsList(); // Affiche les points chargés dans la liste
    drawMap(); // Dessine la carte avec les points chargés
    canvas.style.cursor = 'grab'; // Set initial cursor style
});