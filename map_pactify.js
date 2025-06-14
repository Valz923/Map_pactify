// Les lignes 'import' sont supprimées car nous utilisons les scripts 'compat' via les balises <script> dans l'HTML.
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";

// Votre configuration Firebase (celle que vous avez fournie)
// C'est la seule et unique déclaration de firebaseConfig
const firebaseConfig = {
    apiKey: "AIzaSyC8BXEEFh5o6zVd-mx2z8oED69DWRYzZTc",
    authDomain: "mappactifyproject.firebaseapp.com",
    databaseURL: "https://mappactifyproject-default-rtdb.europe-west1.firebasedatabase.app", // C'est parfait, l'URL est correcte
    projectId: "mappactifyproject",
    storageBucket: "mappactifyproject.firebasestorage.app",
    messagingSenderId: "641542909374",
    appId: "1:641542909374:web:2bf091912be9a661d05def",
    measurementId: "G-6M2TN1B2KN"
};

// Initialisation de Firebase (Utilisez cette syntaxe compatible avec les scripts HTML)
// Une seule initialisation de 'app'
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database(); // Accès à la Realtime Database
const pointsRef = database.ref('mapPoints'); // Référence à la "collection" de points

// La ligne 'const analytics = getAnalytics(app);' est supprimée car 'getAnalytics'
// n'est pas disponible avec les scripts 'compat' sans import spécifique.
// Si vous avez besoin d'Analytics, il faudrait un script additionnel et utiliser firebase.analytics().

// La commande 'npm install firebase' est pour Node.js et n'est pas utilisée ici.


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

    // Array to store our points (maintenant chargée depuis Firebase)
    let points = [];

    // --- Fonctions de persistance (maintenant avec Firebase) ---

    // Suppression des fonctions savePoints() et loadPoints() basées sur localStorage,
    // car Firebase gère la persistance et la synchronisation.
    // function savePoints() { /* ... */ }
    // function loadPoints() { /* ... */ }

    // Écouteur Firebase pour charger les points et les mettre à jour en temps réel
    function setupFirebaseListener() {
        pointsRef.on('value', (snapshot) => {
            // 'value' est déclenché une fois au début et à chaque changement de données
            const data = snapshot.val(); // Récupère toutes les données sous 'mapPoints'
            points = []; // Vide le tableau local

            if (data) {
                // Firebase renvoie un objet d'objets, pas un tableau direct.
                // Nous devons le convertir en tableau. Les clés sont les IDs uniques générés par Firebase.
                for (let key in data) {
                    // Chaque point dans Firebase aura un ID unique (key)
                    // que nous stockons avec le point pour la suppression.
                    points.push({ firebaseId: key, ...data[key] });
                }
            }
            renderPointsList(); // Met à jour la liste HTML
            drawMap();          // Redessine la carte
        }, (error) => {
            console.error("Erreur de lecture Firebase :", error);
        });
    }


    // --- Coordinate Transformation Functions (inchangées) ---

    // Converts a real-world X coordinate to a canvas pixel X coordinate
    function worldToCanvasX(worldX) {
        const normalizedX = (worldX - MIN_COORD) / MAP_RANGE;
        return (normalizedX * CANVAS_SIZE * scale) + offsetX;
    }

    // Converts a real-world Y coordinate to a canvas pixel Y coordinate
    function worldToCanvasY(worldY) {
        const normalizedY = (worldY - MIN_COORD) / MAP_RANGE;
        return (CANVAS_SIZE - (normalizedY * CANVAS_SIZE)) * scale + offsetY;
    }

    // Converts a canvas pixel X coordinate to a real-world X coordinate
    function canvasToWorldX(canvasX) {
        const scaledX = (canvasX - offsetX) / scale;
        return (scaledX / CANVAS_SIZE) * MAP_RANGE + MIN_COORD;
    }

    // Converts a canvas pixel Y coordinate to a real-world Y coordinate
    function canvasToWorldY(canvasY) {
        const scaledY = (canvasY - offsetY) / scale;
        return MAX_COORD - (scaledY / CANVAS_SIZE) * MAP_RANGE;
    }

    // --- Drawing Functions (inchangées) ---

    function drawMap() {
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.save();
        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        const gridStep = 1000;
        for (let x = MIN_COORD; x <= MAX_COORD; x += gridStep) {
            const canvasX = worldToCanvasX(x);
            if (canvasX >= -CANVAS_SIZE * 2 && canvasX <= CANVAS_SIZE * 2) {
                ctx.beginPath();
                ctx.moveTo(canvasX, worldToCanvasY(MIN_COORD));
                ctx.lineTo(canvasX, worldToCanvasY(MAX_COORD));
                ctx.stroke();
            }
        }
        for (let y = MIN_COORD; y <= MAX_COORD; y += gridStep) {
            const canvasY = worldToCanvasY(y);
            if (canvasY >= -CANVAS_SIZE * 2 && canvasY <= CANVAS_SIZE * 2) {
                ctx.beginPath();
                ctx.moveTo(worldToCanvasX(MIN_COORD), canvasY);
                ctx.lineTo(worldToCanvasX(MAX_COORD), canvasY);
                ctx.stroke();
            }
        }

        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        const centerY_world = 0;
        const centerY_canvas = worldToCanvasY(centerY_world);
        ctx.beginPath();
        ctx.moveTo(worldToCanvasX(MIN_COORD), centerY_canvas);
        ctx.lineTo(worldToCanvasX(MAX_COORD), centerY_canvas);
        ctx.stroke();

        const centerX_world = 0;
        const centerX_canvas = worldToCanvasX(centerX_world);
        ctx.beginPath();
        ctx.moveTo(centerX_canvas, worldToCanvasY(MIN_COORD));
        ctx.lineTo(centerX_canvas, worldToCanvasY(MAX_COORD));
        ctx.stroke();

        points.forEach(point => {
            drawPoint(point.x, point.y, point.label);
        });
        ctx.restore();
    }

    function drawPoint(worldX, worldY, label = '') {
        const canvasX = worldToCanvasX(worldX);
        const canvasY = worldToCanvasY(worldY);

        if (canvasX < -10 || canvasX > CANVAS_SIZE + 10 || canvasY < -10 || canvasY > CANVAS_SIZE + 10) {
            return;
        }

        const basePointRadius = 3;
        const minPointRadius = 2;
        const maxPointRadius = 15;
        const pointRadius = Math.min(maxPointRadius, Math.max(minPointRadius, basePointRadius * scale));

        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, pointRadius, 0, Math.PI * 2);
        ctx.fill();

        if (label && scale > 0.5) {
            const labelFontSize = Math.min(20, Math.max(10, 12 * scale));
            ctx.fillStyle = 'black';
            ctx.font = `${labelFontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(label, canvasX, canvasY - (pointRadius + 5));
        }
    }

    // --- Point Management Functions (modifiées pour Firebase) ---

    function addPoint(x, y, label = '') {
        if (isNaN(x) || isNaN(y) || x < MIN_COORD || x > MAX_COORD || y < MIN_COORD || y > MAX_COORD) {
            alert(`Please enter valid coordinates within the range ${MIN_COORD} to ${MAX_COORD}.`);
            return;
        }
        const newPointData = { x: x, y: y, label: label, timestamp: firebase.database.ServerValue.TIMESTAMP };
        // Ajoute un nouveau point à la base de données. Firebase génère un ID unique.
        pointsRef.push(newPointData)
            .then(() => { console.log("Point ajouté à Firebase !"); })
            .catch(error => { console.error("Erreur lors de l'ajout du point à Firebase :", error); });
    }

    function removePoint(index) {
        // Nous avons besoin de l'ID Firebase du point pour le supprimer
        const pointToRemove = points[index];
        if (pointToRemove && pointToRemove.firebaseId) {
            pointsRef.child(pointToRemove.firebaseId).remove()
                .then(() => { console.log("Point supprimé de Firebase !"); })
                .catch(error => { console.error("Erreur lors de la suppression du point de Firebase :", error); });
        }
    }

    function renderPointsList() {
        pointsList.innerHTML = '';
        points.forEach((point, index) => {
            const listItem = document.createElement('li');
            const labelText = point.label ? ` (${point.label})` : '';
            listItem.innerHTML = `
                <span>X: ${point.x}, Y: ${point.y}${labelText}</span>
                <button data-index="${index}">Remove</button>
            `;
            pointsList.appendChild(listItem);
        });

        pointsList.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (event) => {
                const indexToRemove = parseInt(event.target.dataset.index);
                removePoint(indexToRemove);
            });
        });
    }

    // --- Event Listeners (inchangés) ---
    addPointBtn.addEventListener('click', () => {
        const x = parseFloat(pointXInput.value);
        const y = parseFloat(pointYInput.value);
        const label = pointLabelInput.value.trim();
        addPoint(x, y, label);
        pointXInput.value = '0';
        pointYInput.value = '0';
        pointLabelInput.value = '';
    });

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

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();

        const zoomFactor = 1.1;
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;
        const mouseY = e.clientY - canvas.getBoundingClientRect().top;

        const worldXAtMouse = canvasToWorldX(mouseX);
        const worldYAtMouse = canvasToWorldY(mouseY);

        if (e.deltaY < 0) {
            scale *= zoomFactor;
        } else {
            scale /= zoomFactor;
        }

        scale = Math.max(0.1, Math.min(10, scale));

        offsetX = mouseX - (worldToCanvasX(worldXAtMouse) - offsetX);
        offsetY = mouseY - (worldToCanvasY(worldYAtMouse) - offsetY);

        drawMap();
    });

    // --- Initialisation ---
    setupFirebaseListener(); // Démarre l'écoute des points depuis Firebase
    // Les lignes 'loadPoints()' et 'renderPointsList()' ici sont supprimées car setupFirebaseListener() les gère.
    // loadPoints();
    // renderPointsList();
    // drawMap(); // La carte est dessinée par setupFirebaseListener() après chargement des points
    canvas.style.cursor = 'grab';
});
