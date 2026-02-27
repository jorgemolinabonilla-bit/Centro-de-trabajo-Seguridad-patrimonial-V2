/**
 * Crime Statistics Module (OIJ) - HOLCIM CR
 * Handles data simulation, filtering, and visualization of criminal statistics with Leaflet Heatmap.
 */

(function () {
    const CANTONS_BY_PROVINCE = {
        "SAN JOSE": ["SAN JOSE", "ESCAZU", "DESAMPARADOS", "PURISCAL", "TARRAZU", "ASERRI", "MORA", "GOICOECHEA", "SANTA ANA", "ALAJUELITA", "VAZQUEZ DE CORONADO", "ACOSTA", "TIBAS", "MORAVIA", "MONTES DE OCA", "TURRUBARES", "DOTA", "CURRIDABAT", "PEREZ ZELEDON", "LEON CORTES"],
        "ALAJUELA": ["ALAJUELA", "SAN RAMON", "GRECIA", "SAN MATEO", "ATENAS", "NARANJO", "PALMARES", "POAS", "OROTINA", "SAN CARLOS", "ZARCERO", "SARCHI", "UPALA", "LOS CHILES", "GUATUSO", "RIO CUARTO"],
        "CARTAGO": ["CARTAGO", "PARAISO", "LA UNION", "JIMENEZ", "TURRIALBA", "ALVARADO", "OREAMUNO", "EL GUARCO"],
        "HEREDIA": ["HEREDIA", "BARVA", "SANTO DOMINGO", "SANTA BARBARA", "SAN RAFAEL", "SAN ISIDRO", "BELEN", "FLORES", "PABLO PRESBERE", "SARAPIQUI"],
        "GUANACASTE": ["LIBERIA", "NICOYA", "SANTA CRUZ", "BAGACES", "CAÑAS", "ABANGARES", "TILARAN", "NANDAYURE", "LA CRUZ", "HOJANCHA", "RIO NEGRO"],
        "PUNTARENAS": ["PUNTARENAS", "ESPARZA", "BUENOS AIRES", "MONTES DE ORO", "OSA", "QUEPOS", "GOLFITO", "COTO BRUS", "PARRITA", "CORREDORES", "GARABITO"],
        "LIMON": ["LIMON", "POCOCI", "SIQUIRRES", "TALAMANCA", "MATINA", "GUACIMO"]
    };

    const DISTRICTS_MAPPING = {
        "SAN JOSE": ["CARMEN", "MERCED", "HOSPITAL", "CATEDRAL", "ZAPOTE", "SAN FRANCISCO DE DOS RIOS", "URUCA"],
        "ESCAZU": ["ESCAZU", "SAN ANTONIO", "SAN RAFAEL"],
        "DESAMPARADOS": ["DESAMPARADOS", "SAN MIGUEL", "SAN JUAN DE DIOS"],
        "ALAJUELA": ["ALAJUELA", "SAN JOSE", "CARRIZAL", "SABANILLA"],
        // Fallback for others to keep it simple but realistic
        "DEFAULT": ["DISTRITO CENTRAL", "DISTRITO 2", "DISTRITO 3"]
    };

    const PROVINCE_COORDS = {
        "SAN JOSE": [9.9333, -84.0833],
        "ALAJUELA": [10.0167, -84.2167],
        "CARTAGO": [9.8667, -83.9167],
        "HEREDIA": [10.0000, -84.1167],
        "GUANACASTE": [10.6333, -85.4333],
        "PUNTARENAS": [9.9667, -84.8333],
        "LIMON": [10.0000, -83.0333]
    };

    const CRIME_TYPES = ["ASALTO", "HURTO", "ROBO", "ROBO DE VEHICULO", "TACHA DE VEHICULO", "HOMICIDIO"];

    let rawCrimeData = [];
    let charts = {};
    let map = null;
    let mapMarkers = L.layerGroup();

    // ─── INITIALIZATION ──────────────────────────────────────────────────────────
    window.initCrimeStats = function () {
        generateMockCrimeData();
        initMap();
        window.updateCrimeCantons();
        window.refreshCrimeDashboard();
    };

    function initMap() {
        if (map) return;

        // Define base layers
        const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO'
        });

        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        });

        map = L.map('crime-heatmap', {
            center: [9.7489, -83.7534],
            zoom: 8,
            layers: [streetLayer]
        });

        const baseMaps = {
            "Mapa de Calles": streetLayer,
            "Satélite (Google Earth)": satelliteLayer
        };

        L.control.layers(baseMaps).addTo(map);
        mapMarkers.addTo(map);

        // Fix map resize issue in hidden tabs
        setTimeout(() => map.invalidateSize(), 500);
    }

    window.refreshCrimeMap = function () {
        if (map) {
            setTimeout(() => map.invalidateSize(), 100);
        }
    };

    function generateMockCrimeData() {
        const data = [];
        const provinces = Object.keys(CANTONS_BY_PROVINCE);
        const currentYear = new Date().getFullYear();

        for (let i = 0; i < 3000; i++) {
            const year = 2025 + Math.floor(Math.random() * (currentYear - 2025 + 1));
            const month = Math.floor(Math.random() * 12);
            const day = Math.floor(Math.random() * 28) + 1;

            // OIJ data shows peaks at specific times (night/early morning)
            let hour;
            const r = Math.random();
            if (r < 0.4) hour = Math.floor(Math.random() * 6); // 0-5
            else if (r < 0.7) hour = 18 + Math.floor(Math.random() * 6); // 18-23
            else hour = 6 + Math.floor(Math.random() * 12); // 6-17

            const province = provinces[Math.floor(Math.random() * provinces.length)];
            const cantons = CANTONS_BY_PROVINCE[province];
            const canton = cantons[Math.floor(Math.random() * cantons.length)];

            const districts = DISTRICTS_MAPPING[canton] || DISTRICTS_MAPPING["DEFAULT"];
            const district = districts[Math.floor(Math.random() * districts.length)];

            const crimeType = CRIME_TYPES[Math.floor(Math.random() * CRIME_TYPES.length)];

            // Generate jittered coordinates around province center
            const baseCoords = PROVINCE_COORDS[province];
            const lat = baseCoords[0] + (Math.random() - 0.5) * 0.4;
            const lng = baseCoords[1] + (Math.random() - 0.5) * 0.4;

            data.push({
                date: new Date(year, month, day),
                year,
                month,
                hour,
                province,
                canton,
                district,
                type: crimeType,
                coords: [lat, lng]
            });
        }
        rawCrimeData = data;
    }

    window.updateCrimeCantons = function () {
        const province = document.getElementById('crime-filter-province').value;
        const cantonSelect = document.getElementById('crime-filter-canton');

        cantonSelect.innerHTML = '<option value="ALL">Todos los Cantones</option>';

        if (province !== 'ALL' && CANTONS_BY_PROVINCE[province]) {
            CANTONS_BY_PROVINCE[province].forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                cantonSelect.appendChild(opt);
            });
        }
        window.updateCrimeDistricts();
    };

    window.updateCrimeDistricts = function () {
        const canton = document.getElementById('crime-filter-canton').value;
        const districtSelect = document.getElementById('crime-filter-district');

        districtSelect.innerHTML = '<option value="ALL">Todos los Distritos</option>';

        const districts = DISTRICTS_MAPPING[canton] || (canton !== 'ALL' ? DISTRICTS_MAPPING["DEFAULT"] : []);
        districts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            districtSelect.appendChild(opt);
        });
    };

    window.refreshCrimeDashboard = function () {
        const province = document.getElementById('crime-filter-province').value;
        const canton = document.getElementById('crime-filter-canton').value;
        const district = document.getElementById('crime-filter-district').value;
        const year = parseInt(document.getElementById('crime-filter-year').value);
        const month = document.getElementById('crime-filter-month').value;
        const type = document.getElementById('crime-filter-type').value;

        const filtered = rawCrimeData.filter(d => {
            if (province !== 'ALL' && d.province !== province) return false;
            if (canton !== 'ALL' && d.canton !== canton) return false;
            if (district !== 'ALL' && d.district !== district) return false;
            if (d.year !== year) return false;
            if (month !== 'ALL' && d.month !== parseInt(month)) return false;
            if (type !== 'ALL' && d.type !== type) return false;
            return true;
        });

        updateKPIs(filtered);
        renderCharts(filtered);
        updateHeatmap(filtered);
    };

    function updateKPIs(data) {
        document.getElementById('kpi-total-incidents').textContent = data.length;

        if (data.length === 0) {
            document.getElementById('kpi-peak-hour').textContent = '--:--';
            document.getElementById('kpi-top-category').textContent = '---';
            document.getElementById('kpi-top-province').textContent = '---';
            return;
        }

        const hourCounts = {};
        const typeCounts = {};
        const provCounts = {};
        data.forEach(d => {
            hourCounts[d.hour] = (hourCounts[d.hour] || 0) + 1;
            typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
            provCounts[d.province] = (provCounts[d.province] || 0) + 1;
        });

        const peakHour = Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b);
        document.getElementById('kpi-peak-hour').textContent = `${peakHour.padStart(2, '0')}:00 - ${(parseInt(peakHour) + 1).toString().padStart(2, '0')}:00`;

        const topType = Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b);
        document.getElementById('kpi-top-category').textContent = topType;

        const topProv = Object.keys(provCounts).reduce((a, b) => provCounts[a] > provCounts[b] ? a : b);
        document.getElementById('kpi-top-province').textContent = topProv;
    }

    function updateHeatmap(data) {
        if (!map) return;
        mapMarkers.clearLayers();

        // Group data by province center for visual density representation if filtered by province
        // or show jittered points for detail
        data.forEach(d => {
            const color = d.type === 'HOMICIDIO' ? '#ef4444' : '#f59e0b';
            const radius = d.type === 'HOMICIDIO' ? 1000 : 500;

            L.circle(d.coords, {
                color: color,
                fillColor: color,
                fillOpacity: 0.4,
                radius: radius,
                stroke: false
            }).bindPopup(`<b>${d.type}</b><br>${d.province}, ${d.canton}, ${d.district}`).addTo(mapMarkers);
        });

        if (data.length > 0) {
            const bounds = L.latLngBounds(data.map(d => d.coords));
            map.flyToBounds(bounds, { padding: [20, 20], maxZoom: 12 });
        }
    }

    function renderCharts(data) {
        renderTrendChart(data);
        renderTypeChart(data);
        renderProvinceChart(data);
        renderCriminalClock(data);
    }

    function renderCriminalClock(data) {
        const hourCounts = new Array(24).fill(0);
        data.forEach(d => hourCounts[d.hour]++);

        if (charts.clock) charts.clock.destroy();

        const ctx = document.getElementById('chart-crime-clock').getContext('2d');
        charts.clock = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Frecuencia por Hora',
                    data: hourCounts,
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    pointBackgroundColor: '#ef4444',
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    r: {
                        angleLines: { color: '#e2e8f0' },
                        grid: { color: '#e2e8f0' },
                        pointLabels: { font: { size: 9 } },
                        ticks: { display: false }
                    }
                }
            }
        });
    }

    function renderTrendChart(data) {
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const monthlyCounts = new Array(12).fill(0);
        data.forEach(d => monthlyCounts[d.month]++);

        if (charts.trend) charts.trend.destroy();

        const ctx = document.getElementById('chart-crime-trend').getContext('2d');
        charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Número de Delitos',
                    data: monthlyCounts,
                    borderColor: '#0d9488',
                    backgroundColor: 'rgba(13, 148, 136, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#0d9488'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function renderTypeChart(data) {
        const typeCounts = {};
        data.forEach(d => typeCounts[d.type] = (typeCounts[d.type] || 0) + 1);

        const labels = Object.keys(typeCounts);
        const values = Object.values(typeCounts);

        if (charts.types) charts.types.destroy();

        const ctx = document.getElementById('chart-crime-types').getContext('2d');
        charts.types = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
                },
                cutout: '70%'
            }
        });
    }

    function renderProvinceChart(data) {
        const provCounts = {};
        data.forEach(d => provCounts[d.province] = (provCounts[d.province] || 0) + 1);

        const sortedProvs = Object.keys(provCounts).sort((a, b) => provCounts[b] - provCounts[a]);
        const values = sortedProvs.map(p => provCounts[p]);

        if (charts.provinces) charts.provinces.destroy();

        const ctx = document.getElementById('chart-crime-provinces').getContext('2d');
        charts.provinces = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedProvs,
                datasets: [{
                    label: 'Incidencia por Provincia',
                    data: values,
                    backgroundColor: '#1e293b',
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

})();
