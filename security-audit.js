// ============================================================
// SECURITY AUDIT TOOL – HOLCIM CR
// Module: security-audit.js
// Version 1.0 – Corporate Security
// ============================================================

(function () {
    'use strict';

    // ─── AUDIT DATA STRUCTURE ────────────────────────────────────────────────────
    const AUDIT_MODULES = {
        technical: {
            label: 'Activos Técnicos',
            weight: 25,
            items: [
                // Intrusion Detection
                { id: 'ta01', cat: 'Detección de Intrusión', label: 'Detección perímetral (existencia y calidad)', weight: 8, desc: 'Evalúa la presencia y eficacia de sensores de movimiento, mallas electrificadas o sistemas de detección por fibra óptica en el perímetro.' },
                { id: 'ta02', cat: 'Detección de Intrusión', label: 'Detección interna en áreas sensibles', weight: 7, desc: 'Verifica la protección de zonas críticas (bodegas, servidores, cajas) mediante PIR, sensores magnéticos o vibración.' },
                { id: 'ta03', cat: 'Detección de Intrusión', label: 'Detección interna en edificios', weight: 6, desc: 'Sistemas anti-intrusión en oficinas y áreas comunes generales.' },
                { id: 'ta04', cat: 'Sistema de Alarma', label: 'Posicionamiento de botones de alarma', weight: 6, desc: 'Ubicación estratégica de botones de pánico fijos y portátiles para el personal de seguridad y empleados clave.' },
                { id: 'ta05', cat: 'Sistema de Alarma', label: 'Conexión con central de monitoreo', weight: 8, desc: 'Verificación de que el sistema reporta en tiempo real a una central de monitoreo (interna o externa) con tiempos de respuesta definidos.' },
                { id: 'ta06', cat: 'Sistema de Alarma', label: 'Sistema de redundancia', weight: 5, desc: 'Existencia de canales alternativos de comunicación (GPRS, Radio, Satelital) en caso de fallo de la red principal.' },
                { id: 'ta07', cat: 'Sistema CCTV', label: 'Cobertura CCTV perimetral', weight: 8, desc: 'Visualización completa de la línea perimetral sin puntos ciegos significativos.' },
                { id: 'ta08', cat: 'Sistema CCTV', label: 'CCTV en áreas sensibles', weight: 7, desc: 'Cámaras dedicadas con alta resolución en puntos de alto valor o riesgo.' },
                { id: 'ta09', cat: 'Sistema CCTV', label: 'Tiempo de retención de grabaciones', weight: 6, desc: 'Cumplimiento con la política de retención (ej. 30 días) para investigaciones forenses.' },
                { id: 'ta10', cat: 'Sistema CCTV', label: 'Monitoreo remoto', weight: 5, desc: 'Capacidad de visualizar cámaras desde fuera del sitio o en centros de control regionales.' },
                { id: 'ta11', cat: 'Sistema CCTV', label: 'Calidad de imagen', weight: 6, desc: 'Nitidez, visión nocturna y capacidad de identificación/reconocimiento de rostros y placas.' },
                { id: 'ta12', cat: 'Control de Acceso', label: 'Entradas controladas', weight: 8, desc: 'Uso de torniquetes, lectoras o barreras automáticas para restringir el paso de personas.' },
                { id: 'ta13', cat: 'Control de Acceso', label: 'Sistema de gafetes/credenciales', weight: 7, desc: 'Uso obligatorio y control de identidad mediante tarjetas inteligentes o biometría.' },
                { id: 'ta14', cat: 'Control de Acceso', label: 'Gestión de visitantes', weight: 6, desc: 'Proceso de registro, emisión de pases temporales y escolta según nivel de riesgo.' },
                { id: 'ta15', cat: 'Control de Acceso', label: 'Almacenamiento de registros de acceso', weight: 5, desc: 'Log digital de quién, por dónde y cuándo ingresó o salió de la instalación.' },
            ]
        },
        physical: {
            label: 'Activos Físicos',
            weight: 25,
            items: [
                // Perimeter
                { id: 'pa01', cat: 'Protección Perimetral', label: 'Altura y resistencia de cerca/muro', weight: 9, desc: 'Integridad estructural del cerramiento físico principal.' },
                { id: 'pa02', cat: 'Protección Perimetral', label: 'Alambre de púas / concertina', weight: 6, desc: 'Elementos de disuasión y retraso en la parte superior del cierre perimetral.' },
                { id: 'pa03', cat: 'Protección Perimetral', label: 'Sistemas de retardo exterior', weight: 5, desc: 'Presencia de zanjas, bermas o barreras físicas adicionales.' },
                { id: 'pa04', cat: 'Protección Perimetral', label: 'Zona despejada antes/después de cerca', weight: 7, desc: 'Mantenimiento de áreas libres de vegetación o materiales que ayuden a la intrusión o reduzcan visibilidad.' },
                { id: 'pa05', cat: 'Protección Perimetral', label: 'Iluminación perimetral', weight: 8, desc: 'Nivel lumínico suficiente para disuasión y captura de imágenes CCTV.' },
                { id: 'pa06', cat: 'Protección de Edificios', label: 'Puertas reforzadas', weight: 8, desc: 'Puertas de seguridad en accesos principales y zonas restringidas.' },
                { id: 'pa07', cat: 'Protección de Edificios', label: 'Calidad de cerraduras', weight: 7, desc: 'Uso de cerraduras de alta seguridad, cilindros anti-ganzúa y placas de protección.' },
                { id: 'pa08', cat: 'Protección de Edificios', label: 'Protección de ventanas', weight: 6, desc: 'Presencia de láminas de seguridad, rejas o vidrios reforzados.' },
                { id: 'pa09', cat: 'Protección de Edificios', label: 'Refuerzo de salas sensibles', weight: 7, desc: 'Protección especial para el site de IT, archivo confidencial o planta eléctrica.' },
                { id: 'pa10', cat: 'Control Vehicular', label: 'Visibilidad del puesto de guardia', weight: 6, desc: 'Capacidad de los oficiales para observar el tráfico entrante y saliente sin obstrucciones.' },
                { id: 'pa11', cat: 'Control Vehicular', label: 'Sistema de barreras/topes', weight: 8, desc: 'Mecanismos físicos para detener o demorar vehículos.' },
                { id: 'pa12', cat: 'Control Vehicular', label: 'Área de inspección de camiones', weight: 7, desc: 'Espacio dedicado y seguro para la revisión de carga y documentos.' },
            ]
        },
        procedures: {
            label: 'Procedimientos',
            weight: 20,
            items: [
                // Documentation
                { id: 'pr01', cat: 'Documentación de Seguridad', label: 'Plan de situación', weight: 6, desc: 'Mapa detallado de activos, amenazas y recursos de seguridad.' },
                { id: 'pr02', cat: 'Documentación de Seguridad', label: 'Plan de terreno', weight: 5, desc: 'Distribución física y zonificación de seguridad del sitio.' },
                { id: 'pr03', cat: 'Documentación de Seguridad', label: 'Plan de control de acceso', weight: 7, desc: 'Políticas escritas sobre quién puede entrar y en bajo qué condiciones.' },
                { id: 'pr04', cat: 'Documentación de Seguridad', label: 'Plan de detección de intrusión', weight: 6, desc: 'Estrategia de despliegue y respuesta ante intentos de intrusión.' },
                { id: 'pr05', cat: 'Documentación de Seguridad', label: 'Plan de CCTV', weight: 5, desc: 'Estándares de visualización, almacenamiento y auditoría de video.' },
                { id: 'pr06', cat: 'Documentación de Seguridad', label: 'Plan de evacuación', weight: 8, desc: 'Protocolos de salida segura ante emergencias patrimoniales o naturales.' },
                { id: 'pr07', cat: 'Procedimientos Operativos', label: 'Procedimiento de reporte de incidentes', weight: 8, desc: 'Formularios y canales para informar eventos de seguridad.' },
                { id: 'pr08', cat: 'Procedimientos Operativos', label: 'Protocolo de respuesta a emergencias', weight: 9, desc: 'Acciones inmediatas ante robos, asaltos o intrusiones confirmadas.' },
                { id: 'pr09', cat: 'Procedimientos Operativos', label: 'Procedimiento de visitantes', weight: 6, desc: 'Instrucciones para el control de externos.' },
                { id: 'pr10', cat: 'Procedimientos Operativos', label: 'Procedimiento de acceso de contratistas', weight: 7, desc: 'Controles específicos para personal de empresas externas.' },
                { id: 'pr11', cat: 'Procedimientos Operativos', label: 'Procedimiento de gestión de llaves', weight: 6, desc: 'Control de inventario, préstamo y custodia de llaves físicas.' },
            ]
        },
        hr: {
            label: 'Recursos Humanos',
            weight: 15,
            items: [
                { id: 'hr01', cat: 'Guardas de Seguridad', label: 'Calidad en reclutamiento', weight: 8, desc: 'Procesos de selección y validación de antecedentes.' },
                { id: 'hr02', cat: 'Guardas de Seguridad', label: 'Certificación oficial', weight: 9, desc: 'Cumplimiento con carnets de seguridad privada vigentes.' },
                { id: 'hr03', cat: 'Guardas de Seguridad', label: 'Experiencia', weight: 7, desc: 'Tiempo de servicio y conocimientos previos relevantes.' },
                { id: 'hr04', cat: 'Guardas de Seguridad', label: 'Capacitación básica en seguridad', weight: 8, desc: 'Formación general en vigilancia y leyes locales.' },
                { id: 'hr05', cat: 'Guardas de Seguridad', label: 'Capacitación específica del sitio', weight: 7, desc: 'Conocimiento de consignas particulares de la planta.' },
                { id: 'hr06', cat: 'Guardas de Seguridad', label: 'Nivel de idioma', weight: 4, desc: 'Capacidad de comunicación básica (según necesidad del sitio).' },
                { id: 'hr07', cat: 'Guardas de Seguridad', label: 'Calidad de supervisión', weight: 8, desc: 'Control efectivo sobre el desempeño de los guardas en campo.' },
                { id: 'hr08', cat: 'Guardas de Seguridad', label: 'Adecuación de cobertura de turnos', weight: 9, desc: 'Personal suficiente para todas las posiciones críticas las 24h.' },
            ]
        },
        environment: {
            label: 'Entorno',
            weight: 10,
            items: [
                { id: 'en01', cat: 'Comunidad Circundante', label: 'Calidad de contacto con comunidad', weight: 8, desc: 'Relación con líderes locales y vecinos para inteligencia compartida.' },
                { id: 'en02', cat: 'Comunidad Circundante', label: 'Nivel de intercambio de información', weight: 6, desc: 'Fluidez de datos sobre riesgos externos con otras empresas cercanas.' },
                { id: 'en03', cat: 'Comunidad Circundante', label: 'Nivel de crimen local', weight: 9, desc: 'Incidencia delictiva en el cuadrante externo inmediato.' },
                { id: 'en04', cat: 'Comunidad Circundante', label: 'Proximidad policial', weight: 8, desc: 'Distancia a la delegación de Fuerza Pública u OIJ más cercana.' },
                { id: 'en05', cat: 'Comunidad Circundante', label: 'Tiempo de respuesta', weight: 7, desc: 'Estimación real de llegada de autoridades ante una alerta.' },
            ]
        }
    };

    const SCORE_MAP = {
        '1': 0,
        '2': 0.25,
        '3': 0.50,
        '4': 0.85,
        '5': 1.0
    };

    const SCENARIOS = [
        { id: 'sc01', label: 'Agresión desde el exterior (Gunning)' },
        { id: 'sc02', label: 'Intrusión' },
        { id: 'sc03', label: 'Robo desde el exterior' },
        { id: 'sc04', label: 'Robo desde el interior' },
        { id: 'sc05', label: 'Secuestro' },
        { id: 'sc06', label: 'Asesinato / Amenaza física' },
        { id: 'sc07', label: 'Sabotaje' },
        { id: 'sc08', label: 'Vandalismo' },
        { id: 'sc09', label: 'Disturbio civil / Protesta' },
        { id: 'sc10', label: 'Amenaza interna (Insider Threat)' }
    ];

    const MODULE_WEIGHTS = { technical: 25, physical: 25, procedures: 20, hr: 15, environment: 10, scenarios: 5 };

    // ─── STORAGE ─────────────────────────────────────────────────────────────────
    function getAuditKey() {
        return typeof window.getSiteKey === 'function' ? window.getSiteKey('holcim_security_audit') : 'holcim_security_audit';
    }

    function loadAudit() {
        try {
            return JSON.parse(localStorage.getItem(getAuditKey()) || '{}');
        } catch (e) { return {}; }
    }

    function saveAudit(data) {
        try {
            localStorage.setItem(getAuditKey(), JSON.stringify(data));
        } catch (e) { console.error('Audit save error', e); }
    }

    // ─── INITIALIZATION ──────────────────────────────────────────────────────────
    window.initSecurityAudit = function () {
        renderAuditSections();
        renderScenarioSection();

        const data = loadAudit();

        // Populate site data
        const siteFields = ['audit-site-name', 'audit-site-address', 'audit-site-country', 'audit-site-category',
            'audit-site-gps', 'audit-site-employees', 'audit-site-security-company', 'audit-date', 'audit-auditor'];
        siteFields.forEach(id => {
            const el = document.getElementById(id);
            if (el && data[id] !== undefined) el.value = data[id];
        });

        // Set default date
        const dateEl = document.getElementById('audit-date');
        if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];

        // Populate items
        Object.keys(AUDIT_MODULES).forEach(modKey => {
            AUDIT_MODULES[modKey].items.forEach(item => {
                const appEl = document.getElementById(`app-${item.id}`);
                if (appEl && data[`app-${item.id}`] !== undefined) {
                    appEl.checked = data[`app-${item.id}`];
                    toggleItemRow(item.id, appEl.checked);
                }
                const savedScore = data[`score-${item.id}`];
                if (savedScore) {
                    const btn = document.querySelector(`.score-level-btn[data-item="${item.id}"][data-score="${savedScore}"]`);
                    if (btn) btn.classList.add('active');
                }
            });
        });

        // Populate scenarios
        SCENARIOS.forEach(sc => {
            ['lh1', 'lh2', 'lh3', 'im1', 'im2', 'im3', 'im4', 'im5'].forEach(f => {
                const el = document.getElementById(`${f}-${sc.id}`);
                if (el && data[`${f}-${sc.id}`] !== undefined) el.value = data[`${f}-${sc.id}`];
            });
        });

        bindAuditEvents();
        window.recalcAll();
        // Don't switch tab here if we are already in one, but usually it's the first load
        // window.switchAuditTab('audit-intro');
    };

    function renderAuditSections() {
        Object.keys(AUDIT_MODULES).forEach(modKey => {
            const tbody = document.getElementById(`audit-items-${modKey}`);
            if (!tbody) return;

            const items = AUDIT_MODULES[modKey].items;
            tbody.innerHTML = items.map(item => `
                <tr id="row-${item.id}">
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="font-weight:700; color:var(--navy-black);">${item.cat}</div>
                            <i class="fas fa-info-circle" 
                               style="color: var(--primary-teal); cursor: pointer; font-size: 0.8rem;" 
                               onclick="window.showAuditItemInfo('${modKey}', '${item.id}')"
                               title="Click para ver explicación"></i>
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${item.label}</div>
                    </td>
                    <td style="text-align:center; font-weight:700; color:var(--primary-teal);">${item.weight}</td>
                    <td style="text-align:center;">
                        <input type="checkbox" id="app-${item.id}" class="applicable-toggle" checked 
                               onchange="toggleItemRow('${item.id}', this.checked); window.recalcAll();">
                    </td>
                    <td>
                        <div class="assessment-selector">
                            <button class="score-level-btn" data-item="${item.id}" data-score="1" onclick="setScore('${item.id}', '1')" title="Muy Pobre / Inexistente">1</button>
                            <button class="score-level-btn" data-item="${item.id}" data-score="2" onclick="setScore('${item.id}', '2')" title="Pobre">2</button>
                            <button class="score-level-btn" data-item="${item.id}" data-score="3" onclick="setScore('${item.id}', '3')" title="Aceptable">3</button>
                            <button class="score-level-btn" data-item="${item.id}" data-score="4" onclick="setScore('${item.id}', '4')" title="Adecuado">4</button>
                            <button class="score-level-btn" data-item="${item.id}" data-score="5" onclick="setScore('${item.id}', '5')" title="Excepcional / Clase Mundial">5</button>
                        </div>
                    </td>
                    <td id="calc-score-${item.id}" style="text-align:center; font-weight:800; color:var(--navy-black);">0.0</td>
                </tr>
            `).join('');
        });
    }

    function renderScenarioSection() {
        const tbody = document.getElementById('audit-items-scenarios');
        if (!tbody) return;

        tbody.innerHTML = SCENARIOS.map(sc => `
            <tr>
                <td style="font-weight:700; font-size:0.75rem;">${sc.label}</td>
                <td><input type="number" id="lh1-${sc.id}" class="scenario-input" min="0" max="5" value="0" onchange="window.recalcAll()"></td>
                <td><input type="number" id="lh2-${sc.id}" class="scenario-input" min="0" max="5" value="0" onchange="window.recalcAll()"></td>
                <td><input type="number" id="lh3-${sc.id}" class="scenario-input" min="0" max="5" value="0" onchange="window.recalcAll()"></td>
                <td><input type="number" id="im1-${sc.id}" class="scenario-input" min="0" max="5" value="0" onchange="window.recalcAll()"></td>
                <td><input type="number" id="im2-${sc.id}" class="scenario-input" min="0" max="5" value="0" onchange="window.recalcAll()"></td>
                <td><input type="number" id="im3-${sc.id}" class="scenario-input" min="0" max="5" value="0" onchange="window.recalcAll()"></td>
                <td><input type="number" id="im4-${sc.id}" class="scenario-input" min="0" max="5" value="0" onchange="window.recalcAll()"></td>
                <td><input type="number" id="im5-${sc.id}" class="scenario-input" min="0" max="5" value="0" onchange="window.recalcAll()"></td>
                <td id="risk-score-display-${sc.id}" style="text-align:center; font-weight:900;">0.0</td>
            </tr>
        `).join('');
    }

    window.setScore = function (itemId, score) {
        const btns = document.querySelectorAll(`.score-level-btn[data-item="${itemId}"]`);
        btns.forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`.score-level-btn[data-item="${itemId}"][data-score="${score}"]`);
        if (btn) btn.classList.add('active');
        autosaveAudit();
        window.recalcAll();
    };
    window.toggleItemRow = function (itemId, isApplicable) {
        const row = document.getElementById(`row-${itemId}`);
        if (!row) return;
        if (isApplicable) {
            row.style.opacity = '1';
            row.style.background = 'transparent';
        } else {
            row.style.opacity = '0.4';
            row.style.background = '#f1f5f9';
        }
    };

    window.showAuditItemInfo = function (moduleKey, itemId) {
        const item = AUDIT_MODULES[moduleKey].items.find(i => i.id === itemId);
        if (!item) return;

        const modal = document.getElementById('modal-audit-info');
        const title = document.getElementById('audit-info-title');
        const desc = document.getElementById('audit-info-desc');

        if (modal && title && desc) {
            title.textContent = item.label;
            desc.textContent = item.desc || "No hay descripción disponible para este ítem.";
            modal.style.display = 'flex';
        }
    };

    window.closeAuditInfoModal = function () {
        const modal = document.getElementById('modal-audit-info');
        if (modal) modal.style.display = 'none';
    };

    function bindAuditEvents() {
        const inputs = document.querySelectorAll('#security-audit-view input, #security-audit-view select');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                autosaveAudit();
                window.recalcAll();
            });
        });
    }

    function autosaveAudit() {
        const data = {};
        // Site data
        const siteFields = ['audit-site-name', 'audit-site-address', 'audit-site-country', 'audit-site-category',
            'audit-site-gps', 'audit-site-employees', 'audit-site-security-company', 'audit-date', 'audit-auditor'];
        siteFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) data[id] = el.value;
        });

        // Module items
        Object.keys(AUDIT_MODULES).forEach(modKey => {
            AUDIT_MODULES[modKey].items.forEach(item => {
                const appEl = document.getElementById(`app-${item.id}`);
                const scoreBtn = document.querySelector(`.score-level-btn[data-item="${item.id}"].active`);
                if (appEl) data[`app-${item.id}`] = appEl.checked;
                if (scoreBtn) data[`score-${item.id}`] = scoreBtn.getAttribute('data-score');
            });
        });

        // Scenarios
        SCENARIOS.forEach(sc => {
            ['lh1', 'lh2', 'lh3', 'im1', 'im2', 'im3', 'im4', 'im5'].forEach(f => {
                const el = document.getElementById(`${f}-${sc.id}`);
                if (el) data[`${f}-${sc.id}`] = el.value;
            });
        });

        saveAudit(data);
    }

    // ─── TAB NAVIGATION ──────────────────────────────────────────────────────────
    window.switchAuditTab = function (tabId) {
        document.querySelectorAll('.audit-section-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.audit-tab-btn').forEach(el => el.classList.remove('active'));

        const content = document.getElementById(tabId);
        if (content) content.style.display = 'block';

        const btn = document.querySelector(`.audit-tab-btn[onclick*="${tabId}"]`);
        if (btn) btn.classList.add('active');

        if (tabId === 'audit-results') {
            window.renderAuditResults();
        }
    };

    // ─── SCORING ENGINE ──────────────────────────────────────────────────────────
    function calcModuleScore(moduleKey) {
        const mod = AUDIT_MODULES[moduleKey];
        if (!mod) return 0;
        let totalWeight = 0;
        let totalScore = 0;
        mod.items.forEach(item => {
            const appEl = document.getElementById(`app-${item.id}`);
            if (appEl && !appEl.checked) return; // skip non-applicable
            const scoreBtn = document.querySelector(`.score-level-btn[data-item="${item.id}"].active`);
            const scoreVal = scoreBtn ? (SCORE_MAP[scoreBtn.getAttribute('data-score')] || 0) : 0;

            // Update item row score display
            const itemScoreEl = document.getElementById(`calc-score-${item.id}`);
            if (itemScoreEl) itemScoreEl.textContent = (scoreVal * item.weight).toFixed(1);

            totalWeight += item.weight;
            totalScore += item.weight * scoreVal;
        });
        if (totalWeight === 0) return 0;
        return Math.round((totalScore / totalWeight) * 100);
    }

    function calcScenarioRisk(scId) {
        const lhFields = ['lh1', 'lh2', 'lh3'];
        const imFields = ['im1', 'im2', 'im3', 'im4', 'im5'];
        let lhSum = 0, lhCount = 0, maxImpact = 0;
        lhFields.forEach(f => {
            const el = document.getElementById(`${f}-${scId}`);
            const v = el ? parseFloat(el.value) : 0;
            if (v > 0) { lhSum += v; lhCount++; }
        });
        imFields.forEach(f => {
            const el = document.getElementById(`${f}-${scId}`);
            const v = el ? parseFloat(el.value) : 0;
            if (v > maxImpact) maxImpact = v;
        });
        const likelihood = lhCount > 0 ? lhSum / lhCount : 0;
        const riskScore = likelihood * maxImpact;
        const equalised = Math.round((riskScore / 25) * 100);
        return { likelihood: Math.round(likelihood * 10) / 10, maxImpact, riskScore: Math.round(riskScore * 10) / 10, equalised };
    }

    function calcScenarioModuleScore() {
        let total = 0;
        let count = 0;
        SCENARIOS.forEach(sc => {
            const risk = calcScenarioRisk(sc.id);
            if (risk.equalised > 0) { total += risk.equalised; count++; }
        });
        if (count === 0) return 0;
        // Invert: lower risk = higher security score
        const avgRisk = total / count;
        return Math.max(0, Math.round(100 - avgRisk));
    }

    function calcGlobalSMI() {
        const scores = {
            technical: calcModuleScore('technical'),
            physical: calcModuleScore('physical'),
            procedures: calcModuleScore('procedures'),
            hr: calcModuleScore('hr'),
            environment: calcModuleScore('environment'),
            scenarios: calcScenarioModuleScore()
        };
        let weightedSum = 0;
        let totalWeight = 0;
        Object.keys(MODULE_WEIGHTS).forEach(key => {
            weightedSum += scores[key] * MODULE_WEIGHTS[key];
            totalWeight += MODULE_WEIGHTS[key];
        });
        const smi = Math.round(weightedSum / totalWeight);
        return { scores, smi };
    }

    function getSMIClass(smi) {
        if (smi <= 40) return { label: 'CRÍTICO', cls: 'smi-critical' };
        if (smi <= 60) return { label: 'DÉBIL', cls: 'smi-weak' };
        if (smi <= 75) return { label: 'MODERADO', cls: 'smi-moderate' };
        if (smi <= 90) return { label: 'BUENO', cls: 'smi-good' };
        return { label: 'EXCELENTE', cls: 'smi-excellent' };
    }

    window.recalcAll = function () {
        // Update module score badges
        Object.keys(AUDIT_MODULES).forEach(key => {
            const score = calcModuleScore(key);
            const badge = document.getElementById(`score-${key}`); // Fixed ID
            if (badge) badge.textContent = `Puntos: ${(score / 10).toFixed(1)} / 10`;
        });

        // Update scenario risk displays
        SCENARIOS.forEach(sc => {
            const risk = calcScenarioRisk(sc.id);
            const el = document.getElementById(`risk-score-display-${sc.id}`); // Fixed ID
            if (el) {
                const color = risk.equalised >= 70 ? '#ef4444' : risk.equalised >= 40 ? '#f59e0b' : '#10b981';
                el.style.color = color;
                el.textContent = risk.equalised + '%';
            }
        });

        // Update completion progress
        updateCompletionProgress();
    };

    function updateCompletionProgress() {
        let completed = 0;
        let totalCount = 0;

        // Site data check
        const siteFields = ['audit-site-name', 'audit-date', 'audit-auditor', 'audit-site-category'];
        siteFields.forEach(id => {
            totalCount++;
            const el = document.getElementById(id);
            if (el && el.value.trim()) completed++;
        });

        // Module items check
        Object.keys(AUDIT_MODULES).forEach(mod => {
            AUDIT_MODULES[mod].items.forEach(item => {
                totalCount++;
                const scoreBtn = document.querySelector(`.score-level-btn[data-item="${item.id}"].active`);
                if (scoreBtn) completed++;
            });
        });

        const pct = Math.round((completed / totalCount) * 100);
        const bar = document.getElementById('audit-progress-bar');
        const text = document.getElementById('audit-progress-text');
        if (bar) bar.style.width = pct + '%';
        if (text) text.textContent = pct + '%';
    }

    // ─── RESULTS RENDERING ───────────────────────────────────────────────────────
    window.renderAuditResults = function () {
        const { scores, smi } = calcGlobalSMI();
        const smiInfo = getSMIClass(smi);

        // SMI Dashboard
        const smiValEl = document.getElementById('smi-value');
        const smiBadgeEl = document.getElementById('smi-class-badge');
        if (smiValEl) smiValEl.textContent = smi.toFixed(1);
        if (smiBadgeEl) {
            smiBadgeEl.textContent = smiInfo.label;
            smiBadgeEl.className = `smi-badge ${smiInfo.cls}`;
        }

        // Progress Bars in Sidebar
        const modules = ['tech', 'phys', 'proc', 'hr'];
        const scoreKeys = ['technical', 'physical', 'procedures', 'hr'];
        modules.forEach((m, i) => {
            const val = scores[scoreKeys[i]];
            const valEl = document.getElementById(`res-${m}-val`);
            const barEl = document.getElementById(`res-${m}-bar`);
            if (valEl) valEl.textContent = val + '%';
            if (barEl) barEl.style.width = val + '%';
        });

        // Radar Chart
        renderRadarChart(scores);
        // Bar Chart
        renderBarChart(scores);
        // Risk Ranking
        renderRiskRanking();
        // Heat map
        renderRiskHeatmap();
    };

    let radarChart = null;
    function renderRadarChart(scores) {
        const canvas = document.getElementById('audit-radar-chart');
        if (!canvas || typeof Chart === 'undefined') return;
        const modLabels = ['Técnico', 'Físico', 'Procedimientos', 'RRHH', 'Entorno', 'Escenarios'];
        const data = [scores.technical, scores.physical, scores.procedures, scores.hr, scores.environment, scores.scenarios];
        if (radarChart) radarChart.destroy();
        radarChart = new Chart(canvas, {
            type: 'radar',
            data: {
                labels: modLabels,
                datasets: [{
                    label: 'Puntuación de Seguridad',
                    data: data,
                    fill: true,
                    backgroundColor: 'rgba(237, 28, 36, 0.15)',
                    borderColor: '#ED1C24',
                    pointBackgroundColor: '#ED1C24',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#ED1C24',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        min: 0, max: 100,
                        ticks: { stepSize: 25, font: { size: 10 }, color: '#64748b' },
                        grid: { color: 'rgba(0,0,0,0.08)' },
                        pointLabels: { font: { size: 11, weight: '700' }, color: '#1e293b' }
                    }
                }
            }
        });
    }

    let barChart = null;
    function renderBarChart(scores) {
        const canvas = document.getElementById('audit-bar-chart');
        if (!canvas || typeof Chart === 'undefined') return;
        const modLabels = ['Técnico', 'Físico', 'Procedimientos', 'RRHH', 'Entorno', 'Escenarios'];
        const data = [scores.technical, scores.physical, scores.procedures, scores.hr, scores.environment, scores.scenarios];
        const colors = data.map(s => s <= 40 ? '#ef4444' : s <= 60 ? '#f97316' : s <= 75 ? '#eab308' : s <= 90 ? '#22c55e' : '#10b981');
        if (barChart) barChart.destroy();
        barChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: modLabels,
                datasets: [{
                    label: 'Puntuación (%)',
                    data: data,
                    backgroundColor: colors,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { min: 0, max: 100, ticks: { stepSize: 25 }, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function renderRiskRanking() {
        const body = document.getElementById('risk-ranking-body');
        if (!body) return;
        const risks = SCENARIOS.map(sc => ({ ...sc, ...calcScenarioRisk(sc.id) }))
            .sort((a, b) => b.equalised - a.equalised);
        body.innerHTML = risks.map((r, i) => {
            const color = r.equalised >= 70 ? '#ef4444' : r.equalised >= 40 ? '#f97316' : r.equalised >= 20 ? '#eab308' : '#22c55e';
            const level = r.equalised >= 70 ? 'CRÍTICO' : r.equalised >= 40 ? 'ALTO' : r.equalised >= 20 ? 'MEDIO' : 'BAJO';
            return `<div style="display:grid;grid-template-columns:24px 1fr 80px 80px 70px;gap:8px;align-items:center;padding:8px 4px;border-bottom:1px solid #f1f5f9;">
                <span style="font-weight:700;color:${color};font-size:0.85rem;">${i + 1}</span>
                <span style="font-size:0.82rem;font-weight:600;">${r.label}</span>
                <span style="text-align:center;font-size:0.8rem;">${r.likelihood || 0}</span>
                <span style="text-align:center;font-size:0.8rem;">${r.maxImpact || 0}</span>
                <span style="text-align:center;"><span class="smi-badge" style="background:${color}20;color:${color};border:1px solid ${color}40;font-size:0.7rem;padding:2px 8px;border-radius:12px;">${level}</span></span>
            </div>`;
        }).join('');
    }

    function renderRiskHeatmap() {
        const grid = document.getElementById('risk-heatmap-container');
        if (!grid) return;
        // 5×5 heat map cells
        const cells = [];
        for (let impact = 5; impact >= 1; impact--) {
            for (let likelihood = 1; likelihood <= 5; likelihood++) {
                const risk = likelihood * impact;
                let color, label;
                if (risk >= 16) { color = '#ef444420'; border: '#ef4444'; label = 'C'; }
                else if (risk >= 10) { color = '#f9731620'; label = 'A'; }
                else if (risk >= 5) { color = '#eab30820'; label = 'M'; }
                else { color = '#22c55e20'; label = 'B'; }
                cells.push({ likelihood, impact, risk, color, label });
            }
        }
        // Plot actual scenarios
        const scenarioPositions = SCENARIOS.map(sc => {
            const r = calcScenarioRisk(sc.id);
            return { id: sc.id, lh: Math.min(5, Math.max(1, Math.round(r.likelihood))), im: Math.min(5, Math.max(1, Math.round(r.maxImpact))), label: sc.label };
        }).filter(s => s.lh > 0 && s.im > 0);

        grid.innerHTML = cells.map(cell => {
            const matches = scenarioPositions.filter(sp => sp.lh === cell.likelihood && sp.im === cell.impact);
            const riskLevel = cell.risk >= 16 ? '#ef4444' : cell.risk >= 10 ? '#f97316' : cell.risk >= 5 ? '#eab308' : '#22c55e';
            const dots = matches.map(m => `<div title="${m.label}" style="width:8px;height:8px;border-radius:50%;background:#ED1C24;display:inline-block;margin:1px;"></div>`).join('');
            return `<div class="risk-heatmap-cell" style="background:${riskLevel}15;border-color:${riskLevel}40;" title="Probabilidad:${cell.likelihood} | Impacto:${cell.impact} | Riesgo:${cell.risk}">
                <span style="font-size:0.6rem;color:${riskLevel};font-weight:700;">${cell.risk}</span>
                <div>${dots}</div>
            </div>`;
        }).join('');
    }

    // ─── EXPORT FUNCTIONS ────────────────────────────────────────────────────────
    window.exportAuditPDF = function () {
        if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
            alert('La librería jsPDF no está cargada. Verifique la conexión a internet.');
            return;
        }
        const { jsPDF } = window.jspdf || window;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const { scores, smi } = calcGlobalSMI();
        const smiInfo = getSMIClass(smi);
        const siteName = document.getElementById('audit-site-name')?.value || 'Sin nombre';
        const auditor = document.getElementById('audit-auditor')?.value || 'Sin asignar';
        const auditDate = document.getElementById('audit-date')?.value || new Date().toISOString().split('T')[0];

        // Collect comments
        const comments = {
            technical: document.getElementById('audit-comments-technical')?.value || '',
            physical: document.getElementById('audit-comments-physical')?.value || '',
            procedures: document.getElementById('audit-comments-procedures')?.value || '',
            hr: document.getElementById('audit-comments-hr')?.value || '',
            environment: document.getElementById('audit-comments-env')?.value || '',
            scenarios: document.getElementById('audit-comments-scenarios')?.value || ''
        };
        const generalRecs = document.getElementById('audit-general-recommendations')?.value || '';

        function drawGradientHeader(pdf, yPos, title) {
            // Corporate Blue Gradient: Azure -> Blue -> Navy
            const colors = [
                [0, 156, 189],   // Holcim Azure
                [37, 99, 235],   // Blue
                [30, 41, 59]     // Navy Black
            ];

            // Refined drawing: use larger segments with overlap to prevent gaps
            const totalWidth = 210;
            const segments = totalWidth * 2; // 0.5mm precision
            const stepWidth = totalWidth / segments;
            const colorSteps = colors.length - 1;
            const segmentSize = segments / colorSteps;

            for (let i = 0; i < segments; i++) {
                const colorIdx = Math.floor(i / segmentSize);
                const t = (i % segmentSize) / segmentSize;

                const c1 = colors[colorIdx];
                const c2 = colors[colorIdx + 1] || colors[colorIdx];

                const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
                const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
                const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);

                pdf.setFillColor(r, g, b);
                // Use slightly overlapping rectangles for smooth rendering
                pdf.rect(i * stepWidth, yPos, stepWidth + 0.1, 22, 'F');
            }

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text(title, 14, yPos + 10);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Version 1.0 – Corporate Security', 14, yPos + 17);
            if (yPos === 0) pdf.text(`Fecha: ${auditDate}`, 160, 10, { align: 'right' });
        }

        // Header strip
        drawGradientHeader(doc, 0, 'SECURITY AUDIT TOOL – HOLCIM CR');

        // Title block
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE AUDITORÍA DE SEGURIDAD FÍSICA', 14, 32);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Sitio: ${siteName}`, 14, 40);
        doc.text(`Auditor: ${auditor}`, 14, 46);
        doc.text(`Fecha de Auditoría: ${auditDate}`, 14, 52);

        // SMI Box
        const smiColors = { 'smi-critical': [239, 68, 68], 'smi-weak': [249, 115, 22], 'smi-moderate': [234, 179, 8], 'smi-good': [34, 197, 94], 'smi-excellent': [16, 185, 129] };
        const sc = smiColors[smiInfo.cls] || [100, 100, 100];
        doc.setFillColor(...sc);
        doc.roundedRect(14, 58, 60, 22, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(String(smi), 44, 68, { align: 'center' });
        doc.setFontSize(8);
        doc.text(`SMI – ${smiInfo.label}`, 44, 75, { align: 'center' });

        // Module scores table
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN DE PUNTUACIONES', 14, 90);
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(240, 240, 240);
        doc.rect(14, 93, 182, 7, 'F');
        doc.setFontSize(8);
        doc.text('Módulo', 16, 98);
        doc.text('Peso (%)', 100, 98);
        doc.text('Puntuación', 140, 98);
        doc.text('Clasificación', 165, 98);

        const modOrder = [
            ['technical', 'Activos Técnicos'],
            ['physical', 'Activos Físicos'],
            ['procedures', 'Procedimientos'],
            ['hr', 'Recursos Humanos'],
            ['environment', 'Entorno'],
            ['scenarios', 'Análisis de Escenarios']
        ];
        doc.setFont('helvetica', 'normal');
        let y = 105;
        modOrder.forEach(([key, label], i) => {
            if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(14, y - 4, 182, 7, 'F'); }
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(8);
            doc.text(label, 16, y);
            doc.text(String(MODULE_WEIGHTS[key] || 0), 105, y);
            doc.text(`${scores[key]}%`, 145, y);
            doc.text(getSMIClass(scores[key]).label, 167, y);
            y += 7;
        });

        // Scenario Analysis
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('ANÁLISIS DE ESCENARIOS DE RIESGO', 14, y);
        y += 5;
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y, 182, 7, 'F');
        doc.setFontSize(8);
        doc.text('Escenario', 16, y + 5);
        doc.text('Probabilidad', 100, y + 5);
        doc.text('Impacto Máx.', 130, y + 5);
        doc.text('Riesgo Igualado', 160, y + 5);
        y += 10;
        doc.setFont('helvetica', 'normal');
        const sortedRisks = SCENARIOS.map(sc => ({ ...sc, ...calcScenarioRisk(sc.id) })).sort((a, b) => b.equalised - a.equalised);
        sortedRisks.slice(0, 8).forEach((r, i) => {
            if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(14, y - 4, 182, 7, 'F'); }
            doc.text(r.label.substring(0, 40), 16, y);
            doc.text(String(r.likelihood || 0), 108, y);
            doc.text(String(r.maxImpact || 0), 138, y);
            doc.text(`${r.equalised}%`, 170, y);
            y += 7;
        });

        // Detailed Comments Section
        doc.addPage();
        drawGradientHeader(doc, 0, 'OBSERVACIONES DETALLADAS');
        y = 35;
        modOrder.forEach(([key, label]) => {
            if (comments[key]) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(30, 41, 59);
                doc.text(label.toUpperCase(), 14, y);
                y += 5;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                const lines = doc.splitTextToSize(comments[key], 180);
                doc.text(lines, 14, y);
                y += (lines.length * 4) + 8;
                if (y > 270) { doc.addPage(); drawGradientHeader(doc, 0, 'OBSERVACIONES DETALLADAS (CONT.)'); y = 35; }
            }
        });

        // Final Recommendations
        if (y > 240) { doc.addPage(); drawGradientHeader(doc, 0, 'CONCLUSIONES FINALES'); y = 35; } else { y += 10; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('RECOMENDACIONES GENERALES', 14, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        let finalRecsContent = generalRecs;
        if (!finalRecsContent) {
            finalRecsContent = [
                smi < 60 ? '• Implementar plan de mejora urgente en módulos con puntuación crítica.' : '• Mantener el nivel de madurez actual con revisiones periódicas.',
                scores.technical < 70 ? '• Reforzar los sistemas técnicos de seguridad (CCTV, acceso, detección).' : '',
                scores.physical < 70 ? '• Mejorar las barreras físicas y protección perimetral.' : '',
                scores.procedures < 70 ? '• Documentar y actualizar todos los procedimientos operativos.' : '',
                scores.hr < 70 ? '• Invertir en capacitación y certificación del personal de seguridad.' : ''
            ].filter(r => r).join('\n');
        }
        const recLines = doc.splitTextToSize(finalRecsContent, 180);
        doc.text(recLines, 14, y);

        // Footer
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 285, 210, 12, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7);
            doc.text(`HOLCIM CR – SECURITY AUDIT TOOL V1.0 – PÁGINA ${i} DE ${totalPages}`, 105, 292, { align: 'center' });
        }

        // Add visual charts on a new page
        doc.addPage();
        drawGradientHeader(doc, 0, 'ANÁLISIS VISUAL DE SEGURIDAD');

        let chartY = 40;
        // Radar Chart
        const radarCanvas = document.getElementById('audit-radar-chart');
        if (radarCanvas) {
            const radarImg = radarCanvas.toDataURL('image/png');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.text('PERFIL DE MADUREZ PATRIMONIAL', 14, chartY);
            doc.addImage(radarImg, 'PNG', 30, chartY + 5, 150, 100);
            chartY += 120;
        }

        // Bar Chart
        const barCanvas = document.getElementById('audit-bar-chart');
        if (barCanvas) {
            if (chartY > 200) { doc.addPage(); drawGradientHeader(doc, 0, 'ANÁLISIS VISUAL (CONT.)'); chartY = 40; }
            const barImg = barCanvas.toDataURL('image/png');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.text('COMPARATIVA POR MÓDULOS', 14, chartY);
            doc.addImage(barImg, 'PNG', 15, chartY + 5, 180, 100);
        }

        doc.save(`Security_Audit_Report_${siteName}_${auditDate}.pdf`);
        if (typeof window.showNotification === 'function') window.showNotification('REPORTE PDF EXPORTADO', 'success');
    };

    window.exportAuditExcel = function () {
        const { scores, smi } = calcGlobalSMI();
        const smiInfo = getSMIClass(smi);
        const siteName = document.getElementById('audit-site-name')?.value || '';
        const auditor = document.getElementById('audit-auditor')?.value || '';
        const auditDate = document.getElementById('audit-date')?.value || '';

        let csv = 'SECURITY AUDIT TOOL – HOLCIM CR\r\n';
        csv += `Sitio:,${siteName}\r\n`;
        csv += `Auditor:,${auditor}\r\n`;
        csv += `Fecha:,${auditDate}\r\n`;
        csv += `SMI Global:,${smi},${smiInfo.label}\r\n\r\n`;

        csv += 'PUNTUACIONES POR MÓDULO\r\n';
        csv += 'Módulo,Peso (%),Puntuación (%),Clasificación\r\n';
        const modOrder = [
            ['technical', 'Activos Técnicos'],
            ['physical', 'Activos Físicos'],
            ['procedures', 'Procedimientos'],
            ['hr', 'Recursos Humanos'],
            ['environment', 'Entorno'],
            ['scenarios', 'Análisis de Escenarios']
        ];
        modOrder.forEach(([key, label]) => {
            csv += `${label},${MODULE_WEIGHTS[key]},${scores[key]},${getSMIClass(scores[key]).label}\r\n`;
        });

        csv += '\r\nDETALLE POR ÍTEM\r\n';
        csv += 'Módulo,Subcategoría,Ítem,Peso Referencial,Aplicable,Nivel de Puntuación,Peso Final,Score\r\n';
        Object.keys(AUDIT_MODULES).forEach(modKey => {
            const mod = AUDIT_MODULES[modKey];
            mod.items.forEach(item => {
                const appEl = document.getElementById(`app-${item.id}`);
                const scoreEl = document.getElementById(`score-${item.id}`);
                const applicable = appEl ? (appEl.checked ? 'Sí' : 'No') : 'N/A';
                const scoreLevel = scoreEl ? scoreEl.value : '';
                const scorePct = SCORE_MAP[scoreLevel] || 0;
                const finalWeight = item.weight * scorePct;
                csv += `${mod.label},"${item.cat}","${item.label}",${item.weight},${applicable},${scoreLevel},${finalWeight.toFixed(2)},${(scorePct * 100).toFixed(0)}%\r\n`;
            });
        });

        csv += '\r\nANÁLISIS DE ESCENARIOS\r\n';
        csv += 'Escenario,Probabilidad,Impacto Máximo,Risk Score,Riesgo Igualado\r\n';
        SCENARIOS.forEach(sc => {
            const r = calcScenarioRisk(sc.id);
            csv += `"${sc.label}",${r.likelihood},${r.maxImpact},${r.riskScore},${r.equalised}%\r\n`;
        });

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Audit_Data_${siteName.replace(/\s/g, '_') || 'HOLCIM'}_${auditDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        if (typeof window.showNotification === 'function') window.showNotification('DATOS EXPORTADOS A EXCEL/CSV', 'success');
    };

    window.resetAuditForm = function () {
        if (confirm('¿Está seguro de que desea reiniciar la auditoría? Se perderán todos los datos no exportados.')) {
            // Clear main inputs
            document.getElementById('audit-site-name').value = '';
            document.getElementById('audit-auditor').value = '';

            // Clear all module items
            const moduleKeys = ['technical', 'physical', 'procedures', 'hr', 'environment'];
            moduleKeys.forEach(key => {
                const data = localStorage.getItem(`audit_data_${key}`);
                if (data) {
                    const items = JSON.parse(data);
                    items.forEach(item => { item.score = 0; item.applies = true; });
                    localStorage.setItem(`audit_data_${key}`, JSON.stringify(items));
                }
            });

            // Clear scenarios
            SCENARIOS.forEach(sc => {
                localStorage.setItem(`scenario_risk_${sc.id}`, JSON.stringify({ likelihood: 1, impact: {} }));
            });

            // Clear comment fields
            document.querySelectorAll('.audit-textarea').forEach(tx => tx.value = '');

            // Refresh views
            const currentView = document.querySelector('.audit-section-content.active')?.id?.replace('audit-', '');
            if (currentView) {
                if (currentView === 'scenarios') renderScenarioMatrix();
                else if (currentView === 'results') renderAuditResults();
                else renderAuditItems(currentView);
            }

            alert('Auditoría reiniciada.');
        }
    };

})();
