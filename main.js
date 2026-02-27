// Main Logic Module - Holcim Portal de Seguridad
// Author: Holcim Security Team / Reconstructed by Antigravity
// Version: 3.1 - Database, Logout Fix & Auto-Permissions

document.addEventListener('DOMContentLoaded', function () {
    // --- INITIALIZATION ---
    const getSession = () => JSON.parse(localStorage.getItem('holcim_session'));
    const setSession = (data) => localStorage.setItem('holcim_session', JSON.stringify(data));

    // --- SITE SEGREGATION UTILITY ---
    window.getSiteKey = (key) => {
        try {
            if (key === 'holcim_users' || key === 'holcim_session') return key;
            const sessionStr = localStorage.getItem('holcim_session');
            if (sessionStr) {
                const user = JSON.parse(sessionStr);
                if (user && user.site) {
                    return `${key}_${user.site.trim().replace(/\s+/g, '_').toUpperCase()}`;
                }
            }
        } catch (e) { console.error("Error in getSiteKey", e); }
        return key;
    };

    const initializeData = (key, defaultVal) => {
        if (!localStorage.getItem(window.getSiteKey(key))) {
            localStorage.setItem(window.getSiteKey(key), JSON.stringify(defaultVal));
        }
    };

    const MASTER_ADMIN_EMAIL = 'admin@holcim.com';
    let users = [];
    try {
        const storedUsers = localStorage.getItem('holcim_users');
        users = JSON.parse(storedUsers || '[]');
        if (!Array.isArray(users)) users = [];
    } catch (e) { users = []; }

    if (!users.some(u => u.email === MASTER_ADMIN_EMAIL)) {
        users.push({
            email: MASTER_ADMIN_EMAIL,
            pass: 'admin123',
            site: 'PLANTA CENTRAL',
            permissions: ['dashboard', 'reports', 'inductions', 'extra-auth', 'keys', 'database', 'settings', 'calendar', 'security-systems', 'statistics']
        });
        localStorage.setItem('holcim_users', JSON.stringify(users));
    }

    // Auto-fix admin permissions for existing account
    const existingAdmin = users.find(u => u.email === MASTER_ADMIN_EMAIL);
    if (existingAdmin && (!existingAdmin.permissions.includes('calendar') || !existingAdmin.permissions.includes('security-systems') || !existingAdmin.permissions.includes('statistics'))) {
        existingAdmin.permissions = ['dashboard', 'reports', 'inductions', 'extra-auth', 'keys', 'database', 'settings', 'calendar', 'security-systems', 'statistics'];
        localStorage.setItem('holcim_users', JSON.stringify(users));
    }


    // --- MULTI-LANGUAGE (i18n) ---
    const TRANSLATIONS = {
        es: {
            login_title: "CENTRO DE TRABAJO SEGURIDAD PATRIMONIAL",
            login_subtitle: "Inicie sesión para continuar",
            login_btn: "ACCEDER",
            logout: "CERRAR SESIÓN",
            settings_nav_profile: "Mi Perfil",
            settings_nav_users: "Gestión de Usuarios",
            settings_nav_storage: "Almacenamiento",
            settings_nav_logs: "Bitácora en Vivo",
            settings_profile_title: "Configuración de Perfil",
            settings_profile_site: "Mi Perfil de Sitio",
            settings_profile_pass: "Nueva Contraseña",
            settings_profile_btn: "ACTUALIZAR DATOS",
            settings_users_title: "Gestión de Cuentas",
            settings_storage_title: "Almacenamiento Local (Backup)",
            settings_storage_subtitle: "Configure una carpeta local para guardar copias automáticas de sus registros en formato JSON.",
            settings_storage_select_btn: "SELECCIONAR CARPETA",
            settings_storage_backup_btn: "RESPALDAR TODO AHORA",
            settings_storage_test_btn: "PROBAR CONEXIÓN",
            settings_logs_title: "Bitácora de Actividad",
            notification_scanned: "CÓDIGO ESCANEADO",
            notification_welcome: "BIENVENIDO",
            notification_invalid: "CREDENCIALES INVÁLIDAS",
            nav_dashboard: "Control de Acceso",
            nav_inductions: "Inducciones",
            nav_extra_auth: "Autorizaciones Extraordinarias",
            nav_statistics: "ESTADÍSTICAS",
            nav_keys: "Control de Llaves",
            nav_packages: "Gestión de Paquetería",
            nav_forms: "Formularios de Reportes",
            nav_database: "Base de Datos",
            nav_security_systems: "Sistemas de Seguridad",
            nav_calendar: "Calendario",
            nav_security_audit: "Análisis de Seguridad del Sitio",
            nav_crime_stats: "Estadísticas Delincuenciales",
            nav_settings: "Configuración"
        },
        en: {
            login_title: "CENTRO DE TRABAJO SEGURIDAD PATRIMONIAL",
            login_subtitle: "Sign in to continue",
            login_btn: "SIGN IN",
            logout: "LOGOUT",
            settings_nav_profile: "My Profile",
            settings_nav_users: "User Management",
            settings_nav_storage: "Storage",
            settings_nav_logs: "Live Logs",
            settings_profile_title: "Profile Settings",
            settings_profile_site: "My Site Profile",
            settings_profile_pass: "New Password",
            settings_profile_btn: "UPDATE DATA",
            settings_users_title: "Account Management",
            settings_storage_title: "Local Storage (Backup)",
            settings_storage_subtitle: "Configure a local folder to automatically save JSON backups of all your records.",
            settings_storage_select_btn: "SELECT FOLDER",
            settings_storage_backup_btn: "BACKUP ALL NOW",
            settings_storage_test_btn: "TEST CONNECTION",
            settings_logs_title: "Activity Log",
            notification_scanned: "CODE SCANNED",
            notification_welcome: "WELCOME",
            notification_invalid: "INVALID CREDENTIALS",
            nav_dashboard: "Access Control",
            nav_inductions: "Inductions",
            nav_extra_auth: "Extraordinary Auth",
            nav_statistics: "STATISTICS",
            nav_keys: "Key Control",
            nav_packages: "Package Management",
            nav_forms: "Report Forms",
            nav_database: "Database",
            nav_security_systems: "Security Systems",
            nav_calendar: "Calendar",
            nav_security_audit: "Security Audit",
            nav_crime_stats: "Crime Statistics",
            nav_settings: "Settings"
        }
    };

    window.setLanguage = function (lang) {
        localStorage.setItem('holcim_lang', lang);
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });
        applyTranslations(lang);
    };

    function applyTranslations(lang) {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
                el.textContent = TRANSLATIONS[lang][key];
            }
        });
    }

    // Initialize Language
    const currentLang = localStorage.getItem('holcim_lang') || 'es';
    setLanguage(currentLang);

    // --- ADMIN CROSS-SITE AGGREGATION ---
    // For the master admin, merges data from ALL sites.
    // For regular users, only returns their site's data.
    window.getSiteData = (key) => {
        const user = JSON.parse(localStorage.getItem('holcim_session'));
        if (user && user.email === MASTER_ADMIN_EMAIL) {
            const prefix = key + '_';
            const result = [];
            for (let i = 0; i < localStorage.length; i++) {
                const lsKey = localStorage.key(i);
                if (lsKey === key || lsKey.startsWith(prefix)) {
                    try {
                        const data = JSON.parse(localStorage.getItem(lsKey) || '[]');
                        if (Array.isArray(data)) result.push(...data);
                    } catch (e) { }
                }
            }
            return result;
        }
        return JSON.parse(localStorage.getItem(window.getSiteKey(key)) || '[]');
    };

    // --- STORAGE MANAGER (Local Backups) ---
    const DB_NAME = 'HolcimStorageDB';
    const STORE_NAME = 'handles';

    window.StorageManager = {
        directoryHandle: null,

        async init() {
            try {
                this.directoryHandle = await this.getHandle();
                if (this.directoryHandle) {
                    const permission = await this.directoryHandle.queryPermission({ mode: 'readwrite' });
                    if (permission !== 'granted') this.directoryHandle = null;
                }
                updateStorageUI();
            } catch (e) { console.warn('Storage Init Fail:', e); }
        },

        async getHandle() {
            return new Promise((resolve) => {
                const request = indexedDB.open(DB_NAME, 1);
                request.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
                request.onsuccess = (e) => {
                    const db = e.target.result;
                    const tx = db.transaction(STORE_NAME, 'readonly');
                    const req = tx.objectStore(STORE_NAME).get('backup_dir');
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => resolve(null);
                };
            });
        },

        async saveHandle(handle) {
            const request = indexedDB.open(DB_NAME, 1);
            request.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put(handle, 'backup_dir');
            };
        },

        async selectFolder() {
            try {
                const handle = await window.showDirectoryPicker();
                this.directoryHandle = handle;
                await this.saveHandle(handle);
                updateStorageUI();
                showNotification('CARPETA SELECCIONADA', 'success');
            } catch (e) { console.error('Folder Selection Error:', e); }
        },

        async writeFile(filename, content) {
            if (!this.directoryHandle) return;
            try {
                const fileHandle = await this.directoryHandle.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
            } catch (e) { console.error(`Error writing ${filename}:`, e); }
        }
    };

    window.StorageManager.init();

    window.updateStorageUI = function () {
        const btn = document.getElementById('btn-select-folder');
        const pathDisplay = document.getElementById('selected-folder-path');
        const driveTip = document.getElementById('storage-drive-tip');

        if (window.StorageManager.directoryHandle) {
            if (btn) btn.classList.add('selected');
            if (pathDisplay) {
                pathDisplay.textContent = `Sincronizando con: ${window.StorageManager.directoryHandle.name}`;
                pathDisplay.style.display = 'block';
            }
            if (driveTip) driveTip.style.display = 'block';
        } else {
            if (btn) btn.classList.remove('selected');
            if (pathDisplay) pathDisplay.style.display = 'none';
            if (driveTip) driveTip.style.display = 'none';
        }
    };

    window.triggerManualBackup = async function () {
        if (!window.StorageManager.directoryHandle) {
            return showNotification('SELECCIONE UNA CARPETA PRIMERO', 'warning');
        }
        showNotification('INICIANDO RESPALDO...', 'info');
        await performBackup();
        showNotification('RESPALDO COMPLETADO', 'success');
    };

    window.triggerAutoBackup = function () {
        if (window.StorageManager.directoryHandle) {
            performBackup();
        }
    };

    async function performBackup() {
        const collections = [
            'holcim_access_logs', 'holcim_extra_auths', 'holcim_inductions',
            'holcim_inventory_keys', 'holcim_key_loans', 'holcim_event_log',
            'holcim_personnel_directory', 'holcim_security_officers',
            'holcim_badge_inventory', 'holcim_cctv_inventory',
            'holcim_cctv_reviews', 'holcim_virtual_rounds', 'holcim_contact_directory',
            'holcim_calendar_events', 'holcim_access_points'
        ];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const folderName = `backup_${timestamp}`;

        try {
            // Create a subfolder for this backup
            const subfolder = await window.StorageManager.directoryHandle.getDirectoryHandle(folderName, { create: true });
            for (const col of collections) {
                const data = localStorage.getItem(window.getSiteKey(col)) || '[]';
                const fileHandle = await subfolder.getFileHandle(`${col}.json`, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(data);
                await writable.close();
            }
        } catch (e) { console.error('Backup Process Error:', e); }
    }

    window.testFolderAccess = async function () {
        if (!window.StorageManager.directoryHandle) return showNotification('NO HAY CARPETA', 'danger');
        try {
            const permission = await window.StorageManager.directoryHandle.requestPermission({ mode: 'readwrite' });
            if (permission === 'granted') showNotification('CONEXIÓN EXITOSA', 'success');
            else showNotification('PERMISO DENEGADO', 'danger');
        } catch (e) { showNotification('FALTA INTERACCIÓN DE USUARIO', 'warning'); }
    };

    // Bind UI
    const btnSelectFolder = document.getElementById('btn-select-folder');
    if (btnSelectFolder) btnSelectFolder.addEventListener('click', () => window.StorageManager.selectFolder());


    // --- GLOBAL UTILITIES ---
    window.showNotification = function (message, type = 'info') {
        const banner = document.createElement('div');
        banner.className = `alert-banner alert-${type}`;
        banner.style.position = 'fixed'; banner.style.top = '20px'; banner.style.right = '20px'; banner.style.zIndex = '100002';
        banner.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i><span>${message}</span>`;
        document.body.appendChild(banner);
        setTimeout(() => { banner.style.opacity = '0'; banner.style.transform = 'translateY(-10px)'; banner.style.transition = 'all 0.3s ease'; setTimeout(() => banner.remove(), 300); }, 3000);
    };

    window.addLogEvent = function (module, description) {
        const log = JSON.parse(localStorage.getItem(getSiteKey('holcim_event_log')) || '[]');
        const user = getSession() || { email: 'SISTEMA@holcim.com' };
        log.unshift({ timestamp: new Date().toLocaleString(), user: user.email.split('@')[0], module: module, description: description });
        localStorage.setItem(getSiteKey('holcim_event_log'), JSON.stringify(log.slice(0, 50)));
        if (document.getElementById('live-event-log')) renderLiveLog();
        // Auto-backup on major events
        if (module !== 'SISTEMA') triggerAutoBackup();
    };

    window.addAuditLog = function (module, recordId, field, oldValue, newValue) {
        const log = JSON.parse(localStorage.getItem(getSiteKey('holcim_audit_log')) || '[]');
        const user = (typeof getSession === 'function' ? getSession() : null) || { email: 'SISTEMA@holcim.com' };
        log.unshift({ timestamp: new Date().toLocaleString(), user: user.email, module: module, recordId: recordId, field: field, oldValue: oldValue || '-', newValue: newValue || '-' });
        localStorage.setItem(getSiteKey('holcim_audit_log'), JSON.stringify(log));
    };

    // --- TSE INTEGRATION ---
    async function lookupTSE(id) {
        const cleanedId = id.replace(/-/g, '');
        if (cleanedId.length < 9) return;
        const indicator = document.getElementById('lookup-indicator');
        if (indicator) indicator.innerHTML = '<i class="fas fa-spinner fa-spin" style="color:var(--primary-teal)"></i>';
        try {
            const res = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cleanedId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.nombre) {
                    const nameInput = document.getElementById('fullName');
                    if (nameInput) { nameInput.value = data.nombre; showNotification('DATOS TSE SINCRONIZADOS', 'success'); }
                }
            }
        } catch (e) { console.error('TSE Lookup Fail:', e); } finally { if (indicator) indicator.innerHTML = ''; }
    }

    const idInput = document.getElementById('idNumber');
    if (idInput) {
        idInput.addEventListener('blur', function () {
            const id = this.value.trim();
            if (!id) return;
            lookupTSE(id);

            // Induction Check
            const inductions = window.getSiteData('holcim_inductions');
            const ind = inductions.find(i => i.idNumber === id);
            const now = new Date().toISOString().split('T')[0];

            const alertBox = document.getElementById('induction-alert-box');
            if (ind) {
                const isExpired = ind.expiry < now;
                if (isExpired) {
                    showNotification(`INDUCCIÓN VENCIDA (Expiró: ${ind.expiry})`, 'danger');
                    if (alertBox) {
                        alertBox.innerHTML = `
                            <div class="pulsing-alert alert-danger-light">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <div>
                                        <strong style="display: block; font-size: 0.8rem;">INDUCCIÓN VENCIDA (${ind.expiry})</strong>
                                        <span style="font-size: 0.7rem; font-weight: 400;">Trámite obligatorio antes del ingreso.</span>
                                    </div>
                                </div>
                            </div>`;
                        alertBox.style.display = 'block';
                    }
                } else {
                    showNotification(`INDUCCIÓN VIGENTE (Vence: ${ind.expiry})`, 'success');
                    if (alertBox) {
                        alertBox.innerHTML = `
                            <div class="pulsing-alert alert-success-light">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <i class="fas fa-check-circle"></i>
                                    <div>
                                        <strong style="display: block; font-size: 0.8rem;">INDUCCIÓN VIGENTE (Vence: ${ind.expiry})</strong>
                                        <span style="font-size: 0.7rem; font-weight: 400;">Acceso permitido para ${ind.fullName}.</span>
                                    </div>
                                </div>
                            </div>`;
                        alertBox.style.display = 'block';
                    }
                }
            } else {
                showNotification('SIN REGISTRO DE INDUCCIÓN', 'warning');
                if (alertBox) {
                    alertBox.innerHTML = `
                        <div class="pulsing-alert alert-danger-light">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-user-clock"></i>
                                <div>
                                    <strong style="display: block; font-size: 0.8rem;">SIN REGISTRO DE INDUCCIÓN</strong>
                                    <span style="font-size: 0.7rem; font-weight: 400;">Debe realizar la inducción de seguridad.</span>
                                </div>
                            </div>
                        </div>`;
                    alertBox.style.display = 'block';
                }
            }

            // Auto-fill company based on last entry
            const logs = window.getSiteData('holcim_access_logs');
            const lastEntry = logs.find(l => l.idNumber === id);
            if (lastEntry) {
                const companyInput = document.getElementById('company');
                if (companyInput && !companyInput.value) {
                    companyInput.value = lastEntry.company;
                    showNotification('EMPRESA VINCULADA AUTOMÁTICAMENTE', 'info');
                }
            }
        });
    }

    const typeSelect = document.getElementById('visitorType');
    if (typeSelect) {
        typeSelect.addEventListener('change', function () {
            const reasonSelect = document.getElementById('reason');
            if (!reasonSelect) return;

            const mapping = {
                'VISITANTE': 'REUNION',
                'PROVEEDOR': 'ENTREGA',
                'CONTRATISTA': 'TRABAJAR'
            };

            if (mapping[this.value]) {
                reasonSelect.value = mapping[this.value];
                validateExtraAuth(); // Trigger validation when reason changes automatically
            }
        });
    }

    // --- EXTRA AUTHORIZATION VALIDATION ---
    window.validateExtraAuth = function () {
        const reason = document.getElementById('reason')?.value;
        const authAlertBox = document.getElementById('auth-alert-box');
        if (!authAlertBox) return;

        if (reason !== 'TRABAJAR') {
            authAlertBox.style.display = 'none';
            return;
        }

        const idNum = (document.getElementById('idNumber')?.value || '').trim().replace(/-/g, '');
        const name = (document.getElementById('fullName')?.value || '').trim().toUpperCase();
        const company = (document.getElementById('company')?.value || '').trim().toUpperCase();

        if (!idNum && !name && !company) {
            authAlertBox.style.display = 'none';
            return;
        }

        const auths = window.getSiteData('holcim_extra_auths');
        const today = new Date().toISOString().split('T')[0];

        const match = auths.find(a => {
            const isDateValid = (today >= a.dateStart && today <= a.dateEnd);
            if (!isDateValid) return false;

            const authIdClean = a.idNumber ? a.idNumber.replace(/-/g, '') : '';
            const matchId = idNum && authIdClean === idNum;
            const matchName = name && a.name.toUpperCase().includes(name);
            const matchCompany = company && a.company.toUpperCase().includes(company);

            return matchId || matchName || matchCompany;
        });

        if (match) {
            authAlertBox.innerHTML = `
                <div class="pulsing-alert alert-success-light" style="border-color:var(--primary-teal); color:var(--primary-teal); background:rgba(0, 156, 189, 0.05); animation: alert-pulse-glow-teal 1.5s infinite alternate;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-user-check" style="color:var(--primary-teal); font-size: 2rem;"></i>
                        <div>
                            <strong style="display: block; font-size: 0.9rem; letter-spacing:0.5px;">PERSONAL AUTORIZADO</strong>
                            <span style="font-size: 0.75rem; font-weight: 400;">Autorizado por: ${match.approver} hasta ${match.dateEnd}</span>
                        </div>
                    </div>
                </div>`;
            authAlertBox.style.display = 'block';
        } else {
            authAlertBox.innerHTML = `
                <div class="pulsing-alert alert-danger-light" style="border-color:var(--red-holcim); color:var(--red-holcim); background:rgba(237, 28, 22, 0.05); animation: alert-pulse-glow-red 1.5s infinite alternate;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-user-lock" style="color:var(--red-holcim); font-size: 2rem;"></i>
                        <div>
                            <strong style="display: block; font-size: 0.9rem; letter-spacing:0.5px;">NO SE CUENTA CON AUTORIZACIÓN EXTRAORDINARIA</strong>
                            <span style="font-size: 0.75rem; font-weight: 400;">El ingreso para TRABAJAR requiere previa autorización.</span>
                        </div>
                    </div>
                </div>`;
            authAlertBox.style.display = 'block';
        }
    };

    // Attach validation listeners
    ['idNumber', 'fullName', 'company', 'reason'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const eventType = el.tagName === 'SELECT' ? 'change' : 'blur';
            el.addEventListener(eventType, validateExtraAuth);
            // Also listen for input on text fields for better reactivity
            if (eventType === 'blur') el.addEventListener('input', validateExtraAuth);
        }
    });

    // Custom animations for teal/red pulsing
    const pulseStyle = document.createElement('style');
    pulseStyle.innerHTML = `
        @keyframes alert-pulse-glow-teal {
            from { border-color: var(--primary-teal); box-shadow: 0 0 5px rgba(0, 156, 189, 0.2); transform: scale(1); }
            to { border-color: var(--primary-teal); box-shadow: 0 0 15px rgba(0, 156, 189, 0.4); transform: scale(1.01); }
        }
        @keyframes alert-pulse-glow-red {
            from { border-color: var(--red-holcim); box-shadow: 0 0 5px rgba(237, 28, 22, 0.2); transform: scale(1); }
            to { border-color: var(--red-holcim); box-shadow: 0 0 15px rgba(237, 28, 22, 0.4); transform: scale(1.01); }
        }
    `;
    document.head.appendChild(pulseStyle);

    window.switchDbTab = function (tabId, btn) {
        document.querySelectorAll('.db-tab-content').forEach(c => c.style.display = 'none');
        document.getElementById(tabId).style.display = 'block';
        document.querySelectorAll('.db-tab-btn').forEach(b => {
            b.classList.remove('active');
            b.style.background = b.getAttribute('data-bg') || b.style.background;
        });
        btn.classList.add('active');
        if (!btn.getAttribute('data-bg')) btn.setAttribute('data-bg', btn.style.background);
        btn.style.background = 'var(--primary-teal)';

        if (tabId === 'keys-tab') renderDbKeys();
        if (tabId === 'badges-tab') window.updateBadgeDropdown(); // badges rendered inside updateBadgeDropdown
        if (tabId === 'personnel-tab') renderDbPersonnel();
        if (tabId === 'officers-tab') renderDbOfficers();
        if (tabId === 'contact-tab') renderDbContacts();
        if (tabId === 'cctv-tab') renderDbCCTV();
        if (tabId === 'access-points-tab') renderDbAccessPoints();
        if (tabId === 'zones-db-tab') renderDbZones();
    };

    window.renderDbZones = function () {
        const body = document.getElementById('db-zone-list-body');
        if (!body) return;
        const zones = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_security_zones')) || '[]');

        if (zones.length === 0) {
            body.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);grid-column:1/-1">No hay zonas configuradas.</div>';
            return;
        }

        const colors = { 'RED': '#ef4444', 'YELLOW': '#f59e0b', 'GREEN': '#10b981' };
        body.innerHTML = zones.map((zone, idx) => `
            <div class="list-row" style="grid-template-columns: 80px 1fr 100px 100px; align-items: center;">
                <strong style="color:var(--primary-teal)">${zone.id}</strong>
                <span style="font-size:0.85rem">${zone.name}</span>
                <div><span class="induction-status" style="background:${colors[zone.state]}20;color:${colors[zone.state]};border:1px solid ${colors[zone.state]}40;font-size:0.65rem">${zone.state}</span></div>
                <div style="display:flex;gap:4px;">
                    <button class="btn-salida-corpo" onclick="openEditDbZone(${idx})" style="padding:3px 8px;font-size:0.7rem;background:var(--primary-teal);color:white;border-color:var(--primary-teal);"><i class="fas fa-pen"></i></button>
                    <button class="btn-salida-corpo" onclick="deleteDbZone(${idx})" style="padding:3px 8px;font-size:0.7rem;background:#ef4444;color:white;border-color:#ef4444"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    };

    // --- THEME MANAGEMENT ---
    const themeToggle = document.getElementById('theme-toggle');
    const updateThemeUI = (isDark) => {
        const icon = themeToggle.querySelector('i');
        const text = themeToggle.querySelector('span');
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            icon.className = 'fas fa-sun';
            text.textContent = 'MODO DÍA';
        } else {
            document.documentElement.removeAttribute('data-theme');
            icon.className = 'fas fa-moon';
            text.textContent = 'MODO NOCHE';
        }
    };

    const currentTheme = localStorage.getItem('holcim_theme');
    if (currentTheme === 'dark') updateThemeUI(true);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const nextDark = !isDark;
            updateThemeUI(nextDark);
            localStorage.setItem('holcim_theme', nextDark ? 'dark' : 'light');
        });
    }

    // --- NAVIGATION ---
    window.switchView = function (viewId) {
        const navLinks = document.querySelectorAll('.nav-link, .nav-submenu-link');
        const sections = document.querySelectorAll('.view-section');

        // Hide login if authenticated
        if (getSession() && document.getElementById('login-overlay')) {
            document.getElementById('login-overlay').style.display = 'none';
        }

        navLinks.forEach(l => {
            const isActive = l.getAttribute('data-view') === viewId;
            l.classList.toggle('active', isActive);

            // If sub-menu link is active, ensure parent dropdown is open
            if (isActive && l.classList.contains('nav-submenu-link')) {
                const parentDropdown = l.closest('.nav-item-dropdown');
                if (parentDropdown) parentDropdown.classList.add('active-dropdown');
            }
        });

        // Animation transition
        sections.forEach(v => {
            if (v.id === viewId + '-view') {
                v.style.display = 'block';
                // Immediate visibility for reliability, then add animation class
                v.classList.add('active-view');
            } else {
                v.classList.remove('active-view');
                v.style.display = 'none';
            }
        });

        if (viewId === 'dashboard') {
            renderMonitor();
            populateMonitorCompanyFilter();
        }
        if (viewId === 'reports') renderReports();
        if (viewId === 'cctv-monitoring') renderCctvMonitoring();
        if (viewId === 'inductions') renderInductions();
        if (viewId === 'extra-auth') renderAuthList();
        if (viewId === 'keys') renderKeyLoans();
        if (viewId === 'database') { renderDbKeys(); renderDbPersonnel(); renderDbOfficers(); renderDbContacts(); renderDbBadges(); renderDbCCTV(); renderDbAccessPoints(); }
        if (viewId === 'settings') {
            renderUserList();
            showSettingsSection('profile');
        }
        if (viewId === 'notes') {
            renderNotesList();
        }
        if (viewId === 'statistics') {
            if (typeof window.renderStatistics === 'function') window.renderStatistics();
        }
        if (viewId === 'security-systems') {
            if (typeof window.initSecurityZonesMap === 'function') {
                window.initSecurityZonesMap();
            }
            // Update Hub Clock
            const updateClock = () => {
                const el = document.getElementById('security-systems-clock');
                if (el) el.textContent = new Date().toLocaleTimeString();
            };
            updateClock();
            if (window._securityHubClockInterval) clearInterval(window._securityHubClockInterval);
            window._securityHubClockInterval = setInterval(updateClock, 1000);
        }
        if (viewId === 'security-audit') {
            if (typeof window.initSecurityAudit === 'function') {
                window.initSecurityAudit();
            }
        }
        if (viewId === 'crime-stats') {
            if (typeof window.initCrimeStats === 'function') {
                window.initCrimeStats();
            }
            if (typeof window.refreshCrimeMap === 'function') {
                window.refreshCrimeMap();
            }
        }
    };

    // --- NAVIGATION EVENT BINDING ---
    document.addEventListener('click', e => {
        const link = e.target.closest('.nav-link, .nav-submenu-link');
        const clickedInsideDropdown = e.target.closest('.nav-item-dropdown');

        // Close all dropdowns when clicking outside any dropdown
        if (!clickedInsideDropdown) {
            document.querySelectorAll('.nav-item-dropdown').forEach(item => item.classList.remove('active-dropdown'));
        }

        if (link) {
            e.preventDefault();

            const dropdownParent = link.closest('.nav-item-dropdown');
            const isSubmenuLink = link.classList.contains('nav-submenu-link');

            // If it's a parent dropdown link, toggle the dropdown
            if (dropdownParent && !isSubmenuLink) {
                dropdownParent.classList.toggle('active-dropdown');
                // Close other open dropdowns (accordion effect)
                document.querySelectorAll('.nav-item-dropdown').forEach(item => {
                    if (item !== dropdownParent) item.classList.remove('active-dropdown');
                });
            }

            const viewId = link.getAttribute('data-view');
            if (viewId) window.switchView(viewId);
        }
    });

    window.showSettingsSection = function (sectionId) {
        // Toggle nav items
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
        });
        // Toggle sections
        document.querySelectorAll('.settings-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === 'settings-' + sectionId);
        });
        if (sectionId === 'logs') renderLiveLog();
        if (sectionId === 'storage') updateStorageUI();
        if (sectionId === 'system') {
            const session = getSession();
            if (session && document.getElementById('config-site-name')) {
                document.getElementById('config-site-name').value = session.site || '';
            }
        }
    };

    // --- LOGOUT LOGIC ---
    window.logout = function () {
        localStorage.removeItem('holcim_session');
        showNotification('SESIÓN CERRADA', 'info');
        window.location.reload();
    };

    const btnLogoutHeader = document.getElementById('btn-logout-header');
    if (btnLogoutHeader) btnLogoutHeader.addEventListener('click', logout);

    const btnLogoutSettings = document.getElementById('btn-logout');
    if (btnLogoutSettings) btnLogoutSettings.addEventListener('click', logout);

    // --- AUTHENTICATION ---
    const loginOverlay = document.getElementById('login-overlay');
    function checkAuth() {
        const user = getSession();
        if (user) {
            loginOverlay.style.display = 'none';
            if (document.querySelector('.header-top')) document.querySelector('.header-top').style.display = 'flex';
            if (document.querySelector('.nav-bar')) document.querySelector('.nav-bar').style.display = 'flex';

            applyUserPermissions(user);

            // POST-LOGIN INITIALIZATION (For Site-Specific Data)
            // ... (rest of initialKeys and initializeData)
            const initialKeys = {
                1: "Portón 1, 2, 3", 2: "Portón 1 Lubricación", 3: "Portón 2 Horomil", 4: "Portón 3 Puzolana",
                5: "Portón GYM", 6: "Portón Caseta Principal", 7: "Portón Cefore y Auditorio", 8: "Comedor",
                9: "Quebrador Primario", 10: "Portón Cancha", 11: "Cefore", 12: "Auditorio",
                13: "Portón de Trailetas", 14: "Gimnasio", 15: "Biblioteca", 16: "Instituto Holcim",
                17: "Oficinas Nítidos", 18: "Vestidores", 19: "Puertas Caseta Principal", 20: "C.P. Sala Inducción / Sanitario",
                21: "C.P. Puerta Oficiales / Limpieza", 22: "Brazo Hidráulico", 23: "Servicio Caseta Principal", 24: "Portón de Silo Clinker",
                25: "Portón de Morado", 26: "Portón del Parqueo", 27: "Bodega de Agua Caseta Sur", 28: "Llaves Viejas Cefore",
                29: "CEPAL", 30: "Báscula", 31: "Carter Horomil", 32: "Portón Kiosko Parqueo Log.",
                33: "Cadena Parqueo Logístico", 34: "Cadena Entrada Kiosko", 35: "Cuarto Lubricación Horno", 36: "Llaves de Roldanas",
                37: "Portón Este Almacén Cepal", 38: "Puzolana", 39: "Bomba Lourdes", 40: "Bomba de Dulce Nombre",
                41: "Proveeduría", 42: "Almacén CEPAL", 43: "Dispensario", 44: "Subestación",
                45: "Logística / Kiosko", 46: "Planta Eléctrica Administrativo", 47: "Edificio Administrativo", 48: "Oficina T.I.",
                49: "Oficina Sala de Control", 50: "Cuarto Eléctrico", 51: "Bodega Torre – Geocycle", 52: "Despacho Interno",
                53: "Tool Room", 54: "Taller Lubricación", 55: "Caudalímetro", 56: "Lab. Cuarto Chiller",
                57: "Bomba de Agua Cuarto Chiller", 58: "Agujas / Control Doping", 59: "Mina / J01-411", 60: "Supervisores 111-414",
                61: "Toyota Land Cruiser 191-141", 62: "Kia 111-413", 63: "Suzuki", 64: "Minas Externas",
                65: "Almacén", 66: "Sala Servidores", 67: "Pickup Gris HYS", 68: "Montacargas Pequeño",
                69: "Compresores", 70: "Oficina Mant. Mec", 71: "Silo Clinker", 72: "Silo 10",
                73: "Montacarga Grande", 74: "Asegrupo Holcim", 75: "Taller CEPAL", 76: "Polvorín",
                77: "Sistema de agua potable", 78: "Caseta sur", 79: "Grupo Rio", 80: "Westerial",
                81: "Fabrica de bolsas", 82: "Ridara", 83: "Suzuki"
            };
            const keysArray = Object.entries(initialKeys).map(([num, name]) => ({ num: parseInt(num), name, status: 'OPERATIVA' }));

            initializeData('holcim_inventory_keys', keysArray);
            initializeData('holcim_personnel_directory', []);
            initializeData('holcim_access_logs', []);
            initializeData('holcim_extra_auths', []);
            initializeData('holcim_key_loans', []);
            initializeData('holcim_event_log', []);
            initializeData('holcim_inductions', []);
            initializeData('holcim_audit_log', []);
            initializeData('holcim_security_officers', []);
            initializeData('holcim_contact_directory', []);
            initializeData('holcim_badge_inventory', []);
            initializeData('holcim_cctv_inventory', []);
            initializeData('holcim_cctv_reviews', []);
            initializeData('holcim_virtual_rounds', []);
            initializeData('holcim_security_audit', {});
            initializeData('holcim_security_zones', [
                { id: 'Z1', name: 'Zona 1: Perímetro Norte (Cantera)', state: 'RED', coords: [[9.930, -84.092], [9.932, -84.090], [9.932, -84.088], [9.930, -84.088]] },
                { id: 'Z2', name: 'Zona 2: Planta de Producción y Silos', state: 'RED', coords: [[9.928, -84.092], [9.930, -84.092], [9.930, -84.088], [9.928, -84.088]] },
                { id: 'Z3', name: 'Zona 3: Almacén y Logística', state: 'RED', coords: [[9.926, -84.092], [9.928, -84.092], [9.928, -84.088], [9.926, -84.088]] },
                { id: 'Z4', name: 'Zona 4: Oficinas y Acceso Principal', state: 'RED', coords: [[9.926, -84.094], [9.928, -84.094], [9.928, -84.092], [9.926, -84.092]] }
            ]);
            initializeData('holcim_security_zone_logs', []);
            updateBadgeDropdown();
            switchView('home');

            // Live clock for home screen
            function updateHomeClock() {
                const el = document.getElementById('home-live-time');
                if (el) el.textContent = new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }
            updateHomeClock();
            setInterval(updateHomeClock, 1000);

            // Start Calendar Alert System
            setInterval(checkCalendarAlerts, 60000); // Check every minute
            checkCalendarAlerts(); // Run once on load
        } else {
            loginOverlay.style.display = 'flex';
            if (document.querySelector('.header-top')) document.querySelector('.header-top').style.display = 'none';
            if (document.querySelector('.nav-bar')) document.querySelector('.nav-bar').style.display = 'none';
            document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
        }
    }

    // --- SERVICE WORKER REGISTRATION ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW Registered:', reg.scope))
                .catch(err => console.error('SW Registration Fail:', err));
        });
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-pass').value;
            const allUsers = JSON.parse(localStorage.getItem('holcim_users') || '[]');
            const user = allUsers.find(u => u.email === email && u.pass === pass);
            if (user) {
                setSession(user);
                checkAuth();
                showNotification('BIENVENIDO', 'success');
                addLogEvent('SISTEMA', 'Ingreso exitoso');
            } else {
                showNotification('CREDENCIALES INVÁLIDAS', 'danger');
            }
        });
    }

    function applyUserPermissions(user) {
        try {
            if (!user) return;
            const prof = document.querySelector('.user-profile');
            if (prof) prof.textContent = (user.email ? user.email[0].toUpperCase() : 'A');

            const site = document.getElementById('header-site-name');
            if (site) site.textContent = user.site || 'CONTROL DE ACCESO';

            const navItems = document.querySelectorAll('.nav-link');
            navItems.forEach(link => {
                const v = link.getAttribute('data-view');
                const permissions = user.permissions || [];
                const hasPerm = (user.email === MASTER_ADMIN_EMAIL) || permissions.includes(v);
                if (link.parentElement) link.parentElement.style.display = hasPerm ? 'flex' : 'none';
            });
        } catch (e) { console.error("Error in applyUserPermissions", e); }
    }

    // --- BASE DE DATOS (CRUD LLAVES Y PERSONAL) ---
    function renderDbKeys() {
        const body = document.getElementById('db-key-list-body');
        if (!body) return;
        const keys = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_inventory_keys')) || '[]');
        body.innerHTML = keys.sort((a, b) => a.num - b.num).map(k => `
            <div class="list-row" style="grid-template-columns: 60px 1fr 120px 160px;">
                <strong style="display:flex; align-items:center; gap:5px;">#${k.num} ${k.securityAlert ? '<i class="fas fa-exclamation-triangle" style="color:var(--red-holcim); font-size:0.7rem;" title="' + k.securityAlert + '"></i>' : ''}</strong>
                <span title="${k.name}">${k.name}</span>
                <div><span class="induction-status ${k.status === 'OPERATIVA' ? 'status-active' : 'status-missing'}" style="font-size:0.65rem">${k.status}</span></div>
                <div style="display:flex;gap:4px;">
                    <button class="btn-salida-corpo" onclick="openEditDbKey(${k.num})" style="padding:2px 8px; font-size:0.7rem; background:var(--primary-teal); color:white; border-color:var(--primary-teal);"><i class="fas fa-pen"></i></button>
                    <button class="btn-salida-corpo" onclick="deleteDbKey(${k.num})" style="padding:2px 8px; font-size:0.7rem">BORRAR</button>
                </div>
            </div>
        `).join('');
    }
    window.renderDbKeys = renderDbKeys;

    const dbKeyForm = document.getElementById('db-key-form');
    if (dbKeyForm) {
        dbKeyForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const num = parseInt(document.getElementById('db-key-num').value);
            const name = document.getElementById('db-key-name').value;
            const status = document.getElementById('db-key-status').value;
            const securityAlert = document.getElementById('db-key-alert').value.trim();
            let keys = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_inventory_keys')) || '[]');
            const idx = keys.findIndex(k => k.num === num);
            const keyData = { num, name, status, securityAlert };
            if (idx > -1) keys[idx] = keyData;
            else keys.push(keyData);
            localStorage.setItem(window.getSiteKey('holcim_inventory_keys'), JSON.stringify(keys));
            showNotification('LLAVE ACTUALIZADA', 'success');
            dbKeyForm.reset(); renderDbKeys();
        });
    }

    window.deleteDbKey = function (num) {
        if (!confirm('¿Eliminar llave #' + num + '?')) return;
        const keysKey = window.getSiteKey('holcim_inventory_keys');
        let keys = JSON.parse(localStorage.getItem(keysKey) || '[]');
        keys = keys.filter(k => k.num !== num);
        localStorage.setItem(keysKey, JSON.stringify(keys));
        renderDbKeys();
    };

    function renderDbPersonnel() {
        const body = document.getElementById('db-person-list-body');
        if (!body) return;
        const people = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_personnel_directory')) || '[]');
        body.innerHTML = people.map((p, idx) => `
            <div class="list-row" style="grid-template-columns: 1fr 120px 160px;">
                <span style="font-weight:700">${p.name}</span>
                <span class="badge-motivo" style="font-size:0.65rem">${p.dept}</span>
                <div style="display:flex;gap:4px;">
                    <button class="btn-salida-corpo" onclick="openEditDbPerson(${idx})" style="padding:2px 8px; font-size:0.7rem; background:var(--primary-teal); color:white; border-color:var(--primary-teal);"><i class="fas fa-pen"></i></button>
                    <button class="btn-salida-corpo" onclick="deleteDbPerson(${idx})" style="padding:2px 8px; font-size:0.7rem">BORRAR</button>
                </div>
            </div>
        `).join('');
    }
    window.renderDbPersonnel = renderDbPersonnel;

    const dbPersonForm = document.getElementById('db-person-form');
    if (dbPersonForm) {
        dbPersonForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = document.getElementById('db-person-name').value.toUpperCase();
            const dept = document.getElementById('db-person-dept').value;
            const pk = window.getSiteKey('holcim_personnel_directory');
            let people = JSON.parse(localStorage.getItem(pk) || '[]');
            people.push({ name, dept });
            localStorage.setItem(pk, JSON.stringify(people));
            showNotification('PERSONAL REGISTRADO', 'success');
            dbPersonForm.reset(); renderDbPersonnel();
        });
    }

    window.deleteDbPerson = function (idx) {
        const pk = window.getSiteKey('holcim_personnel_directory');
        let people = JSON.parse(localStorage.getItem(pk) || '[]');
        people.splice(idx, 1);
        localStorage.setItem(pk, JSON.stringify(people));
        renderDbPersonnel();
    };

    // --- AUTOMATION: DEPT -> RESPONSABLE HOLCIM ---
    const deptSelect = document.getElementById('department');
    const respInput = document.getElementById('responsible');

    function updatePersonnelDatalist() {
        if (!deptSelect || !respInput) return;
        const dept = deptSelect.value.trim(); // Trim for accuracy
        const people = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_personnel_directory')) || '[]');

        // If dept is selected, filter STRICTLY by that department
        let filtered = [];
        if (dept) {
            filtered = people.filter(p => String(p.dept).trim().toUpperCase() === dept.toUpperCase());
        } else {
            // If no department selected, show all as a global list
            filtered = people;
        }

        let dl = document.getElementById('personnel-datalist');
        if (!dl) {
            dl = document.createElement('datalist');
            dl.id = 'personnel-datalist';
            document.body.appendChild(dl);
        }

        respInput.setAttribute('list', 'personnel-datalist');

        if (filtered.length > 0) {
            const uniqueNames = [...new Set(filtered.map(p => p.name))].sort();
            dl.innerHTML = uniqueNames.map(name => `<option value="${name}">`).join('');
        } else {
            dl.innerHTML = '';
        }
    }

    if (deptSelect) {
        deptSelect.addEventListener('change', updatePersonnelDatalist);
    }
    if (respInput) {
        respInput.addEventListener('focus', updatePersonnelDatalist);
    }

    // --- EXTRA AUTHORIZATIONS ---
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const ak = window.getSiteKey('holcim_extra_auths');
            const auths = JSON.parse(localStorage.getItem(ak) || '[]');
            const newAuth = {
                id: Date.now(),
                idNumber: document.getElementById('auth-id-num').value.trim(),
                name: document.getElementById('auth-name').value.toUpperCase(),
                company: document.getElementById('auth-company').value.toUpperCase(),
                approver: document.getElementById('auth-approver').value.toUpperCase(),
                dateStart: document.getElementById('auth-date-start').value,
                dateEnd: document.getElementById('auth-date-end').value
            };

            // Prevent duplicates (active)
            const today = new Date().toISOString().split('T')[0];
            const duplicate = auths.find(a =>
                a.idNumber === newAuth.idNumber &&
                a.dateEnd >= today
            );

            if (duplicate) {
                showNotification('YA EXISTE UNA AUTORIZACIÓN VIGENTE PARA ESTA CÉDULA', 'warning');
                return;
            }

            auths.unshift(newAuth);
            localStorage.setItem(ak, JSON.stringify(auths));
            showNotification('AUTORIZACIÓN GUARDADA', 'success');
            addLogEvent('AUTORIZACIÓN', 'Nueva: ' + newAuth.name);
            authForm.reset(); renderAuthList();
            if (window.checkExtraAuthAlerts) window.checkExtraAuthAlerts();
        });
    }

    window.openAuthEdit = function (id) {
        const auths = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_extra_auths')) || '[]');
        const auth = auths.find(a => a.id === id);
        if (auth) {
            document.getElementById('edit-auth-id').value = auth.id;
            document.getElementById('edit-auth-id-num').value = auth.idNumber || '';
            document.getElementById('edit-auth-name').value = auth.name;
            document.getElementById('edit-auth-company').value = auth.company;
            document.getElementById('edit-auth-approver').value = auth.approver;
            document.getElementById('edit-auth-date-start').value = auth.dateStart;
            document.getElementById('edit-auth-date-end').value = auth.dateEnd;
            document.getElementById('modal-edit-auth').style.display = 'flex';
        }
    };

    window.saveAuthEdit = function () {
        const id = document.getElementById('edit-auth-id').value;
        const ak = window.getSiteKey('holcim_extra_auths');
        const auths = JSON.parse(localStorage.getItem(ak) || '[]');
        const auth = auths.find(a => a.id == id);
        if (auth) {
            const fields = {
                idNumber: document.getElementById('edit-auth-id-num').value.trim(),
                name: document.getElementById('edit-auth-name').value.toUpperCase(),
                company: document.getElementById('edit-auth-company').value.toUpperCase(),
                approver: document.getElementById('edit-auth-approver').value.toUpperCase(),
                dateStart: document.getElementById('edit-auth-date-start').value,
                dateEnd: document.getElementById('edit-auth-date-end').value
            };
            let changed = false;
            for (const key in fields) {
                if (auth[key] !== fields[key]) {
                    if (window.addAuditLog) window.addAuditLog('AUTORIZACIÓN', auth.id, key, auth[key], fields[key]);
                    auth[key] = fields[key]; changed = true;
                }
            }
            if (changed) {
                localStorage.setItem(ak, JSON.stringify(auths));
                showNotification('AUTORIZACIÓN ACTUALIZADA', 'success');
            }
            document.getElementById('modal-edit-auth').style.display = 'none';
            renderAuthList();
            if (window.checkExtraAuthAlerts) window.checkExtraAuthAlerts();
        }
    };

    window.closeEditAuthModal = () => document.getElementById('modal-edit-auth').style.display = 'none';

    window.deleteAuthRecord = function (id) {
        if (!confirm('¿Está seguro de eliminar esta autorización?')) return;
        const ak = window.getSiteKey('holcim_extra_auths');
        let auths = JSON.parse(localStorage.getItem(ak) || '[]');
        auths = auths.filter(a => a.id != id);
        localStorage.setItem(ak, JSON.stringify(auths));
        showNotification('AUTORIZACIÓN ELIMINADA', 'info');
        renderAuthList();
        if (window.checkExtraAuthAlerts) window.checkExtraAuthAlerts();
    };

    function renderAuthList() {
        const body = document.getElementById('auth-list-body');
        if (!body) return;
        const ak = window.getSiteKey('holcim_extra_auths');
        const auths = JSON.parse(localStorage.getItem(ak) || '[]');
        const searchName = (document.getElementById('auth-search-name')?.value || '').toLowerCase();
        const searchCompany = (document.getElementById('auth-search-company')?.value || '').toLowerCase();
        const filterStatus = document.getElementById('auth-filter-status')?.value || 'ALL';
        const filterMonth = document.getElementById('auth-filter-date')?.value;

        const filtered = auths.filter(a => {
            const matchesName = a.name.toLowerCase().includes(searchName);
            const matchesCompany = a.company.toLowerCase().includes(searchCompany);

            const expDate = new Date(a.dateEnd);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

            let status = 'VIGENTE';
            if (diffDays < 0) status = 'VENCIDA';
            else if (diffDays <= 7) status = 'POR VENCER';

            const matchesStatus = filterStatus === 'ALL' || status === filterStatus;
            const matchesMonth = !filterMonth || a.dateEnd.startsWith(filterMonth);

            return matchesName && matchesCompany && matchesStatus && matchesMonth;
        });

        body.innerHTML = filtered.map(a => {
            const expDate = new Date(a.dateEnd);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

            let statusClass = 'status-active';
            let statusText = 'VIGENTE';
            if (diffDays < 0) { statusClass = 'status-missing'; statusText = 'VENCIDA'; }
            else if (diffDays <= 7) { statusClass = 'status-expired'; statusText = 'POR VENCER'; }

            return `
                <div class="list-row" style="grid-template-columns: 100px 1fr 130px 120px 100px 100px 100px 130px;">
                    <span style="font-size:0.75rem; color:var(--text-muted)">${a.idNumber || 'N/A'}</span>
                    <strong style="font-size:0.85rem; cursor:pointer; color:var(--primary-teal)" onclick="openAuthEdit(${a.id})">${a.name}</strong>
                    <span style="font-size:0.75rem">${a.company}</span>
                    <span style="font-size:0.75rem">${a.approver}</span>
                    <span style="font-size:0.75rem">${a.dateStart}</span>
                    <span style="font-size:0.75rem">${a.dateEnd}</span>
                    <div><span class="induction-status ${statusClass}" onclick="openTraceability(${a.id}, '${a.name}')" style="cursor:pointer">${statusText}</span></div>
                    <div style="display:flex; gap:5px; justify-content: flex-end;">
                        <button class="btn-crear" onclick="openAuthEdit(${a.id})" style="padding:2px 8px; font-size:0.7rem; width:auto; height:auto; margin:0; background:var(--primary-teal); border-color:var(--primary-teal);">EDITAR</button>
                        <button class="btn-salida-corpo" onclick="deleteAuthRecord(${a.id})" style="background:var(--red-holcim); color:white; border-color:var(--red-holcim); padding:2px 8px; font-size:0.7rem; width:auto; height:auto; margin:0;">ELIMINAR</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    ['auth-search-name', 'auth-search-company', 'auth-filter-status', 'auth-filter-date'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', renderAuthList);
    });

    window.exportMonitor = function (format) {
        const logs = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_access_logs')) || '[]');
        const active = logs.filter(l => !l.exitTime);
        if (active.length === 0) return showNotification('NO HAY PERSONAL ACTIVO', 'danger');

        const sorted = active.sort((a, b) => a.idNumber.localeCompare(b.idNumber));

        if (format === 'xlsx') {
            let csv = "\uFEFFCEDULA,NOMBRE,EMPRESA,TIPO,DEPARTAMENTO,RESPONSABLE,MOTIVO,INGRESO\n";
            sorted.forEach(l => {
                csv += `"${l.idNumber}","${l.fullName}","${l.company}","${l.visitorType}","${l.department}","${l.responsible}","${l.reason}","${new Date(l.entryTime).toLocaleString()}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Monitoreo_Activo_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
        } else { window.print(); }
    };

    window.exportInductions = function (format) {
        const inductions = window.getSiteData('holcim_inductions');
        if (inductions.length === 0) return showNotification('NO HAY INDUCCIONES REGISTRADAS', 'danger');

        const sorted = inductions.sort((a, b) => a.id.localeCompare(b.id));

        if (format === 'xlsx') {
            let csv = "\uFEFFCEDULA,NOMBRE completo,EMPRESA,FECHA INDUCCION,EXPIRACION\n";
            sorted.forEach(i => {
                csv += `"${i.id}","${i.name}","${i.company}","${i.date}","${i.expiry}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Base_Inducciones_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
        } else { window.print(); }
    };

    window.exportAuth = function (format) {
        const auths = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_extra_auths')) || '[]');
        if (auths.length === 0) return showNotification('NO HAY DATOS', 'danger');

        // Note: Auths don't always have ID/Cédula, keeping original order or sorting by name
        if (format === 'xlsx') {
            let csv = "\uFEFFBENEFICIARIO,EMPRESA,AUTORIZA,INICIO,VENCIMIENTO\n";
            auths.forEach(a => {
                csv += `"${a.name}","${a.company}","${a.approver}","${a.dateStart}","${a.dateEnd}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `Autorizaciones_Extra_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
        } else { window.print(); }
    };

    window.exportKeyLoans = function (format) {
        const loans = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_key_loans')) || '[]');
        if (loans.length === 0) return showNotification('NO HAY DATOS', 'danger');

        const sorted = [...loans].sort((a, b) => a.num - b.num);

        if (format === 'xlsx') {
            let csv = "\uFEFFNUM LLAVE,UBICACION,SOLICITANTE,OFICIAL,PRESTAMO,DEVOLUCION,ESTADO\n";
            sorted.forEach(l => {
                csv += `"${l.num}","${l.name}","${l.requestor}","${l.officer}","${new Date(l.loanTime).toLocaleString()}","${l.returnTime ? new Date(l.returnTime).toLocaleString() : '-'}","${l.returnTime ? 'DEVUELTO' : 'ACTIVO'}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = `Reporte_Llaves_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        } else { window.print(); }
    };

    // --- MONITOR & ACCESS LOGS ---
    function updateCounters() {
        const logs = window.getSiteData('holcim_access_logs');
        const active = logs.filter(l => !l.exitTime);

        const countActive = document.getElementById('count-active');
        const countContractors = document.getElementById('count-contractors');
        const countVisitors = document.getElementById('count-visitors');
        const countProviders = document.getElementById('count-providers');
        const countAlerts = document.getElementById('count-alerts');

        if (countActive) countActive.textContent = active.length;
        if (countContractors) countContractors.textContent = active.filter(l => l.visitorType === 'CONTRATISTA').length;
        if (countVisitors) countVisitors.textContent = active.filter(l => l.visitorType === 'VISITANTE').length;
        if (countProviders) countProviders.textContent = active.filter(l => l.visitorType === 'PROVEEDOR').length;

        const now = Date.now();
        const overtimed = active.filter(l => (now - new Date(l.entryTime).getTime()) > 12 * 60 * 60 * 1000);
        if (countAlerts) countAlerts.textContent = overtimed.length;
        const btnAlerts = document.getElementById('btn-show-alerts');
        if (btnAlerts) btnAlerts.classList.toggle('pulse-active', overtimed.length > 0);
    }

    // --- DASHBOARD DRILL-DOWN ---
    window.showFilteredPersonnel = function (type) {
        const logs = window.getSiteData('holcim_access_logs');
        const active = logs.filter(l => !l.exitTime);
        const filtered = type === 'ALL' ? active : active.filter(l => l.visitorType === type);

        const titleMap = {
            'ALL': 'Personal Total en Planta',
            'CONTRATISTA': 'Contratistas en Planta',
            'VISITANTE': 'Visitas en Planta',
            'PROVEEDOR': 'Proveedores en Planta'
        };

        const titleEl = document.getElementById('personnel-detail-title');
        const bodyEl = document.getElementById('personnel-detail-body');
        const headerEl = document.getElementById('personnel-detail-header');

        if (titleEl) titleEl.textContent = titleMap[type] || 'Personal en Planta';
        if (headerEl) headerEl.style.background = 'var(--navy-black)';

        renderPersonnelDetail(filtered);
    };

    window.showOvertimeAlerts = function () {
        const logs = window.getSiteData('holcim_access_logs');
        const active = logs.filter(l => !l.exitTime);
        const now = Date.now();
        const overtimed = active.filter(l => (now - new Date(l.entryTime).getTime()) > 12 * 60 * 60 * 1000);

        const titleEl = document.getElementById('personnel-detail-title');
        const headerEl = document.getElementById('personnel-detail-header');

        if (titleEl) titleEl.textContent = 'ALERTAS: Personal con +12h en Planta';
        if (headerEl) headerEl.style.background = 'var(--red-holcim)';

        renderPersonnelDetail(overtimed);
    };

    function renderPersonnelDetail(list) {
        const bodyEl = document.getElementById('personnel-detail-body');
        if (!bodyEl) return;

        if (list.length === 0) {
            bodyEl.innerHTML = '<div style="padding:4rem; text-align:center; color:var(--text-muted);">No hay personal activo en esta categoría.</div>';
        } else {
            bodyEl.innerHTML = list.map(l => `
                <div class="list-row" style="grid-template-columns: 120px 1fr 150px 140px 140px; font-size:0.85rem">
                    <span>${l.idNumber}</span>
                    <strong>${l.fullName}</strong>
                    <span>${l.company}</span>
                    <span style="font-size:0.75rem">${l.department}</span>
                    <span style="font-weight:700">${new Date(l.entryTime).toLocaleTimeString()}</span>
                </div>
            `).join('');
        }
        document.getElementById('modal-personnel-detail').style.display = 'flex';
    }

    window.closePersonnelDetail = function () {
        document.getElementById('modal-personnel-detail').style.display = 'none';
    };

    const accessForm = document.getElementById('access-form');
    if (accessForm) {
        accessForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const idNumber = document.getElementById('idNumber').value.trim();
            const logsKey = window.getSiteKey('holcim_access_logs');
            const logs = JSON.parse(localStorage.getItem(logsKey) || '[]');

            // Duplicate Check: Check if person is already inside
            const alreadyInside = logs.find(l => l.idNumber === idNumber && !l.exitTime);
            if (alreadyInside) {
                showNotification(`ESTA PERSONA YA SE ENCUENTRA EN PLANTA (Gafete: ${alreadyInside.badgeNumber})`, 'danger');
                return;
            }

            const now = new Date();
            const newEntry = {
                id: Date.now(), idNumber: idNumber,
                fullName: document.getElementById('fullName').value.toUpperCase(),
                visitorType: document.getElementById('visitorType').value,
                company: document.getElementById('company').value.toUpperCase(),
                department: document.getElementById('department').value,
                responsible: document.getElementById('responsible').value.toUpperCase(),
                reason: document.getElementById('reason').value,
                vehiclePlate: document.getElementById('vehiclePlate').value.toUpperCase(),
                badgeNumber: document.getElementById('badgeNumber').value.toUpperCase(),
                entryTime: now.toISOString(), exitTime: null
            };

            // Induction Logic
            const inductionCheck = document.getElementById('inductionPassed');
            if (inductionCheck && inductionCheck.checked) {
                const indKey = window.getSiteKey('holcim_inductions');
                const inductions = JSON.parse(localStorage.getItem(indKey) || '[]');
                const idx = inductions.findIndex(i => i.idNumber === newEntry.idNumber);
                const indData = {
                    idNumber: newEntry.idNumber,
                    fullName: newEntry.fullName,
                    company: newEntry.company,
                    department: newEntry.department,
                    responsible: newEntry.responsible,
                    date: now.toISOString().split('T')[0],
                    expiry: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString().split('T')[0]
                };
                if (idx > -1) inductions[idx] = indData;
                else inductions.unshift(indData);
                localStorage.setItem(indKey, JSON.stringify(inductions));
            }

            logs.unshift(newEntry);
            localStorage.setItem(logsKey, JSON.stringify(logs));
            showNotification('REGISTRO EXITOSO', 'success');
            addLogEvent('ACCESO', 'Entrada: ' + newEntry.fullName);
            accessForm.reset(); renderMonitor(); updateCounters();
            if (document.getElementById('inductions-view').style.display !== 'none') renderInductions();
        });
    }

    window.registerExit = function (id) {
        const logsKey = window.getSiteKey('holcim_access_logs');
        const logs = JSON.parse(localStorage.getItem(logsKey));
        const entry = logs.find(l => l.id === id);
        if (entry) {
            entry.exitTime = new Date().toISOString();
            localStorage.setItem(logsKey, JSON.stringify(logs));
            showNotification('SALIDA REGISTRADA', 'info');
            addLogEvent('ACCESO', 'Salida: ' + entry.fullName);
            renderMonitor(); updateCounters(); renderReports();
        }
    };

    window.openEditEntry = function (id) {
        const logs = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_access_logs')));
        const entry = logs.find(l => l.id === id);
        if (entry) {
            document.getElementById('edit-entry-id').value = entry.id;
            document.getElementById('edit-fullname').value = entry.fullName;
            document.getElementById('edit-company').value = entry.company;
            document.getElementById('edit-badge').value = entry.badgeNumber;
            document.getElementById('edit-department').value = entry.department;
            document.getElementById('edit-responsible').value = entry.responsible || '';
            document.getElementById('edit-plate').value = entry.vehiclePlate || '';
            document.getElementById('edit-reason').value = entry.reason;
            document.getElementById('modal-edit-entry').style.display = 'flex';
        }
    };

    window.saveEntryEdit = function () {
        const id = parseInt(document.getElementById('edit-entry-id').value);
        const logKey = window.getSiteKey('holcim_access_logs');
        const logs = JSON.parse(localStorage.getItem(logKey));
        const entry = logs.find(l => l.id === id);
        if (entry) {
            const fields = {
                fullName: document.getElementById('edit-fullname').value.toUpperCase(),
                company: document.getElementById('edit-company').value.toUpperCase(),
                badgeNumber: document.getElementById('edit-badge').value.toUpperCase(),
                department: document.getElementById('edit-department').value,
                responsible: document.getElementById('edit-responsible').value.toUpperCase(),
                vehiclePlate: document.getElementById('edit-plate').value.toUpperCase(),
                reason: document.getElementById('edit-reason').value
            };
            let changed = false;
            for (const key in fields) {
                if (entry[key] !== fields[key]) {
                    addAuditLog('ACCESO', entry.id, key, entry[key], fields[key]);
                    entry[key] = fields[key]; changed = true;
                }
            }
            if (changed) {
                localStorage.setItem(logKey, JSON.stringify(logs));
                showNotification('CAMBIOS GUARDADOS', 'success');
            }
            document.getElementById('modal-edit-entry').style.display = 'none';
            renderMonitor(); renderReports();
        }
    };

    function populateMonitorCompanyFilter() {
        const sel = document.getElementById('filter-monitor-company');
        if (!sel) return;
        const logs = window.getSiteData('holcim_access_logs');
        const active = logs.filter(l => !l.exitTime);
        const companies = [...new Set(active.map(l => l.company).filter(Boolean))].sort();
        const currentVal = sel.value;
        sel.innerHTML = '<option value="ALL">TODAS LAS EMPRESAS</option>' +
            companies.map(c => `<option value="${c}">${c}</option>`).join('');
        if (companies.includes(currentVal)) sel.value = currentVal;
    }

    function renderMonitor() {
        const body = document.getElementById('monitor-list-body');
        if (!body) return;
        const logs = window.getSiteData('holcim_access_logs');
        const active = logs.filter(l => !l.exitTime);
        const search = (document.getElementById('monitor-search')?.value || '').toLowerCase();
        const cat = document.getElementById('filter-monitor-category')?.value || 'ALL';
        const company = document.getElementById('filter-monitor-company')?.value || 'ALL';
        const filtered = active.filter(l => {
            const name = (l.fullName || '').toLowerCase();
            const id = (l.idNumber || '');
            const matchesSearch = name.includes(search) || id.includes(search);
            const matchesCat = (cat === 'ALL' || l.visitorType === cat);
            const matchesCompany = (company === 'ALL' || l.company === company);
            return matchesSearch && matchesCat && matchesCompany;
        });
        document.getElementById('empty-state').style.display = filtered.length === 0 ? 'block' : 'none';

        body.innerHTML = filtered.map(l => {
            const entryDate = new Date(l.entryTime);
            const diffMs = Date.now() - entryDate.getTime();
            const diffHrs = Math.floor(diffMs / 3600000);
            const diffMins = Math.floor((diffMs % 3600000) / 60000);
            const permanencia = `${diffHrs}h ${diffMins}m`;

            return `
                <div class="list-row ${diffHrs >= 12 ? 'row-overtime' : ''}" style="grid-template-columns: 80px 1fr 80px 130px 130px 100px 120px 100px;">
                    <span class="col-gafete" style="cursor:pointer; color:var(--primary-teal); font-weight:800" onclick="openEditEntry(${l.id})">${l.badgeNumber || 'N/A'}</span>
                    <div class="col-person" onclick="openTraceability(${l.id}, '${l.fullName}')" style="cursor:pointer"><h4>${l.fullName}</h4><p>${l.idNumber} | ${l.company}</p></div>
                    <span style="font-size:0.75rem; font-weight:700; color:var(--red-holcim)">${l.vehiclePlate || '-'}</span>
                    <span style="font-size:0.75rem">${l.department}</span>
                    <span style="font-size:0.75rem">${l.responsible}</span>
                    <div><span class="badge-motivo">${l.reason}</span></div>
                    <div class="col-permanencia" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
                        <span style="font-size:0.8rem; font-weight:700;">${entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span class="badge-motivo" style="font-size:0.6rem; background:var(--navy-black); color:white; width:auto; padding:2px 6px;">${permanencia}</span>
                    </div>
                    <div><button class="btn-salida-corpo" onclick="registerExit(${l.id})">SALIDA</button></div>
                </div>
            `;
        }).join('');
    }

    ['monitor-search', 'filter-monitor-category'].forEach(id => document.getElementById(id)?.addEventListener('input', renderMonitor));

    // --- KEY CONTROL ---
    document.getElementById('key-number')?.addEventListener('input', function () {
        const keys = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_inventory_keys')) || '[]');
        const key = keys.find(k => k.num == this.value);
        const nameInput = document.getElementById('key-name');
        if (nameInput) {
            nameInput.value = key ? key.name : "Llave Desconocida";
            const alertBox = document.getElementById('key-security-alert');
            if (alertBox) {
                let html = '';
                if (key) {
                    if (key.securityAlert) {
                        html += `
                            <div class="pulsing-alert">
                                <i class="fas fa-triangle-exclamation"></i>
                                <span class="alert-title">ALERTA DE SEGURIDAD REQUERIDA</span>
                                <div class="alert-message">${key.securityAlert}</div>
                            </div>`;
                    }
                    if (key.status !== 'OPERATIVA' && key.status !== 'FUERA DE SERVICIO') {
                        html += `<div class="pulsing-alert" style="background:#fff1f2; border-color:#fda4af; color:#9f1239; animation-delay:0.5s;">
                                    <i class="fas fa-circle-exclamation" style="color:#e11d48; font-size:1.5rem;"></i>
                                    <span style="font-size:0.9rem; font-weight:900;">AVISO: LLAVE EN ESTADO ${key.status}</span>
                                 </div>`;
                    }
                }
                alertBox.innerHTML = html;
            }
        }
    });

    const keyForm = document.getElementById('key-loan-form');
    if (keyForm) {
        keyForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const num = document.getElementById('key-number').value;
            const keys = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_inventory_keys')) || '[]');
            const key = keys.find(k => k.num == num);
            if (key && key.status === 'RESTRINGIDA') {
                showNotification('LLAVE CON ACCESO RESTRINGIDO', 'danger');
                return;
            }
            const loansKey = window.getSiteKey('holcim_key_loans');
            const loans = JSON.parse(localStorage.getItem(loansKey) || '[]');
            const newL = { id: Date.now(), num: num, name: document.getElementById('key-name').value, requestor: document.getElementById('key-requestor').value.toUpperCase(), officer: document.getElementById('key-officer').value.toUpperCase(), loanTime: new Date().toISOString(), returnTime: null };
            loans.unshift(newL); localStorage.setItem(loansKey, JSON.stringify(loans));
            showNotification('LLAVE ENTREGADA', 'success'); addLogEvent('LLAVES', 'Prestó #' + newL.num);
            keyForm.reset(); renderKeyLoans();
        });
    }

    window.returnKey = function (id) {
        const klKey = window.getSiteKey('holcim_key_loans');
        const loans = JSON.parse(localStorage.getItem(klKey));
        const loan = loans.find(l => l.id === id);
        if (loan) { loan.returnTime = new Date().toISOString(); localStorage.setItem(klKey, JSON.stringify(loans)); renderKeyLoans(); showNotification('LLAVE DEVUELTA', 'info'); }
    };

    window.openKeyLoanEdit = function (id) {
        const loans = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_key_loans')) || '[]');
        const loan = loans.find(l => l.id === id);
        if (loan) {
            document.getElementById('edit-key-loan-id').value = loan.id;
            document.getElementById('edit-key-requestor').value = loan.requestor;
            document.getElementById('edit-key-officer').value = loan.officer;
            document.getElementById('edit-key-num').value = loan.num;
            document.getElementById('modal-edit-key-loan').style.display = 'flex';
        }
    };

    window.saveKeyLoanEdit = function () {
        const id = parseInt(document.getElementById('edit-key-loan-id').value);
        const klk = window.getSiteKey('holcim_key_loans');
        const loans = JSON.parse(localStorage.getItem(klk) || '[]');
        const loan = loans.find(l => l.id === id);
        if (loan) {
            const keys = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_inventory_keys')) || '[]');
            const newNum = parseInt(document.getElementById('edit-key-num').value);
            const keyInfo = keys.find(k => k.num === newNum);

            const fields = {
                requestor: document.getElementById('edit-key-requestor').value.toUpperCase(),
                officer: document.getElementById('edit-key-officer').value.toUpperCase(),
                num: newNum,
                name: keyInfo ? keyInfo.name : "Llave Desconocida"
            };
            let changed = false;
            for (const key in fields) {
                if (loan[key] !== fields[key]) {
                    addAuditLog('LLAVES', loan.id, key, loan[key], fields[key]);
                    loan[key] = fields[key]; changed = true;
                }
            }
            if (changed) {
                localStorage.setItem(klk, JSON.stringify(loans));
                showNotification('DETALLES DE PRÉSTAMO ACTUALIZADOS', 'success');
            }
            document.getElementById('modal-edit-key-loan').style.display = 'none';
            renderKeyLoans();
        }
    };

    function renderKeyLoans() {
        const body = document.getElementById('key-list-body'); if (!body) return;
        const loans = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_key_loans')) || '[]');
        body.innerHTML = loans.filter(l => !l.returnTime).map(l => `
            <div class="list-row" style="grid-template-columns: 80px 100px 1fr 1fr 1fr 120px;">
                <span style="font-weight:900; cursor:pointer; color:var(--primary-teal)" onclick="openKeyLoanEdit(${l.id})">#${l.num}</span><span>${new Date(l.loanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span style="font-weight:700;font-size:0.8rem">${l.name}</span><span style="font-size:0.8rem">${l.requestor}</span><span style="font-size:0.8rem">${l.officer}</span>
                <div><button class="btn-salida-corpo" onclick="returnKey(${l.id})">DEVOLVER</button></div>
            </div>
        `).join('');
        const hist = document.getElementById('key-history-body');
        if (hist) hist.innerHTML = loans.slice(0, 20).map(l => `
            <div class="list-row" style="grid-template-columns: 60px 1fr 1fr 1fr 125px 125px 90px;font-size:0.75rem">
                <strong style="cursor:pointer; color:var(--primary-teal)" onclick="openKeyLoanEdit(${l.id})">#${l.num}</strong><span>${l.name}</span><span>${l.requestor}</span><span>${l.officer}</span>
                <span>${new Date(l.loanTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                <span>${l.returnTime ? new Date(l.returnTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}</span>
                <div><span class="induction-status ${l.returnTime ? 'status-active' : 'status-missing'}" onclick="openTraceability(${l.id}, '${l.name}')" style="cursor:pointer">${l.returnTime ? 'DEVUELTO' : 'ACTIVO'}</span></div>
            </div>
        `).join('');
    }

    // --- CONSOLIDADO CONTRATISTAS ---
    window.renderMonthlyContractorConsolidated = function () {
        const logs = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_access_logs')) || '[]');
        const contractors = logs.filter(l => l.visitorType === 'CONTRATISTA' && l.exitTime);
        const summary = {};
        contractors.forEach(l => {
            const date = new Date(l.entryTime);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            if (!summary[key]) summary[key] = { month: date.toLocaleString('es-ES', { month: 'long', year: 'numeric' }), hours: 0, count: 0 };
            const h = (new Date(l.exitTime) - date) / 3600000;
            summary[key].hours += h;
            summary[key].count += 1;
        });
        const body = document.getElementById('contractor-consolidated-body');
        if (body) {
            body.innerHTML = `
                <div class="list-head" style="grid-template-columns: 1fr 150px 100px;">
                    <span>Mes</span><span>Horas Totales</span><span>Registros</span>
                </div>
            ` + Object.values(summary).map(s => `
                <div class="list-row" style="grid-template-columns: 1fr 150px 100px;">
                    <span style="text-transform:capitalize; font-weight:700">${s.month}</span>
                    <span style="font-weight:700; color:var(--primary-teal)">${s.hours.toFixed(1)}h</span>
                    <span>${s.count}</span>
                </div>
            `).join('');
        }
        document.getElementById('modal-contractor-hours').style.display = 'flex';
        document.getElementById('contractor-report-month').textContent = 'Acumulado Total Histórico';
    };

    // --- REPORTS & PDF ---
    window.printReport = function () {
        window.print();
    };

    window.exportData = function (format) {
        const logs = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_access_logs')) || '[]');
        if (logs.length === 0) return showNotification('NO HAY DATOS PARA EXPORTAR', 'danger');

        const sorted = [...logs].sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime));
        const siteName = getSession()?.site || 'HOLCIM';

        if (format === 'xlsx') {
            const title = `REPORTE DE ACCESO - ${siteName}`;
            const date = new Date().toLocaleString();

            let html = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                <head><meta charset="utf-8"/><style>
                    .title { font-size: 18pt; font-weight: bold; color: #DC2626; text-align: center; }
                    .header { background-color: #1e293b; color: white; font-weight: bold; border: 1px solid #000; }
                    .cell { border: 1px solid #ccc; }
                    .row-even { background-color: #f8fafc; }
                </style></head>
                <body>
                    <table>
                        <tr><td colspan="11" class="title">${title}</td></tr>
                        <tr><td colspan="11" style="text-align:right">Generado: ${date}</td></tr>
                        <tr><td></td></tr>
                        <tr class="header">
                            <th>CEDULA</th><th>NOMBRE</th><th>TIPO</th><th>EMPRESA</th><th>DEPTO</th>
                            <th>RESPONSABLE</th><th>MOTIVO</th><th>PLACA</th><th>INGRESO</th><th>SALIDA</th><th>PERMANENCIA</th>
                        </tr>
            `;

            sorted.forEach((l, i) => {
                const start = new Date(l.entryTime);
                const end = l.exitTime ? new Date(l.exitTime) : new Date();
                const diff = Math.floor((end - start) / 60000);
                const h = Math.floor(diff / 60);
                const m = diff % 60;
                const dur = `${h}h ${m}m`;

                html += `
                    <tr class="${i % 2 === 0 ? 'row-even' : ''}">
                        <td class="cell">${l.idNumber}</td>
                        <td class="cell">${l.fullName}</td>
                        <td class="cell">${l.visitorType}</td>
                        <td class="cell">${l.company}</td>
                        <td class="cell">${l.department}</td>
                        <td class="cell">${l.responsible}</td>
                        <td class="cell">${l.reason}</td>
                        <td class="cell">${l.vehiclePlate || '-'}</td>
                        <td class="cell">${start.toLocaleString()}</td>
                        <td class="cell">${l.exitTime ? end.toLocaleString() : 'En Planta'}</td>
                        <td class="cell">${dur}</td>
                    </tr>
                `;
            });

            html += `</table></body></html>`;

            const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `Reporte_Acceso_${siteName}_${new Date().toISOString().split('T')[0]}.xls`;
            a.click();
        } else { window.print(); }
    };

    function renderReports() {
        const body = document.getElementById('report-list-body'); if (!body) return;
        const logs = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_access_logs')) || '[]');
        const search = (document.getElementById('report-search')?.value || '').toLowerCase();
        const start = document.getElementById('filter-date-start')?.value;
        const end = document.getElementById('filter-date-end')?.value;
        const type = document.getElementById('filter-visitor-type')?.value || 'ALL';

        const filtered = logs.filter(l => {
            const matchesSearch = l.fullName.toLowerCase().includes(search) || l.idNumber.includes(search) || l.company.toLowerCase().includes(search);
            const matchesType = type === 'ALL' || l.visitorType === type;
            const logDate = l.entryTime.split('T')[0];
            const matchesDate = (!start || logDate >= start) && (!end || logDate <= end);
            return matchesSearch && matchesType && matchesDate;
        });

        body.innerHTML = filtered.slice(0, 100).map(l => `
            <div class="list-row" style="grid-template-columns: 140px 1fr 140px 140px 110px 110px 130px;">
                <div style="font-size:0.75rem; cursor:pointer; color:var(--primary-teal)" onclick="openEditEntry(${l.id})"><strong>${new Date(l.entryTime).toLocaleDateString()}</strong><br/>ID: ${l.idNumber}</div>
                <div class="col-person" onclick="openTraceability(${l.id}, '${l.fullName}')" style="pointer-events: auto; cursor:pointer"><h4>${l.fullName}</h4></div>
                <span style="font-size:0.8rem">${l.company}</span><span style="font-size:0.8rem">${l.responsible}</span>
                <span style="font-size:0.8rem">${new Date(l.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span style="font-size:0.8rem">${l.exitTime ? new Date(l.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                <div><span class="induction-status ${l.exitTime ? 'status-active' : 'status-expired'}">${l.exitTime ? 'COMPLETO' : 'PLANTA'}</span></div>
            </div>
        `).join('');
    }

    ['report-search', 'filter-date-start', 'filter-date-end', 'filter-visitor-type'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', renderReports);
    });
    ['monitor-search', 'filter-monitor-category', 'filter-monitor-company'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', renderMonitor);
    });
    ['induction-search', 'ind-date-start', 'ind-date-end', 'filter-ind-status'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', renderInductions);
    });

    // Helper to force data reload if stuck
    window.resetSystemData = function () {
        if (confirm('¿Reiniciar configuración del sistema? (Los registros se mantendrán, solo se actualizan permisos y usuarios)')) {
            localStorage.removeItem('holcim_users');
            window.location.reload();
        }
    };

    // --- TRAZABILIDAD ---
    window.openTraceability = function (id, name) {
        const audit = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_audit_log')) || '[]');
        const filtered = audit.filter(a => String(a.recordId) === String(id));
        document.getElementById('trace-record-id').textContent = 'ID: ' + id;
        document.getElementById('trace-record-name').textContent = 'Personal: ' + name;
        const body = document.getElementById('traceability-list-body');
        if (body) {
            if (filtered.length === 0) body.innerHTML = '<div style="padding:2rem;text-align:center;grid-column:1/-1">No hay cambios registrados en este objeto.</div>';
            else {
                body.innerHTML = filtered.map(a => `
                    <div class="list-row" style="grid-template-columns: 140px 140px 100px 1fr 1fr; border-bottom: 1px solid #eee; padding: 10px 0; font-size:0.75rem">
                        <span>${a.timestamp}</span>
                        <strong style="font-size:0.7rem">${a.user.split('@')[0]}</strong>
                        <span class="badge-motivo" style="font-size:0.6rem">${a.field}</span>
                        <span style="color:var(--red-holcim)">${a.oldValue}</span>
                        <span style="color:var(--primary-teal)">${a.newValue}</span>
                    </div>
                `).join('');
            }
        }
        document.getElementById('modal-traceability').style.display = 'flex';
    };

    window.closeTraceabilityModal = () => document.getElementById('modal-traceability').style.display = 'none';

    function updateOfficersDatalist() {
        const list = document.getElementById('officers-list');
        if (list) {
            const officers = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_security_officers')) || '[]');
            list.innerHTML = officers.map(o => `<option value="${o.name}">`).join('');
        }
        // Also sync the package module dropdown if it exists
        if (typeof window.populatePackageOfficers === 'function') {
            window.populatePackageOfficers();
        }
    }

    // --- SECURITY OFFICERS DB ---
    window.renderDbOfficers = function () {
        updateOfficersDatalist();
        const body = document.getElementById('db-officer-list-body');
        if (!body) return;
        const officers = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_security_officers')) || '[]');
        body.innerHTML = officers.map(o => `
            <div class="list-row" style="grid-template-columns: 1fr 1fr 150px; font-size: 0.85rem;">
                <strong>${o.name}</strong>
                <span>${o.company}</span>
                <div style="display:flex;gap:4px;">
                    <button class="btn-salida-corpo" style="background:var(--primary-teal); color:white; border-color:var(--primary-teal);" onclick="openEditDbOfficer(${o.id})"><i class="fas fa-pen"></i></button>
                    <button class="btn-salida-corpo" style="background:#ef4444; color:white; border-color:#ef4444;" onclick="deleteOfficer(${o.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('') || '<div style="padding:1rem; text-align:center; color:var(--text-muted);">No hay oficiales registrados.</div>';
    };

    const officerForm = document.getElementById('db-officer-form');
    if (officerForm) {
        officerForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const offKey = window.getSiteKey('holcim_security_officers');
            const officers = JSON.parse(localStorage.getItem(offKey) || '[]');
            const newO = {
                id: Date.now(),
                name: document.getElementById('db-officer-name').value.trim().toUpperCase(),
                company: document.getElementById('db-officer-company').value.trim().toUpperCase()
            };
            officers.unshift(newO);
            localStorage.setItem(offKey, JSON.stringify(officers));
            showNotification('OFICIAL REGISTRADO', 'success');
            officerForm.reset(); renderDbOfficers();
        });
    }

    window.deleteOfficer = function (id) {
        if (!confirm('¿Eliminar este oficial?')) return;
        const offKey2 = window.getSiteKey('holcim_security_officers');
        let officers = JSON.parse(localStorage.getItem(offKey2) || '[]');
        officers = officers.filter(o => o.id !== id);
        localStorage.setItem(offKey2, JSON.stringify(officers));
        renderDbOfficers();
    };

    // --- CONTACT DIRECTORY (DB & DASHBOARD) ---
    function renderDbContacts() {
        const body = document.getElementById('db-contact-list-body');
        if (!body) return;
        const contacts = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_contact_directory')) || '[]');
        body.innerHTML = contacts.map(c => `
            <div class="list-row" style="grid-template-columns: 1fr 120px 120px 100px 160px;">
                <strong style="color:var(--primary-teal)">${c.name}</strong>
                <span class="badge-motivo" style="font-size:0.65rem">${c.dept}</span>
                <span style="font-weight:700">${c.phone}</span>
                <span style="color:#d946ef; font-weight:800">${c.radio || '-'}</span>
                <div style="display:flex;gap:4px;">
                    <button class="btn-salida-corpo" onclick="openEditDbContact(${c.id})" style="padding:2px 8px; font-size:0.7rem; background:var(--primary-teal); color:white; border-color:var(--primary-teal);"><i class="fas fa-pen"></i></button>
                    <button class="btn-salida-corpo" onclick="deleteDbContact(${c.id})" style="padding:2px 8px; font-size:0.7rem">BORRAR</button>
                </div>
            </div>
        `).join('');
    }

    const dbContactForm = document.getElementById('db-contact-form');
    if (dbContactForm) {
        dbContactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = document.getElementById('db-contact-name').value.toUpperCase();
            const dept = document.getElementById('db-contact-dept').value;
            const phone = document.getElementById('db-contact-phone').value;
            const radio = document.getElementById('db-contact-radio').value.toUpperCase();

            const ck = window.getSiteKey('holcim_contact_directory');
            let contacts = JSON.parse(localStorage.getItem(ck) || '[]');
            contacts.unshift({ id: Date.now(), name, dept, phone, radio });
            localStorage.setItem(ck, JSON.stringify(contacts));
            showNotification('CONTACTO REGISTRADO', 'success');
            dbContactForm.reset(); renderDbContacts();
        });
    }

    window.deleteDbContact = function (id) {
        if (!confirm('¿Eliminar este contacto?')) return;
        const ck2 = window.getSiteKey('holcim_contact_directory');
        let contacts = JSON.parse(localStorage.getItem(ck2) || '[]');
        contacts = contacts.filter(c => c.id !== id);
        localStorage.setItem(ck2, JSON.stringify(contacts));
        renderDbContacts();
    };

    window.openEmergencyDirectory = function () {
        document.getElementById('modal-emergency-dir').style.display = 'flex';
        renderEmergencyDirectory();
    };

    window.closeEmergencyDirectory = function () {
        document.getElementById('modal-emergency-dir').style.display = 'none';
    };

    function renderEmergencyDirectory() {
        const body = document.getElementById('emergency-dir-body');
        if (!body) return;
        const contacts = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_contact_directory')) || '[]');
        const search = (document.getElementById('emergency-dir-search')?.value || '').toLowerCase();

        const filtered = contacts.filter(c => c.name.toLowerCase().includes(search) || c.dept.toLowerCase().includes(search));

        if (filtered.length === 0) {
            body.innerHTML = `<div style="padding:2rem; text-align:center; color:var(--text-muted);">Sin resultados.</div>`;
            return;
        }

        body.innerHTML = filtered.map(c => `
            <div class="list-row" style="grid-template-columns: 1fr 120px 120px 100px;">
                <strong>${c.name}</strong>
                <span class="badge-motivo" style="font-size:0.65rem">${c.dept}</span>
                <span style="font-weight:700; color:var(--primary-teal)">${c.phone}</span>
                <span style="color:#d946ef; font-weight:800">${c.radio || '-'}</span>
            </div>
        `).join('');
    }

    document.getElementById('emergency-dir-search')?.addEventListener('input', renderEmergencyDirectory);

    // Modal Closers

    function renderUserList() {
        const body = document.getElementById('user-list-body'); if (!body) return;
        const users = JSON.parse(localStorage.getItem('holcim_users') || '[]');
        body.innerHTML = users.map(u => `
            <div class="list-row" style="grid-template-columns: 1fr 1fr 120px;">
                <div><strong>${u.email}</strong><p style="font-size:0.7rem">${u.site}</p></div>
                <div style="display:flex;gap:4px;flex-wrap:wrap">
                    ${u.permissions.map(p => `<span class="badge-motivo" style="font-size:0.6rem">${p}</span>`).join('')}
                </div>
                <div><button class="btn-salida-corpo" onclick="deleteUser('${u.email}')">ELIMINAR</button></div>
            </div>`).join('');
    }

    window.deleteUser = function (email) {
        if (email === MASTER_ADMIN_EMAIL) return showNotification('NO SE PUEDE ELIMINAR EL ADMINISTRADOR MAESTRO', 'danger');
        if (!confirm('¿Eliminar cuenta de ' + email + '?')) return;
        let users = JSON.parse(localStorage.getItem('holcim_users'));
        users = users.filter(u => u.email !== email);
        localStorage.setItem('holcim_users', JSON.stringify(users));
        showNotification('USUARIO ELIMINADO', 'info');
        renderUserList();
    };

    const userForm = document.getElementById('user-form');
    if (userForm) {
        userForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const email = document.getElementById('user-email').value.trim();
            const pass = document.getElementById('user-pass').value;
            const site = document.getElementById('user-site').value.trim().toUpperCase();
            const perms = Array.from(document.querySelectorAll('input[name="perm"]:checked')).map(i => i.value);

            let users = JSON.parse(localStorage.getItem('holcim_users') || '[]');
            if (users.find(u => u.email === email)) return showNotification('ESTE CORREO YA ESTÁ REGISTRADO', 'danger');

            users.push({ email, pass, site, permissions: perms });
            localStorage.setItem('holcim_users', JSON.stringify(users));
            showNotification('USUARIO CREADO EXITOSAMENTE', 'success');
            addLogEvent('SISTEMA', 'Nuevo usuario: ' + email);
            userForm.reset(); renderUserList();
        });
    }

    const profileForm = document.getElementById('my-profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const session = getSession();
            if (!session) return;

            const site = document.getElementById('my-site').value.trim().toUpperCase();
            const newPass = document.getElementById('my-new-pass').value;

            let users = JSON.parse(localStorage.getItem('holcim_users'));
            const idx = users.findIndex(u => u.email === session.email);
            if (idx > -1) {
                users[idx].site = site;
                if (newPass) users[idx].pass = newPass;
                localStorage.setItem('holcim_users', JSON.stringify(users));
                setSession(users[idx]);
                showNotification('PERFIL ACTUALIZADO', 'success');
                addLogEvent('SISTEMA', 'Perfil actualizado');
                window.location.reload();
            }
        });
    }

    function renderLiveLog() {
        const body = document.getElementById('live-event-log'); if (!body) return;
        const log = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_event_log')) || '[]');
        const filterModule = document.getElementById('log-filter-module')?.value || 'ALL';

        const filtered = log.filter(e => filterModule === 'ALL' || e.module === filterModule);

        // Icon map for modules
        const icons = {
            'ACCESO': 'fa-door-open',
            'LLAVES': 'fa-key',
            'PAQUETERIA': 'fa-box',
            'SISTEMA': 'fa-cog',
            'AUTORIZACIÓN': 'fa-file-contract',
            'DB': 'fa-database'
        };

        const colors = {
            'ACCESO': '#0284c7', // Sky blue
            'LLAVES': '#f59e0b', // Amber
            'PAQUETERIA': '#10b981', // Emerald
            'SISTEMA': '#64748b', // Slate
            'AUTORIZACIÓN': '#ef4444', // Red
            'DB': '#8b5cf6' // Violet
        };

        if (filtered.length === 0) {
            body.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No hay eventos que coincidan.</div>`;
            return;
        }

        body.innerHTML = filtered.map(e => `
            <div class="list-row" style="grid-template-columns: 140px 100px 100px 1fr; font-size: 0.8rem; border-left: 4px solid ${colors[e.module] || '#ccc'}; margin-bottom: 2px; background: rgba(248, 250, 252, 0.5);">
                <span style="color: #64748b;">${e.timestamp}</span>
                <strong style="color: var(--navy-black);">${e.user}</strong>
                <div>
                    <span class="badge-motivo" style="display: flex; align-items: center; gap: 5px; background: ${colors[e.module] || '#ccc'}15; color: ${colors[e.module] || '#333'};">
                        <i class="fas ${icons[e.module] || 'fa-info-circle'}"></i> ${e.module}
                    </span>
                </div>
                <span style="font-weight: 500;">${e.description}</span>
            </div>
        `).join('');
    }

    document.getElementById('log-filter-module')?.addEventListener('change', renderLiveLog);

    function renderDbBadges() {
        const body = document.getElementById('db-badge-list-body');
        if (!body) return;
        const badges = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_badge_inventory')) || '[]');
        body.innerHTML = badges.sort((a, b) => a.num.localeCompare(b.num)).map(b => `
            <div class="list-row" style="grid-template-columns: 100px 120px 1fr 160px;">
                <strong>#${b.num}</strong>
                <span>${b.code}</span>
                <span style="font-size:0.8rem; color:var(--text-muted)">${b.alert || '-'}</span>
                <div style="display:flex;gap:4px;">
                    <button class="btn-salida-corpo" onclick="openEditDbBadge('${b.num}')" style="padding:2px 8px; font-size:0.7rem; background:var(--primary-teal); color:white; border-color:var(--primary-teal);"><i class="fas fa-pen"></i></button>
                    <button class="btn-salida-corpo" onclick="deleteDbBadge('${b.num}')">ELIMINAR</button>
                </div>
            </div>
        `).join('');
    }

    const badgeForm = document.getElementById('db-badge-form');
    if (badgeForm) {
        badgeForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const num = document.getElementById('db-badge-num').value.trim().toUpperCase();
            const code = document.getElementById('db-badge-code').value.trim().toUpperCase();
            const alert = document.getElementById('db-badge-alert').value.trim();

            const key = window.getSiteKey('holcim_badge_inventory');
            const badges = JSON.parse(localStorage.getItem(key) || '[]');
            if (badges.find(b => b.num === num)) return showNotification('ESTE NÚMERO DE CARNET YA EXISTE', 'danger');

            badges.push({ num, code, alert });
            localStorage.setItem(key, JSON.stringify(badges));
            showNotification('CARNET REGISTRADO', 'success');
            badgeForm.reset(); renderDbBadges(); updateBadgeDropdown();
        });
    }

    window.deleteDbBadge = function (num) {
        if (!confirm('¿Eliminar carnet #' + num + '?')) return;
        const key = window.getSiteKey('holcim_badge_inventory');
        let badges = JSON.parse(localStorage.getItem(key));
        badges = badges.filter(b => b.num !== num);
        localStorage.setItem(key, JSON.stringify(badges));
        showNotification('CARNET ELIMINADO', 'info');
        renderDbBadges(); updateBadgeDropdown();
    };

    window.updateBadgeDropdown = function () {
        const selects = [document.getElementById('badgeNumber'), document.getElementById('edit-badge')];
        const badges = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_badge_inventory')) || '[]');

        selects.forEach(sel => {
            if (!sel) return;
            const currentVal = sel.value;
            sel.innerHTML = '<option value="">Seleccione Gafete...</option>' +
                badges.map(b => `<option value="${b.num}">${b.num} ${b.alert ? '⚠️' : ''}</option>`).join('');
            if (currentVal && badges.find(b => b.num === currentVal)) sel.value = currentVal;
        });
    }

    window.renderDbCCTV = function () {
        const body = document.getElementById('db-cctv-list-body');
        if (!body) return;
        const items = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_cctv_inventory')) || '[]');
        body.innerHTML = items.map(item => `
            <div class="list-row" style="grid-template-columns: 100px 100px 90px 1fr 100px 140px 100px 60px 185px;">
                <span style="font-weight:700; font-size:0.75rem;">${item.type}</span>
                <span style="font-weight:700; color:var(--navy-black);">${item.brand || '-'}</span>
                <span style="font-family:monospace; color:var(--primary-teal);">${item.ip}</span>
                <span>${item.location}</span>
                <span class="badge-motivo" style="color:white; background:${item.status === 'OPERATIVO' ? '#059669' : item.status === 'FALLA' ? 'var(--red-holcim)' : '#64748b'}">${item.status}</span>
                <div style="font-size:0.65rem; line-height:1.2;">
                    <strong>${Array.isArray(item.analyticsType) ? item.analyticsType.join(', ') : (item.analyticsType || '-')}</strong><br/>
                    <span style="color:var(--text-muted)">${item.analyticsSchedule || '-'}</span>
                </div>
                <span style="font-size:0.75rem; color:var(--text-muted)">${item.observation || '-'}</span>
                <div>${item.photo ? `<button class="btn-salida-corpo" style="padding: 2px 6px; font-size: 0.6rem;" onclick="viewCctvPhoto('${item.photo}')">VER</button>` : '-'}</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                    <button class="btn-salida-corpo" onclick="openEditDbCCTV('${item.id}')" style="padding:2px 6px; font-size:0.6rem; background:var(--primary-teal); color:white; border-color:var(--primary-teal);"><i class="fas fa-pen"></i></button>
                    <button class="btn-salida-corpo" onclick="window.pinToMap('holcim_cctv_inventory','${item.id}')" style="padding:2px 6px; font-size:0.6rem; background:#4f46e5; color:white; border-color:#4f46e5;" title="Posicionar en Mapa"><i class="fas fa-map-pin"></i></button>
                    <button class="btn-salida-corpo" onclick="deleteDbCCTV('${item.id}')">DEL</button>
                </div>
            </div>
        `).join('');
        // Also refresh map if already initialized
        if (window.cctvLayer) renderCctvMarkers();
    };

    const cctvForm = document.getElementById('db-cctv-form');
    if (cctvForm) {
        cctvForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const photoInput = document.getElementById('db-cctv-photo');
            let photoBase64 = null;
            if (photoInput.files && photoInput.files[0]) {
                photoBase64 = await toBase64(photoInput.files[0]);
            }

            const perms = Array.from(document.querySelectorAll('input[name="cctv-analytics"]:checked')).map(i => i.value);

            const newItem = {
                id: Date.now().toString(),
                type: document.getElementById('db-cctv-type').value,
                brand: document.getElementById('db-cctv-brand').value.trim().toUpperCase(),
                ip: document.getElementById('db-cctv-ip').value.trim(),
                location: document.getElementById('db-cctv-location').value.trim().toUpperCase(),
                status: document.getElementById('db-cctv-status').value,
                observation: document.getElementById('db-cctv-obs').value.trim(),
                lat: document.getElementById('db-cctv-lat').value ? parseFloat(document.getElementById('db-cctv-lat').value) : null,
                lng: document.getElementById('db-cctv-lng').value ? parseFloat(document.getElementById('db-cctv-lng').value) : null,
                analyticsType: perms,
                analyticsSchedule: document.getElementById('db-cctv-analytics-schedule').value.trim(),
                photo: photoBase64
            };

            const key = window.getSiteKey('holcim_cctv_inventory');
            const items = JSON.parse(localStorage.getItem(key) || '[]');
            items.push(newItem);
            localStorage.setItem(key, JSON.stringify(items));
            showNotification('SISTEMA CCTV REGISTRADO', 'success');
            cctvForm.reset(); renderDbCCTV();
        });
    }

    window.deleteDbCCTV = function (id) {
        if (!confirm('¿Eliminar este registro de CCTV?')) return;
        const key = window.getSiteKey('holcim_cctv_inventory');
        let items = JSON.parse(localStorage.getItem(key));
        items = items.filter(i => i.id !== id);
        localStorage.setItem(key, JSON.stringify(items));
        showNotification('REGISTRO ELIMINADO', 'info');
        renderDbCCTV();
    };

    // --- CCTV MONITORING LOGIC ---
    window.renderCctvMonitoring = function () {
        // By default show daily review and ensure it's rendered
        renderDailyCctvChecklist();
        renderVirtualRoundsList();
        renderCctvHistory();
    };

    window.switchCctvMonTab = function (tabId, btn) {
        document.querySelectorAll('.mon-tab-content').forEach(t => t.style.display = 'none');
        const targetTab = document.getElementById(tabId + '-tab');
        if (targetTab) targetTab.style.display = 'block';

        document.querySelectorAll('.security-hub-tab-btn, .db-tab-btn').forEach(b => {
            if (b.onclick && b.onclick.toString().includes('switchCctvMonTab')) {
                b.classList.remove('active');
                b.style.background = '#64748b';
            }
        });

        btn.classList.add('active');
        btn.style.background = 'var(--primary-teal)';

        if (tabId === 'mon-daily') renderDailyCctvChecklist();
        if (tabId === 'mon-rounds') renderVirtualRoundsList();
        if (tabId === 'mon-history') renderCctvHistory();
    };

    window.switchSecurityTab = function (tabId, btn) {
        document.querySelectorAll('.security-hub-content').forEach(t => t.style.display = 'none');
        const targetTab = document.getElementById(tabId + '-tab');
        if (targetTab) targetTab.style.display = 'block';

        document.querySelectorAll('.security-hub-tab').forEach(b => {
            b.classList.remove('active');
            b.style.background = '#64748b';
        });

        btn.classList.add('active');
        btn.style.background = 'var(--navy-black)';

        if (tabId === 'sec-cctv') renderCctvMonitoring();
        if (tabId === 'sec-portones') renderAccessPointsChecklist();
        if (tabId === 'sec-zones') {
            initSecurityZonesMap();
            renderZoneMiniHistory();
        }
    };

    window.renderAccessPointsChecklist = function () {
        const container = document.getElementById('portones-checklist-container');
        if (!container) return;
        const items = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_access_points')) || '[]');

        if (items.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i class="fas fa-door-open" style="font-size: 3rem; opacity: 0.3; display: block; margin-bottom: 1rem;"></i>
                    <p>No hay puntos de acceso registrados en la base de datos.</p>
                    <p style="font-size: 0.8rem;">Agrega puntos de acceso en la sección <strong>Base de Datos -> Puntos de Acceso</strong>.</p>
                </div>`;
            return;
        }

        window.renderAccessPointsChecklist = function () {
            const container = document.getElementById('portones-checklist-container');
            if (!container) return;
            const items = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_access_points')) || '[]');
            const reviews = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_ap_daily_reviews')) || '[]');
            const today = new Date().toISOString().split('T')[0];

            if (items.length === 0) {
                container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i class="fas fa-door-open" style="font-size: 3rem; opacity: 0.3; display: block; margin-bottom: 1rem;"></i>
                    <p>No hay puntos de acceso registrados.</p>
                </div>`;
                return;
            }

            container.innerHTML = items.map(ap => {
                const lastReview = reviews.find(r => r.apId === ap.id && r.date === today);
                const isDone = !!lastReview;

                return `
            <div class="checklist-item-premium ${isDone ? 'checklist-item-completed' : ''}" data-ap-id="${ap.id}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div class="checklist-title-premium">${ap.name} ${isDone ? '<span class="badge-completed">REVISADO</span>' : ''}</div>
                        <div class="checklist-subtitle-premium"><i class="fas fa-location-dot"></i> ${ap.location}</div>
                    </div>
                    ${ap.lat && ap.lng
                        ? `<button class="btn-salida-corpo" onclick="panToAP(${ap.lat}, ${ap.lng})" style="padding:2px 8px; font-size:0.6rem; background:var(--primary-teal); color:white; border:none; margin:0;"><i class="fas fa-location-dot"></i> MAPA</button>`
                        : `<button class="btn-salida-corpo" onclick="window.pinToMap('holcim_access_points','${ap.id}')" style="padding:2px 8px; font-size:0.6rem; background:#4f46e5; color:white; border:none; margin:0;" title="Posicionar en Mapa"><i class="fas fa-map-pin"></i> PINCHAR</button>`
                    }
                </div>

                <div class="checklist-grid-premium" style="grid-template-columns: 1fr 1fr;">
                    <div class="check-group-premium">
                        <label>Estado Operativo</label>
                        <select class="check-status" ${isDone ? 'disabled' : ''}>
                            <option value="OPERATIVO" ${isDone && lastReview.status === 'OPERATIVO' ? 'selected' : ''}>OPERATIVO</option>
                            <option value="FALLA" ${isDone && lastReview.status === 'FALLA' ? 'selected' : ''}>FALLA</option>
                            <option value="MANTENIMIENTO" ${isDone && lastReview.status === 'MANTENIMIENTO' ? 'selected' : ''}>MANTENIMIENTO</option>
                        </select>
                    </div>
                </div>

                <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr auto; gap: 15px; align-items: flex-end;">
                    <div class="check-group-premium">
                        <label>Observación</label>
                        <input type="text" class="check-obs" value="${isDone ? lastReview.obs : ''}" placeholder="Escriba novedad..." ${isDone ? 'disabled' : ''} style="width:100%;">
                    </div>
                    ${!isDone ? `<button class="btn-submit-action" onclick="saveAccessPointReview('${ap.id}')" style="margin:0; height:36px; padding:0 15px; background:var(--primary-teal);"><i class="fas fa-save"></i> GUARDAR</button>` : ''}
                </div>
            </div>`;
            }).join('');

            updateAccessPointsStats();
            renderAccessPointsHistory();
        };

        window.saveAccessPointReview = function (apId) {
            const item = document.querySelector(`.checklist-item-premium[data-ap-id="${apId}"]`);
            const reviews = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_ap_daily_reviews')) || '[]');
            const today = new Date().toISOString().split('T')[0];

            const review = {
                apId: apId,
                date: today,
                status: item.querySelector('.check-status').value,
                obs: item.querySelector('.check-obs').value,
                timestamp: new Date().toLocaleString()
            };

            reviews.push(review);
            localStorage.setItem(window.getSiteKey('holcim_ap_daily_reviews'), JSON.stringify(reviews));

            showToast('Registro de Punto de Acceso guardado correctamente', 'success');
            renderAccessPointsChecklist();
        };

        updateAccessPointsStats();
        renderAccessPointsHistory();
    };

    window.updateAccessPointsStats = function () {
        const items = document.querySelectorAll('#portones-checklist-container .checklist-item');
        let ok = 0, fail = 0, maint = 0;

        items.forEach(item => {
            const status = item.querySelector('.check-status').value;
            if (status === 'OPERATIVO') ok++;
            else if (status === 'FALLA') fail++;
            else if (status === 'MANTENIMIENTO') maint++;
        });

        const elOk = document.getElementById('portones-stat-ok');
        const elFail = document.getElementById('portones-stat-fail');
        const elMaint = document.getElementById('portones-stat-maint');
        const elTotal = document.getElementById('portones-stat-total');

        if (elOk) elOk.textContent = ok;
        if (elFail) elFail.textContent = fail;
        if (elMaint) elMaint.textContent = maint;
        if (elTotal) elTotal.textContent = items.length;
    };

    window.saveAccessPointReview = async function () {
        const items = document.querySelectorAll('#portones-checklist-container .checklist-item');
        const user = getSession();
        const reviewData = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            user: user.email,
            officer: document.getElementById('portones-officer').value.trim() || user.username || 'Sistema',
            generalObs: document.getElementById('portones-obs').value.trim(),
            reviews: []
        };

        if (items.length === 0) return showNotification('NO HAY PUNTOS PARA EVALUAR', 'warning');

        items.forEach(item => {
            const apId = item.getAttribute('data-ap-id');
            reviewData.reviews.push({
                apId: apId,
                status: item.querySelector('.check-status').value,
                obs: item.querySelector('.check-obs').value.trim()
            });
        });

        const key = window.getSiteKey('holcim_access_points_reviews');
        const reviews = JSON.parse(localStorage.getItem(key) || '[]');
        reviews.unshift(reviewData);
        localStorage.setItem(key, JSON.stringify(reviews.slice(0, 100))); // Keep last 100

        showNotification('REVISIÓN DE PUNTOS DE ACCESO GUARDADA', 'success');
        addLogEvent('SISTEMA', 'Revisión de puntos de acceso completada');

        // Reset form
        document.getElementById('portones-obs').value = '';
        renderAccessPointsChecklist();
    };

    // Alias for the old button name in HTML
    window.savePortonesReview = window.saveAccessPointReview;

    window.renderAccessPointsHistory = function () {
        const container = document.getElementById('portones-history-container');
        if (!container) return;
        const key = window.getSiteKey('holcim_access_points_reviews');
        const reviews = JSON.parse(localStorage.getItem(key) || '[]');

        if (reviews.length === 0) {
            container.innerHTML = '<div style="padding:1rem; text-align:center; color:var(--text-muted);">Sin historial de revisiones.</div>';
            return;
        }

        container.innerHTML = reviews.map(r => `
            <div class="card-panel" style="margin-bottom:0.8rem; padding:1rem; border:1px solid #cbd5e1; font-size:0.85rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                    <strong>REVISIÓN: ${new Date(r.date).toLocaleString()}</strong>
                    <span style="color:var(--primary-teal); font-weight:700;">POR: ${r.officer}</span>
                </div>
                ${r.generalObs ? `<div style="margin-bottom:0.5rem; color:#64748b;"><em>Obs: ${r.generalObs}</em></div>` : ''}
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:5px;">
                    ${r.reviews.map(rev => `
                        <div style="padding:4px; border-radius:4px; background:rgba(0,0,0,0.03); display:flex; justify-content:space-between;">
                            <span>#${rev.apId.slice(-4)}</span>
                            <span style="color:${rev.status === 'OPERATIVO' ? '#059669' : '#ef4444'}; font-weight:700;">${rev.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    };

    window.exportPortonesLogs = function (format) {
        const key = window.getSiteKey('holcim_access_points_reviews');
        const reviews = JSON.parse(localStorage.getItem(key) || '[]');
        if (reviews.length === 0) return showNotification('NO HAY DATOS PARA EXPORTAR', 'warning');

        if (format === 'pdf') {
            window.print();
        } else {
            // CSV Export
            let csv = "\uFEFFFECHA,OFICIAL,PUNTO,ESTADO,OBSERVACION\n";
            reviews.forEach(r => {
                r.reviews.forEach(rev => {
                    csv += `"${new Date(r.date).toLocaleString()}","${r.officer}","${rev.apId}","${rev.status}","${rev.obs}"\n`;
                });
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Revisiones_Puntos_Acceso_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
        }
    };

    window.renderCctvMonitoring = function () {
        renderDailyCctvChecklist();
        renderVirtualRoundsList();
    };

    window.renderDailyCctvChecklist = function () {
        const container = document.getElementById('cctv-daily-checklist-container');
        if (!container) return;
        const cameras = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_cctv_inventory')) || '[]');
        const reviews = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_cctv_daily_reviews')) || '[]');
        const today = new Date().toISOString().split('T')[0];

        if (cameras.length === 0) {
            container.innerHTML = '<div class="alert-info-light">No hay cámaras registradas en el inventario.</div>';
            return;
        }

        container.innerHTML = cameras.map(cam => {
            const lastReview = reviews.find(r => r.camId === cam.id && r.date === today);
            const isDone = !!lastReview;

            return `
            <div class="checklist-item-premium ${isDone ? 'checklist-item-completed' : ''}" data-cam-id="${cam.id}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div class="checklist-title-premium"># ${cam.type} ${isDone ? '<span class="badge-completed">REVISADO</span>' : ''}</div>
                        <div class="checklist-subtitle-premium"><i class="fas fa-network-wired"></i> ${cam.ip} &bull; <i class="fas fa-location-dot"></i> ${cam.location}</div>
                    </div>
                </div>

                <div class="checklist-grid-premium">
                    <div class="check-group-premium">
                        <label>Visual Video</label>
                        <select class="check-visual" ${isDone ? 'disabled' : ''}>
                            <option value="OK" ${isDone && lastReview.visual === 'OK' ? 'selected' : ''}>OK</option>
                            <option value="FALLA" ${isDone && lastReview.visual === 'FALLA' ? 'selected' : ''}>FALLA</option>
                        </select>
                    </div>
                    <div class="check-group-premium">
                        <label>Audio</label>
                        <select class="check-audio" ${isDone ? 'disabled' : ''}>
                            <option value="OK" ${isDone && lastReview.audio === 'OK' ? 'selected' : ''}>OK</option>
                            <option value="FALLA" ${isDone && lastReview.audio === 'FALLA' ? 'selected' : ''}>FALLA</option>
                            <option value="N/A" ${isDone && lastReview.audio === 'N/A' ? 'selected' : ''}>N/A</option>
                        </select>
                    </div>
                    <div class="check-group-premium">
                        <label>Analíticas</label>
                        <select class="check-analytics" ${isDone ? 'disabled' : ''}>
                            <option value="OK" ${isDone && lastReview.analytics === 'OK' ? 'selected' : ''}>OK</option>
                            <option value="FALLA" ${isDone && lastReview.analytics === 'FALLA' ? 'selected' : ''}>FALLA</option>
                        </select>
                    </div>
                    <div class="check-group-premium">
                        <label>Hardware</label>
                        <select class="check-hardware" ${isDone ? 'disabled' : ''}>
                            <option value="OK" ${isDone && lastReview.hardware === 'OK' ? 'selected' : ''}>OK</option>
                            <option value="FALLA" ${isDone && lastReview.hardware === 'FALLA' ? 'selected' : ''}>FALLA</option>
                        </select>
                    </div>
                </div>

                <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr auto; gap: 15px; align-items: flex-end;">
                    <div class="check-group-premium">
                        <label>Observaciones</label>
                        <input type="text" class="check-obs" value="${isDone ? lastReview.obs : ''}" placeholder="Escriba novedad..." ${isDone ? 'disabled' : ''} style="width:100%;">
                    </div>
                    ${!isDone ? `<button class="btn-submit-action" onclick="saveCctvReview('${cam.id}')" style="margin:0; height:36px; padding:0 15px; background:var(--primary-teal);"><i class="fas fa-save"></i> GUARDAR</button>` : ''}
                </div>
            </div>`;
        }).join('');
    };

    window.saveCctvReview = function (camId) {
        const item = document.querySelector(`.checklist-item-premium[data-cam-id="${camId}"]`);
        const reviews = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_cctv_daily_reviews')) || '[]');
        const today = new Date().toISOString().split('T')[0];

        const review = {
            camId: camId,
            date: today,
            visual: item.querySelector('.check-visual').value,
            audio: item.querySelector('.check-audio').value,
            analytics: item.querySelector('.check-analytics').value,
            hardware: item.querySelector('.check-hardware').value,
            obs: item.querySelector('.check-obs').value,
            timestamp: new Date().toLocaleString()
        };

        reviews.push(review);
        localStorage.setItem(window.getSiteKey('holcim_cctv_daily_reviews'), JSON.stringify(reviews));

        showToast('Registro de CCTV guardado correctamente', 'success');
        renderDailyCctvChecklist();
    };

    window.saveCctvDailyReview = async function () {
        const items = document.querySelectorAll('.checklist-item');
        const user = getSession();
        const reviewData = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            user: user.email,
            type: 'DAILY',
            reviews: []
        };

        for (const item of items) {
            const camId = item.getAttribute('data-cam-id');
            const photoInput = item.querySelector('.check-photo');
            let photoBase64 = null;

            if (photoInput.files && photoInput.files[0]) {
                photoBase64 = await toBase64(photoInput.files[0]);
            }

            reviewData.reviews.push({
                camId: camId,
                visual: item.querySelector('.check-visual').value,
                audio: item.querySelector('.check-audio').value,
                analytics: item.querySelector('.check-analytics').value,
                alerts: item.querySelector('.check-alerts').value,
                hardware: item.querySelector('.check-hardware').value,
                observation: item.querySelector('.check-obs').value,
                photo: photoBase64
            });
        }

        const key = window.getSiteKey('holcim_cctv_reviews');
        const reviews = JSON.parse(localStorage.getItem(key) || '[]');
        reviews.push(reviewData);
        localStorage.setItem(key, JSON.stringify(reviews));

        showNotification('REVISIÓN DIARIA GUARDADA', 'success');
        addLogEvent('CCTV', 'Revisión técnica diaria completada');
        switchCctvMonTab('mon-history', document.querySelector('[onclick*="mon-history"]'));
    };

    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    // --- VIRTUAL ROUNDS PATROL ---
    const roundForm = document.getElementById('cctv-round-form');
    if (roundForm) {
        roundForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const photoInput = document.getElementById('round-photo');
            let photoBase64 = null;
            if (photoInput.files && photoInput.files[0]) photoBase64 = await toBase64(photoInput.files[0]);

            const round = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                user: getSession().email,
                type: 'ROUND',
                sector: document.getElementById('round-sector').value,
                points: document.getElementById('round-points').value,
                status: document.getElementById('round-status').value,
                detail: document.getElementById('round-detail').value,
                photo: photoBase64
            };

            const key = window.getSiteKey('holcim_virtual_rounds');
            const rounds = JSON.parse(localStorage.getItem(key) || '[]');
            rounds.push(round);
            localStorage.setItem(key, JSON.stringify(rounds));

            showNotification('RONDA VIRTUAL REGISTRADA', 'success');
            roundForm.reset();
            renderVirtualRoundsList();
        });
    }

    window.renderVirtualRoundsList = function () {
        const body = document.getElementById('cctv-rounds-list-body');
        if (!body) return;
        const rounds = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_virtual_rounds')) || '[]');

        body.innerHTML = rounds.slice().reverse().map(r => `
            <div class="list-row" style="grid-template-columns: 100px 150px 1fr 120px 80px 80px;">
                <span>${new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span style="font-weight:700;">${r.sector}</span>
                <span style="font-size:0.8rem;">${r.detail || '-'}</span>
                <span class="badge-motivo" style="color:white; background:${r.status === 'SIN NOVEDAD' ? '#059669' : '#DC2626'}">${r.status}</span>
                <div>${r.photo ? `<button class="btn-salida-corpo" onclick="viewCctvPhoto('${r.photo}')">VER</button>` : '-'}</div>
                <div><button class="btn-salida-corpo" style="background:#64748b" onclick="deleteCctvItem('ROUND', '${r.id}')">BORRAR</button></div>
            </div>
        `).join('');
    };

    window.viewCctvPhoto = function (base64) {
        const win = window.open();
        win.document.write('<html><body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center;"><img src="' + base64 + '" style="max-width:100%; max-height:100%;"></body></html>');
    };

    window.deleteCctvItem = function (type, id) {
        if (!confirm('¿Eliminar registro?')) return;
        const key = type === 'ROUND' ? window.getSiteKey('holcim_virtual_rounds') : window.getSiteKey('holcim_cctv_reviews');
        let items = JSON.parse(localStorage.getItem(key));
        items = items.filter(i => i.id !== id);
        localStorage.setItem(key, JSON.stringify(items));
        if (type === 'ROUND') renderVirtualRoundsList(); else renderCctvHistory();
    };

    window.renderCctvHistory = function () {
        const container = document.getElementById('cctv-history-container');
        if (!container) return;

        const reviews = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_cctv_reviews')) || '[]');
        const rounds = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_virtual_rounds')) || '[]');

        let all = [...reviews.map(r => ({ ...r, type: 'DAILY_REVIEW' })), ...rounds.map(r => ({ ...r, type: 'ROUND' }))];
        all.sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = all.map(item => `
            <div class="card-panel" style="margin-bottom:1rem; border-left: 5px solid ${item.type === 'ROUND' ? '#3b82f6' : '#10b981'}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${item.type === 'ROUND' ? 'RONDA VIRTUAL' : 'REVISIÓN DIARIA'}</strong>
                        <span style="margin-left:10px; color:var(--text-muted);">${new Date(item.date).toLocaleString()}</span>
                    </div>
                    <div>
                        <button class="btn-salida-corpo" onclick="deleteCctvItem('${item.type === 'ROUND' ? 'ROUND' : 'REVIEW'}', '${item.id}')">ELIMINAR</button>
                    </div>
                </div>
                <p style="margin:10px 0; font-size:0.9rem;">${item.detail || item.sector || (item.reviews ? 'Revision de ' + item.reviews.length + ' puntos de inventario' : '')}</p>
            </div>
        `).join('');
    };

    window.exportCctvLogs = function (format) {
        const rounds = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_virtual_rounds')) || '[]');
        const html = `
            <h2>Reporte de Monitoreo CCTV - Holcim</h2>
            <table border="1">
                <tr><th>Fecha/Hora</th><th>Tipo</th><th>Usuario</th><th>Detalle/Sector</th><th>Estado</th></tr>
                ${rounds.map(r => `<tr><td>${new Date(r.date).toLocaleString()}</td><td>Ronda</td><td>${r.user}</td><td>${r.sector}</td><td>${r.status}</td></tr>`).join('')}
            </table>
        `;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_CCTV_${new Date().toLocaleDateString()}.xls`;
        a.click();
    };

    // --- PDF PRINT STYLE ---
    const style = document.createElement('style');
    style.innerHTML = `
        @media print {
            .nav-bar, .header-top, .export-actions, .filter-bar, .panel-header h3 i, .btn-submit-action, .btn-salida-corpo, #btn-logout-header, .login-overlay { display: none !important; }
            .view-section { display: none !important; }
            .view-section[style*="display: block"], .view-section.active-view { display: block !important; opacity: 1 !important; visibility: visible !important; }
            .card-panel { box-shadow: none !important; border: 1px solid #e2e8f0 !important; margin-bottom: 25px; padding: 15px !important; break-inside: avoid; }
            .monitor-list { max-height: none !important; overflow: visible !important; width: 100% !important; }
            .list-head { background: #1e293b !important; color: white !important; border: 1px solid #000 !important; font-weight: bold !important; -webkit-print-color-adjust: exact; }
            .list-row { break-inside: avoid; border-bottom: 1px solid #cbd5e1 !important; display: grid !important; background: transparent !important; color: #1e293b !important; }
            .list-row:nth-child(even) { background: #f8fafc !important; -webkit-print-color-adjust: exact; }
            body { background: white !important; margin: 0 !important; padding: 15mm !important; font-size: 10pt; }
            #executive-print-report, #executive-print-report * { visibility: visible !important; display: block !important; }
            .main-wrapper { padding: 0 !important; margin: 0 !important; width: 100% !important; }
            h3 { color: #1e293b; border-left: 5px solid #009cbd; padding-left: 10px; margin-bottom: 15px; }
            .badge-motivo, .induction-status { border: 1px solid #cbd5e1 !important; background: transparent !important; color: black !important; -webkit-print-color-adjust: exact; }
        }

        @keyframes pulse-red-alert {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(237, 28, 22, 0.4); }
            70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(237, 28, 22, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(237, 28, 22, 0); }
        }

        .pulsing-alert {
            border-radius: 6px;
            margin-bottom: 1rem;
            display: flex;
            flex-direction: column;
            gap: 5px;
            align-items: flex-start;
            text-align: left;
            font-weight: 600;
        }

        .alert-success-light {
            background-color: rgba(16, 185, 129, 0.05);
            border: 1px solid #10b981;
            color: #10b981;
            padding: 10px;
        }

        .alert-danger-light {
            background-color: rgba(239, 68, 68, 0.05);
            border: 1px solid #ef4444;
            color: #ef4444;
            padding: 10px;
        }
    `;
    document.head.appendChild(style);

    setInterval(() => { const c = document.getElementById('digital-clock'); if (c) c.textContent = new Date().toLocaleTimeString(); }, 1000);

    // STARTUP SEQUENCE
    try {
        checkAuth();
        updateCounters();
        renderLiveLog();
        updateOfficersDatalist();
    } catch (e) {
        console.error("Startup Sequence Error:", e);
    }

    // --- QR/BARCODE SCANNER ---
    window.html5QrCode = null;

    window.closeScanner = function () {
        if (window.html5QrCode) {
            window.html5QrCode.stop().then(() => {
                document.getElementById('modal-scanner').style.display = 'none';
            }).catch(err => {
                console.warn("Scanner stop error:", err);
                document.getElementById('modal-scanner').style.display = 'none';
            });
        } else {
            document.getElementById('modal-scanner').style.display = 'none';
        }
    };

    window.openScanner = function () {
        const modal = document.getElementById('modal-scanner');
        if (modal) modal.style.display = 'flex';

        if (!window.html5QrCode) {
            window.html5QrCode = new Html5Qrcode("reader");
        }

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        window.html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                const idInput = document.getElementById('idNumber');
                if (idInput) {
                    idInput.value = decodedText;
                    idInput.dispatchEvent(new Event('blur'));
                }
                window.closeScanner();
                showNotification('CÓDIGO ESCANEADO', 'success');
            },
            (errorMessage) => { }
        ).catch((err) => {
            console.error("Error starting scanner:", err);
            showNotification('ERROR AL INICIAR CÁMARA', 'danger');
        });
    };

    // Event Listeners for Scanner

    const btnScanId = document.getElementById('btn-scan-id');
    if (btnScanId) {
        btnScanId.addEventListener('click', window.openScanner);
    }

    // --- VOICE RECOGNITION ---
    const btnVoiceId = document.getElementById('btn-voice-id');
    if (btnVoiceId) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'es-ES';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = function () {
                btnVoiceId.classList.add('pulse-active');
                showNotification('DICTE LA CÉDULA...', 'info');
            };

            recognition.onresult = function (event) {
                const speechResult = event.results[0][0].transcript;
                console.log('Voice Result:', speechResult);

                // Relaxed cleaning: keep numbers and dashes, handles "guión" or "raya" verbally
                let cleaned = speechResult.toLowerCase()
                    .replace(/guion|guión|raya/g, '-')
                    .replace(/[^\d-]/g, '');

                const idInput = document.getElementById('idNumber');
                if (idInput && cleaned) {
                    idInput.value = cleaned;
                    idInput.dispatchEvent(new Event('input'));
                    idInput.dispatchEvent(new Event('blur'));
                    showNotification('CÉDULA RECONOCIDA: ' + cleaned, 'success');
                } else {
                    showNotification('NO SE RECONOCIÓ UN NÚMERO VÁLIDO', 'warning');
                }
                btnVoiceId.classList.remove('pulse-active');
            };

            recognition.onerror = function (event) {
                btnVoiceId.classList.remove('pulse-active');
                const errorMessages = {
                    'network': 'ERROR DE RED',
                    'not-allowed': 'MICRÓFONO BLOQUEADO',
                    'no-speech': 'NO SE DETECTÓ VOZ',
                    'aborted': 'RECONOCIMIENTO CANCELADO'
                };
                showNotification(errorMessages[event.error] || 'ERROR DE VOZ: ' + event.error, 'danger');
            };

            recognition.onend = function () {
                btnVoiceId.classList.remove('pulse-active');
            };

            btnVoiceId.addEventListener('click', function () {
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Recognition start error:", e);
                }
            });
        } else {
            btnVoiceId.style.display = 'none';
        }
    }

    // --- SAFETY REPORT FUNCTIONS (EXTENDED) ---
    window.openSafetyReportModal = function () {
        const modal = document.getElementById('modal-safety-report');
        if (modal) {
            document.getElementById('safety-report-form').reset();
            document.getElementById('sr-photo-preview').style.display = 'none';
            const now = new Date();
            document.getElementById('sr-elaborated-date').value = now.toISOString().split('T')[0];
            document.getElementById('sr-date').value = now.toISOString().split('T')[0];
            const tables = ['sr-involved-table', 'sr-assets-table'];
            tables.forEach(tableId => {
                const tbody = document.getElementById(tableId).querySelector('tbody');
                while (tbody.rows.length > 1) tbody.deleteRow(1);
                tbody.querySelectorAll('input').forEach(input => input.value = '');
            });
            const code = `SEG-${now.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
            document.getElementById('sr-code').value = code;
            modal.style.display = 'flex';
        }
    };

    window.closeSafetyReportModal = function () {
        document.getElementById('modal-safety-report').style.display = 'none';
    };

    window.addInvolvedPersonRow = function () {
        const tbody = document.getElementById('sr-involved-table').querySelector('tbody');
        const row = tbody.insertRow();
        row.innerHTML = `
            <td style="border: 1px solid #cbd5e1;"><input type="text" style="border: none; width: 100%;" placeholder="..."></td>
            <td style="border: 1px solid #cbd5e1;"><input type="text" style="border: none; width: 100%;" placeholder="..."></td>
            <td style="border: 1px solid #cbd5e1;"><input type="text" style="border: none; width: 100%;" placeholder="..."></td>
            <td style="border: 1px solid #cbd5e1; text-align: center;"><button type="button" style="border: none; background: none; color: #ef4444; cursor: pointer;" onclick="removeTableRow(this)">&times;</button></td>
        `;
    };

    window.addAffectedAssetRow = function () {
        const tbody = document.getElementById('sr-assets-table').querySelector('tbody');
        const row = tbody.insertRow();
        row.innerHTML = `
            <td style="border: 1px solid #cbd5e1;"><input type="text" style="border: none; width: 100%;" placeholder="..."></td>
            <td style="border: 1px solid #cbd5e1;"><input type="number" style="border: none; width: 100%;" value="1"></td>
            <td style="border: 1px solid #cbd5e1;"><input type="text" style="border: none; width: 100%;" placeholder="..."></td>
            <td style="border: 1px solid #cbd5e1;"><input type="text" style="border: none; width: 100%;" placeholder="..."></td>
            <td style="border: 1px solid #cbd5e1; text-align: center;"><button type="button" style="border: none; background: none; color: #ef4444; cursor: pointer;" onclick="removeTableRow(this)">&times;</button></td>
        `;
    };

    window.removeTableRow = function (btn) {
        const row = btn.parentNode.parentNode;
        row.parentNode.removeChild(row);
    };

    window.previewSafetyImage = function (event) {
        const reader = new FileReader();
        reader.onload = function () {
            const preview = document.getElementById('sr-photo-preview');
            const img = document.getElementById('sr-preview-img');
            img.src = reader.result;
            preview.style.display = 'block';
        };
        if (event.target.files[0]) reader.readAsDataURL(event.target.files[0]);
    };

    window.downloadSafetyReportPDF = function () {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const code = document.getElementById('sr-code').value;
        const status = document.querySelector('input[name="sr-status"]:checked').value;
        const dateEvent = document.getElementById('sr-date').value;
        const timeEvent = document.getElementById('sr-time').value;
        const area = document.getElementById('sr-area').value;
        const elaboratedDate = document.getElementById('sr-elaborated-date').value;
        const officer = document.getElementById('sr-officer').value;
        const detail = document.getElementById('sr-detail').value;
        const vulnerability = document.getElementById('sr-vulnerability').value;
        const actions = document.getElementById('sr-actions').value;

        // Header
        doc.setFillColor(0, 30, 60);
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("REPORTE DE INCIDENTE Y NOVEDADES", 105, 14, { align: "center" });
        doc.text("DE SEGURIDAD PATRIMONIAL", 105, 22, { align: "center" });

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.text(`Código: ${code}`, 160, 40);
        doc.text(`Estado: [ ${status} ]`, 160, 45);

        let y = 50;
        const checkPage = (addedY) => {
            if (y + addedY > 280) {
                doc.addPage();
                y = 20;
            }
        };

        const sectionTitle = (title) => {
            checkPage(15);
            doc.setFillColor(240, 244, 248);
            doc.rect(10, y, 190, 7, 'F');
            doc.setDrawColor(0, 156, 189);
            doc.line(10, y, 10, y + 7);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(title, 15, y + 5);
            y += 10;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
        };

        // 1. Datos Generales
        sectionTitle("1. DATOS GENERALES");
        doc.text(`Fecha del Evento: ${dateEvent}`, 15, y);
        doc.text(`Hora Estimada: ${timeEvent} hrs`, 80, y);
        doc.text(`Ubicación: ${area}`, 130, y);
        y += 6;
        doc.text(`Fecha de Elaboración: ${elaboratedDate}`, 15, y);
        doc.text(`Reportado por: ${officer}`, 80, y);
        y += 10;

        // 2. Clasificación
        sectionTitle("2. CLASIFICACIÓN DEL EVENTO");
        const classes = Array.from(document.querySelectorAll('input[name="sr-class"]:checked')).map(cb => {
            const label = cb.nextElementSibling ? cb.nextElementSibling.innerText : cb.value;
            return label;
        });
        if (classes.includes('Otro:')) {
            const otherVal = document.getElementById('sr-other-class').value;
            classes[classes.indexOf('Otro:')] = `OTRO (${otherVal})`;
        }
        const classesText = classes.join(', ') || 'Sin clasificar';
        const splitClasses = doc.splitTextToSize(`Tipos: ${classesText}`, 180);
        doc.text(splitClasses, 15, y);
        y += (splitClasses.length * 5) + 5;

        // 3. Descripción
        sectionTitle("3. DESCRIPCIÓN CRONOLÓGICA DE LOS HECHOS");
        const splitDetail = doc.splitTextToSize(detail, 180);
        doc.text(splitDetail, 15, y);
        y += (splitDetail.length * 5) + 5;

        // 4. Personas
        const involvedRows = Array.from(document.getElementById('sr-involved-table').querySelectorAll('tbody tr'));
        if (involvedRows.some(row => row.querySelectorAll('input')[0].value)) {
            sectionTitle("4. PERSONAS INVOLUCRADAS");
            doc.setFillColor(230, 230, 230);
            doc.rect(15, y, 180, 6, 'F');
            doc.setFont("helvetica", "bold");
            doc.text("Nombre", 17, y + 4.5);
            doc.text("Rol", 80, y + 4.5);
            doc.text("IDs/Empresa", 140, y + 4.5);
            doc.setFont("helvetica", "normal");
            y += 6;
            involvedRows.forEach(row => {
                const inputs = row.querySelectorAll('input');
                if (inputs[0] && inputs[0].value) {
                    checkPage(6);
                    doc.text(inputs[0].value, 17, y + 4);
                    doc.text(inputs[1].value, 80, y + 4);
                    doc.text(inputs[2].value, 140, y + 4);
                    y += 6;
                }
            });
            y += 5;
        }

        // 5. Bienes
        const assetRows = Array.from(document.getElementById('sr-assets-table').querySelectorAll('tbody tr'));
        if (assetRows.some(row => row.querySelectorAll('input')[0].value)) {
            sectionTitle("5. INVENTARIO DE BIENES AFECTADOS");
            doc.setFillColor(230, 230, 230);
            doc.rect(15, y, 180, 6, 'F');
            doc.setFont("helvetica", "bold");
            doc.text("Descripción", 17, y + 4.5);
            doc.text("Cant", 100, y + 4.5);
            doc.text("Estado", 120, y + 4.5);
            doc.text("Valor", 160, y + 4.5);
            doc.setFont("helvetica", "normal");
            y += 6;
            assetRows.forEach(row => {
                const inputs = row.querySelectorAll('input');
                if (inputs[0] && inputs[0].value) {
                    checkPage(6);
                    doc.text(inputs[0].value, 17, y + 4);
                    doc.text(inputs[1].value, 100, y + 4);
                    doc.text(inputs[2].value, 120, y + 4);
                    doc.text(inputs[3].value, 160, y + 4);
                    y += 6;
                }
            });
            y += 5;
        }

        // 6. Análisis
        sectionTitle("6. ANÁLISIS Y ACCIONES INMEDIATAS");
        doc.setFont("helvetica", "bold"); doc.text("Vulnerabilidad detectada:", 15, y); doc.setFont("helvetica", "normal");
        const splitVul = doc.splitTextToSize(vulnerability, 180);
        doc.text(splitVul, 15, y + 5);
        y += (splitVul.length * 5) + 7;

        checkPage(15);
        doc.setFont("helvetica", "bold"); doc.text("Acción inmediata tomada:", 15, y); doc.setFont("helvetica", "normal");
        const splitAct = doc.splitTextToSize(actions, 180);
        doc.text(splitAct, 15, y + 5);
        y += (splitAct.length * 5) + 10;

        // NOTA DE IMPORTANCIA CRÍTICA
        checkPage(40);
        doc.setFillColor(254, 242, 242);
        const noteText = "NOTA DE IMPORTANCIA CRÍTICA:\nEste reporte documenta una vulnerabilidad que afecta directamente la continuidad operativa y la protección de los activos de la compañía. La atención inmediata a las acciones correctivas aquí descritas es indispensable para mitigar riesgos, evitar pérdidas patrimoniales y garantizar un entorno seguro. La omisión en el seguimiento de este incidente incrementa la exposición de la empresa ante amenazas externas e internas.";
        const splitNote = doc.splitTextToSize(noteText, 180);
        doc.rect(10, y, 190, (splitNote.length * 5) + 6, 'F');
        doc.setDrawColor(220, 38, 38);
        doc.rect(10, y, 190, (splitNote.length * 5) + 6, 'S');
        doc.setTextColor(153, 27, 27);
        doc.setFont("helvetica", "bold");
        doc.text(splitNote, 15, y + 5);
        y += (splitNote.length * 5) + 15;

        // Evidencia Photograph
        const previewImg = document.getElementById('sr-preview-img');
        if (previewImg.src && previewImg.src.startsWith('data:image')) {
            checkPage(110);
            sectionTitle("EVIDENCIA FOTOGRÁFICA");
            try {
                doc.addImage(previewImg.src, 'JPEG', 30, y, 150, 90);
                y += 100;
            } catch (e) {
                console.error("Error adding image to PDF:", e);
            }
        }

        doc.save(`Reporte_Novedades_${code}.pdf`);
        showNotification('REPORTE GENERADO', 'success');
        closeSafetyReportModal();
    };

    function renderInductions() {
        const body = document.getElementById('induction-list-body');
        if (!body) return;
        const inductions = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_inductions')) || '[]');
        const search = (document.getElementById('induction-search')?.value || '').toLowerCase();
        const start = document.getElementById('ind-date-start')?.value;
        const end = document.getElementById('ind-date-end')?.value;
        const status = document.getElementById('filter-ind-status')?.value || 'ALL';

        const filtered = inductions.filter(i => {
            const matchesSearch = i.fullName.toLowerCase().includes(search) || (i.idNumber || '').includes(search) || i.company.toLowerCase().includes(search);
            const indDate = i.date;
            const matchesDate = (!start || indDate >= start) && (!end || indDate <= end);
            const isExpired = new Date(i.expiry) < new Date();
            const matchesStatus = status === 'ALL' || (status === 'valid' && !isExpired) || (status === 'expired' && isExpired);
            return matchesSearch && matchesDate && matchesStatus;
        });

        body.innerHTML = filtered.map(i => {
            const isExpired = new Date(i.expiry) < new Date();
            return `
                <div class="list-row" style="grid-template-columns: 120px 1fr 140px 140px 120px 100px;">
                    <span>${i.idNumber}</span>
                    <strong style="font-size: 0.9rem;">${i.fullName}</strong>
                    <span style="font-size: 0.8rem;">${i.company}</span>
                    <span style="font-size: 0.8rem;">${i.department || '-'}</span>
                    <span style="font-size: 0.8rem;">${i.date}</span>
                    <div><span class="induction-status ${isExpired ? 'status-missing' : 'status-active'}">${isExpired ? 'VENCIDA' : 'VIGENTE'}</span></div>
                </div>
            `;
        }).join('');
    }

    window.exportInductions = function (format) {
        const inductions = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_inductions')) || '[]');
        if (inductions.length === 0) return showNotification('NO HAY DATOS PARA EXPORTAR', 'danger');

        const siteName = getSession()?.site || 'HOLCIM';

        if (format === 'xlsx') {
            const title = `BASE DE DATOS DE INDUCCIONES - ${siteName}`;
            const date = new Date().toLocaleString();

            let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="utf-8"/><style>
                .title { font-size: 16pt; font-weight: bold; color: #DC2626; text-align: center; }
                .header { background-color: #1e293b; color: white; font-weight: bold; border: 1px solid #000; }
                .cell { border: 1px solid #ccc; font-size: 10pt; }
                .status-valid { color: #10b981; font-weight: bold; }
                .status-expired { color: #ef4444; font-weight: bold; }
            </style></head>
            <body>
                <table>
                    <tr><td colspan="7" class="title">${title}</td></tr>
                    <tr><td colspan="7" style="text-align:right">Fecha: ${date}</td></tr>
                    <tr class="header">
                        <th>CEDULA</th><th>NOMBRE</th><th>EMPRESA</th><th>DEPARTAMENTO</th>
                        <th>RESPONSABLE</th><th>FECHA INDUCCION</th><th>VENCIMIENTO</th><th>ESTADO</th>
                    </tr>
        `;

            inductions.forEach(i => {
                const isExpired = new Date(i.expiry) < new Date();
                html += `
                <tr>
                    <td class="cell">${i.idNumber}</td>
                    <td class="cell">${i.fullName}</td>
                    <td class="cell">${i.company}</td>
                    <td class="cell">${i.department || '-'}</td>
                    <td class="cell">${i.responsible || '-'}</td>
                    <td class="cell">${i.date}</td>
                    <td class="cell">${i.expiry}</td>
                    <td class="cell ${isExpired ? 'status-expired' : 'status-valid'}">${isExpired ? 'VENCIDA' : 'VIGENTE'}</td>
                </tr>
            `;
            });

            html += `</table></body></html>`;

            const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `Inducciones_${siteName}_${new Date().toISOString().split('T')[0]}.xls`;
            a.click();
        } else { window.print(); }
    };

    // Add search listener for inductions
    document.getElementById('induction-search')?.addEventListener('input', renderInductions);
    // Modal Closers
    window.closeEditAuthModal = () => document.getElementById('modal-edit-auth').style.display = 'none';
    window.closeEditKeyModal = () => document.getElementById('modal-edit-key-loan').style.display = 'none';
    window.closeEditPackageModal = () => document.getElementById('modal-edit-package').style.display = 'none';
    window.closeContractorModal = () => document.getElementById('modal-contractor-hours').style.display = 'none';
    window.closeAlertsModal = () => document.getElementById('modal-security-alerts').style.display = 'none';
    window.closeEditModal = () => document.getElementById('modal-edit-entry').style.display = 'none';
    window.closeScanner = function () {
        const modal = document.getElementById('modal-scanner');
        if (modal) modal.style.display = 'none';
        // The stop logic is handled inside the DOMContentLoaded listener if we use the singleton approach,
        // but since we want to be able to close it from anywhere, we ensure it's accessible.
        // If html5QrCode is defined in the outer scope or window, we can stop it here.
    };
    window.closeTraceabilityModal = () => document.getElementById('modal-traceability').style.display = 'none';

    // --- ACCESS POINTS LOGIC ---
    window.renderDbAccessPoints = function () {
        const body = document.getElementById('db-access-points-list-body');
        if (!body) return;
        const items = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_access_points')) || '[]');
        if (items.length === 0) {
            body.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);grid-column:1/-1">No hay puntos de acceso registrados.</div>';
            return;
        }

        const statusColor = { 'OPERATIVO': '#22c55e', 'FALLA': '#ef4444', 'MANTENIMIENTO': '#f59e0b', 'FUERA DE SERVICIO': '#64748b' };
        body.innerHTML = items.map((ap, idx) => `
        <div class="list-row" style="grid-template-columns: 1fr 1fr 110px 130px 60px 130px; align-items: center;">
            <div>
                <strong style="color:var(--primary-teal)">${ap.name}</strong>
                ${ap.lat && ap.lng ? ` <button class="btn-salida-corpo" onclick="panToAP(${ap.lat}, ${ap.lng})" style="padding:0 4px; font-size:0.55rem; background:#64748b; color:white; border:none; border-radius:3px;"><i class="fas fa-location-dot"></i></button>` : ''}
                ${ap.obs ? `<p style="font-size:0.7rem;color:var(--text-muted);margin:0">${ap.obs}</p>` : ''}
            </div>
            <span style="font-size:0.85rem">${ap.location}</span>
            <span class="badge-motivo" style="font-size:0.65rem">${ap.type}</span>
            <div><span class="induction-status" style="background:${statusColor[ap.status] || '#888'}20;color:${statusColor[ap.status] || '#888'};border:1px solid ${statusColor[ap.status] || '#888'}40;font-size:0.65rem">${ap.status}</span></div>
            <div>
                ${ap.photo ? `<img src="${ap.photo}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;cursor:pointer;border:2px solid var(--border-gray)" onclick="showApPhoto('${idx}')" title="Ver foto">` : '<span style="color:var(--text-muted);font-size:0.75rem">-</span>'}
            </div>
            <div style="display:flex;gap:4px;">
                <button class="btn-salida-corpo" onclick="openEditDbAccessPoint(${idx})" style="padding:3px 8px;font-size:0.7rem;background:var(--primary-teal);color:white;border-color:var(--primary-teal);"><i class="fas fa-pen"></i></button>
                <button class="btn-salida-corpo" onclick="deleteAccessPoint(${idx})" style="padding:3px 8px;font-size:0.7rem;background:#ef4444;color:white;border-color:#ef4444"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
    };

    window.showApPhoto = function (idx) {
        const items = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_access_points')) || '[]');
        const ap = items[idx];
        if (!ap || !ap.photo) return;
        const win = window.open('', '_blank', 'width=600,height=500');
        win.document.write(`<html><body style="margin:0;background:#000;display:flex;justify-content:center;align-items:center;height:100vh"><img src="${ap.photo}" style="max-width:100%;max-height:100%;object-fit:contain"><\/body><\/html>`);
    };

    window.deleteAccessPoint = function (idx) {
        if (!confirm('¿Eliminar este punto de acceso?')) return;
        const key = window.getSiteKey('holcim_access_points');
        let items = JSON.parse(localStorage.getItem(key) || '[]');
        items.splice(idx, 1);
        localStorage.setItem(key, JSON.stringify(items));
        window.renderDbAccessPoints();
        showNotification('PUNTO DE ACCESO ELIMINADO', 'info');
    };

    // --- MAP LOGIC ---
    window.apMap = null;
    window.apMarkers = [];

    window.toggleAPMap = function () {
        const wrapper = document.getElementById('ap-map-wrapper');
        const btn = document.getElementById('btn-toggle-map');
        if (!wrapper || !btn) return;

        if (wrapper.style.display === 'none') {
            wrapper.style.display = 'block';
            btn.innerHTML = '<i class="fas fa-eye-slash"></i> OCULTAR MAPA';
            btn.style.background = '#64748b';
            if (!window.apMap) {
                initAPMap();
            } else {
                // Invalidate size to fix container issues with Leaflet
                setTimeout(() => window.apMap.invalidateSize(), 100);
            }
        } else {
            wrapper.style.display = 'none';
            btn.innerHTML = '<i class="fas fa-map-location-dot"></i> VER MAPA INTERACTIVO';
            btn.style.background = 'var(--primary-teal)';
        }
    };

    window.initAPMap = function () {
        // Default center (can be refined based on site)
        const lat = 9.9281, lng = -84.0907;
        window.apMap = L.map('ap-map').setView([lat, lng], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(window.apMap);

        updateMapMarkers();
    };

    window.updateMapMarkers = function () {
        if (!window.apMap) return;

        // Clear old markers
        window.apMarkers.forEach(m => window.apMap.removeLayer(m));
        window.apMarkers = [];

        const items = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_access_points')) || '[]');

        items.forEach(ap => {
            if (ap.lat && ap.lng) {
                const marker = L.marker([ap.lat, ap.lng]).addTo(window.apMap);
                marker.bindPopup(`
                <div style="font-family:Inter; padding:5px;">
                    <strong style="color:var(--navy-black)">${ap.name}</strong><br>
                    <span style="font-size:0.75rem">${ap.location}</span><br>
                    <button class="btn-crear" style="font-size:0.6rem; padding:4px 8px; margin-top:5px;" onclick="focusAPChecklist('${ap.id}')">REVISAR AHORA</button>
                </div>
            `);
                window.apMarkers.push(marker);
            }
        });
    };

    window.focusAPChecklist = function (apId) {
        const item = document.querySelector(`[data-ap-id="${apId}"]`);
        if (item) {
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            item.style.boxShadow = '0 0 15px var(--primary-teal)';
            setTimeout(() => item.style.boxShadow = 'none', 2000);
        }
    };

    window.panToAP = function (lat, lng) {
        if (!window.apMap) {
            toggleAPMap();
            setTimeout(() => window.apMap.panTo([lat, lng]), 500);
        } else {
            if (document.getElementById('ap-map-wrapper').style.display === 'none') toggleAPMap();
            window.apMap.panTo([lat, lng]);
        }
    };

    const apForm = document.getElementById('db-access-point-form');
    if (apForm) {
        apForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = document.getElementById('db-ap-name').value.trim().toUpperCase();
            const location = document.getElementById('db-ap-location').value.trim().toUpperCase();
            const type = document.getElementById('db-ap-type').value;
            const status = document.getElementById('db-ap-status').value;
            const obs = document.getElementById('db-ap-obs').value.trim();
            const lat = document.getElementById('db-ap-lat').value;
            const lng = document.getElementById('db-ap-lng').value;
            const photoInput = document.getElementById('db-ap-photo');

            const saveRecord = (photoData) => {
                const key = window.getSiteKey('holcim_access_points');
                const items = JSON.parse(localStorage.getItem(key) || '[]');
                items.unshift({
                    id: Date.now(),
                    name,
                    location,
                    type,
                    status,
                    obs,
                    lat: lat ? parseFloat(lat) : null,
                    lng: lng ? parseFloat(lng) : null,
                    photo: photoData || null
                });
                localStorage.setItem(key, JSON.stringify(items));
                showNotification('PUNTO DE ACCESO REGISTRADO', 'success');
                addLogEvent('DB', 'Nuevo punto de acceso: ' + name);
                apForm.reset();
                document.getElementById('db-ap-obs').value = '';
                window.renderDbAccessPoints();
                if (window.updateMapMarkers) window.updateMapMarkers();
                triggerAutoBackup();
            };

            if (photoInput && photoInput.files[0]) {
                const reader = new FileReader();
                reader.onload = (ev) => saveRecord(ev.target.result);
                reader.readAsDataURL(photoInput.files[0]);
            } else {
                saveRecord(null);
            }
        });
    }

    // --- CCTV MAP LOGIC ---
    window.cctvMap = null;
    window.cctvMarkers = [];

    window.toggleCctvMap = function () {
        const wrapper = document.getElementById('cctv-map-wrapper');
        if (!wrapper) {
            showNotification('Error: No se encontró el contenedor del mapa', 'error');
            return;
        }

        if (wrapper.style.display === 'none' || !wrapper.style.display) {
            wrapper.style.display = 'block';
            showNotification('Cargando Mapa...', 'info');
            if (!window.cctvMap) {
                window.initCctvMap();
            } else {
                setTimeout(() => {
                    window.cctvMap.invalidateSize();
                    window.updateCctvMapMarkers();
                }, 100);
            }
        } else {
            wrapper.style.display = 'none';
        }
    };

    window.initCctvMap = function () {
        const mapDiv = document.getElementById('cctv-map');
        if (!mapDiv) {
            console.error('CCTV Map div not found');
            return;
        }

        // Default coordinates if none provided
        const lat = 9.9281, lng = -84.0907;

        try {
            window.cctvMap = L.map('cctv-map').setView([lat, lng], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(window.cctvMap);

            setTimeout(() => {
                window.cctvMap.invalidateSize();
                window.updateCctvMapMarkers();
            }, 300);
        } catch (e) {
            console.error('Error initializing CCTV Map:', e);
        }
    };

    window.updateCctvMapMarkers = function () {
        if (!window.cctvMap) return;

        // Clear old markers
        if (window.cctvMarkers) {
            window.cctvMarkers.forEach(m => window.cctvMap.removeLayer(m));
        }
        window.cctvMarkers = [];

        // Get filter values
        const searchInput = document.getElementById('cctv-map-search');
        const typeSelect = document.getElementById('cctv-map-filter-type');
        const statusSelect = document.getElementById('cctv-map-filter-status');

        const searchTerm = (searchInput?.value || '').toLowerCase();
        const filterType = typeSelect?.value || 'ALL';
        const filterStatus = statusSelect?.value || 'ALL';

        const items = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_cctv_inventory')) || '[]');

        const filteredItems = items.filter(cam => {
            const matchesSearch = !searchTerm ||
                (cam.location || '').toLowerCase().includes(searchTerm) ||
                (cam.type || '').toLowerCase().includes(searchTerm) ||
                (cam.ip || '').toLowerCase().includes(searchTerm);

            const matchesType = filterType === 'ALL' || cam.type === filterType;
            const matchesStatus = filterStatus === 'ALL' || cam.status === filterStatus;

            return matchesSearch && matchesType && matchesStatus;
        });

        filteredItems.forEach(cam => {
            if (cam.lat != null && cam.lng != null) {
                let color = '#0284c7'; // Default Blue
                if (cam.status === 'FALLA') color = '#ef4444';
                if (cam.status === 'MANTENIMIENTO') color = '#f59e0b';

                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3); color: white;"><i class="fas fa-video" style="font-size: 14px;"></i></div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });

                const marker = L.marker([cam.lat, cam.lng], { icon }).addTo(window.cctvMap);
                marker.bindPopup(`
                <div style="font-family:Inter; padding:5px; min-width:150px;">
                    <strong style="color:var(--navy-black); border-bottom:1px solid #eee; display:block; padding-bottom:3px; margin-bottom:5px;">${cam.type}</strong>
                    <div style="font-size:0.75rem; margin-bottom:3px;"><i class="fas fa-location-dot" style="width:15px;"></i> ${cam.location}</div>
                    <div style="font-size:0.75rem; color:var(--primary-teal); font-family:monospace; margin-bottom:3px;"><i class="fas fa-network-wired" style="width:15px;"></i> ${cam.ip}</div>
                    <div style="font-size:0.75rem;"><i class="fas fa-circle" style="width:15px; color:${color}"></i> ${cam.status}</div>
                </div>
            `);
                window.cctvMarkers.push(marker);
            }
        });

        // Auto-center map to markers if there are any
        if (filteredItems.length > 0 && window.cctvMap) {
            const coords = filteredItems.filter(cam => cam.lat != null && cam.lng != null).map(cam => [cam.lat, cam.lng]);
            if (coords.length > 0) {
                window.cctvMap.fitBounds(coords, { padding: [50, 50], maxZoom: 17 });
            }
        }
    };
    window.pickerMap = null;
    window.pickerMarker = null;
    window.activeLatId = null;
    window.activeLngId = null;

    window.openMapPicker = function (latId, lngIdOrMode) {
        window.activeLatId = latId;
        // If second arg is 'polygon', we are in polygon mode. 
        // Otherwise it's single mode and the second arg is the lngId.
        window.pickerMode = (lngIdOrMode === 'polygon') ? 'polygon' : 'single';
        window.activeLngId = (window.pickerMode === 'single') ? lngIdOrMode : null;

        const modal = document.getElementById('modal-map-picker');
        if (modal) modal.style.display = 'flex';

        // Show/Hide clear button based on mode
        const clearBtn = document.getElementById('btn-picker-clear');
        if (clearBtn) clearBtn.style.display = (window.pickerMode === 'polygon') ? 'block' : 'none';

        if (!window.pickerMap) {
            window.pickerMap = L.map('picker-map').setView([9.9281, -84.0907], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.pickerMap);

            window.pickerMap.on('click', function (e) {
                const { lat, lng } = e.latlng;

                if (window.pickerMode === 'polygon') {
                    if (!window.polygonPoints) window.polygonPoints = [];
                    window.polygonPoints.push([lat, lng]);

                    if (window.pickerPolygon) window.pickerMap.removeLayer(window.pickerPolygon);
                    window.pickerPolygon = L.polygon(window.polygonPoints, {
                        color: 'var(--red-holcim)',
                        fillColor: 'var(--red-holcim)',
                        fillOpacity: 0.3
                    }).addTo(window.pickerMap);

                    document.getElementById('picker-coords-display').textContent = `Puntos: ${window.polygonPoints.length}`;
                } else {
                    if (window.pickerMarker) window.pickerMap.removeLayer(window.pickerMarker);
                    window.pickerMarker = L.marker([lat, lng]).addTo(window.pickerMap);
                    document.getElementById('picker-coords-display').textContent = `[ ${lat.toFixed(6)} , ${lng.toFixed(6)} ]`;
                    window.tempCoords = { lat, lng };
                }
            });
        } else {
            setTimeout(() => window.pickerMap.invalidateSize(), 100);
        }

        // Reset picker state
        if (window.pickerMarker) window.pickerMap.removeLayer(window.pickerMarker);
        window.pickerMarker = null;

        if (window.pickerPolygon) window.pickerMap.removeLayer(window.pickerPolygon);
        window.pickerPolygon = null;
        window.polygonPoints = [];

        document.getElementById('picker-coords-display').textContent = '[ - , - ]';
        window.tempCoords = null;
    };

    window.clearMapPickerPoints = function () {
        window.polygonPoints = [];
        if (window.pickerPolygon) window.pickerMap.removeLayer(window.pickerPolygon);
        window.pickerPolygon = null;
        document.getElementById('picker-coords-display').textContent = 'Puntos: 0';
    };

    window.closeMapPicker = function () {
        const modal = document.getElementById('modal-map-picker');
        if (modal) modal.style.display = 'none';
    };

    window.confirmMapPickerSelection = function () {
        if (window.pickerMode === 'polygon') {
            if (window.polygonPoints && window.polygonPoints.length >= 3) {
                // Return as JSON array string
                document.getElementById(window.activeLatId).value = JSON.stringify(window.polygonPoints);
                window.closeMapPicker();
                showNotification('POLÍGONO SELECCIONADO', 'success');
            } else {
                showNotification('MARQUE AL MENOS 3 PUNTOS PARA EL POLÍGONO', 'warning');
            }
        } else {
            if (window.tempCoords && window.activeLatId && window.activeLngId) {
                document.getElementById(window.activeLatId).value = window.tempCoords.lat.toFixed(6);
                document.getElementById(window.activeLngId).value = window.tempCoords.lng.toFixed(6);
                window.closeMapPicker();
                showNotification('UBICACIÓN SELECCIONADA', 'success');
            } else {
                showNotification('POR FAVOR MARQUE UN PUNTO EN EL MAPA', 'warning');
            }
        }
    };


    // --- SAFETY REPORT SYSTEM ---
    window.openSafetyReportModal = function () {
        const modal = document.getElementById('modal-safety-report');
        if (!modal) return;

        // Set default values
        const now = new Date();
        document.getElementById('sr-date').value = now.toISOString().split('T')[0];
        document.getElementById('sr-time').value = now.toTimeString().slice(0, 5);

        const session = JSON.parse(localStorage.getItem('holcim_session'));
        if (session && session.email) {
            document.getElementById('sr-officer').value = session.email.split('@')[0].toUpperCase();
        }

        modal.style.display = 'flex';
    };

    window.closeSafetyReportModal = function () {
        const modal = document.getElementById('modal-safety-report');
        if (modal) modal.style.display = 'none';
        document.getElementById('safety-report-form').reset();
        document.getElementById('sr-photo-preview').style.display = 'none';
    };

    window.previewSafetyImage = function (event) {
        const input = event.target;
        const preview = document.getElementById('sr-photo-preview');
        const img = document.getElementById('sr-preview-img');

        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                img.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    window.downloadSafetyReportPDF = function () {
        const date = document.getElementById('sr-date').value;
        const time = document.getElementById('sr-time').value;
        const officer = document.getElementById('sr-officer').value;
        const type = document.getElementById('sr-type').value;
        const area = document.getElementById('sr-area').value;
        const people = document.getElementById('sr-people').value;
        const detail = document.getElementById('sr-detail').value;
        const actions = document.getElementById('sr-actions').value;
        const imgData = document.getElementById('sr-preview-img').src;

        if (!date || !officer || !area || !detail || !type) {
            showNotification('Por favor complete los campos obligatorios (*)', 'error');
            return;
        }

        // Create a temporary container for the executive report
        const printContainer = document.createElement('div');
        printContainer.id = 'executive-print-report';
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-9999px';
        printContainer.style.top = '0';
        printContainer.style.width = '210mm';
        printContainer.style.background = 'white';
        printContainer.style.color = '#1e293b';
        printContainer.style.padding = '20mm';
        printContainer.style.fontFamily = "'Inter', sans-serif";
        printContainer.style.zIndex = '9999999';
        printContainer.style.visibility = 'visible';

        printContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 5px solid #009cbd; padding-bottom: 25px; margin-bottom: 35px;">
            <div>
                <h1 style="color: #009cbd; margin: 0; font-size: 36pt; font-weight: 900; letter-spacing: -1.5px;">HOLCIM</h1>
                <p style="margin: 3px 0 0 0; font-size: 11pt; font-weight: 800; color: #64748b; letter-spacing: 4px; text-transform: uppercase;">Seguridad Patrimonial</p>
            </div>
            <div style="text-align: right;">
                <h2 style="margin: 0; font-size: 18pt; color: #1e293b; font-weight: 900; text-transform: uppercase;">Reporte de Incidente</h2>
                <div style="margin-top: 8px; font-size: 12pt; color: #009cbd; font-weight: 800; background: #f0f9ff; padding: 5px 12px; border-radius: 6px; display: inline-block; border: 1px solid #bae6fd;">N° ${Date.now().toString().slice(-8)}</div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 35px; background: #f0f9ff; padding: 30px; border-radius: 15px; border: 1px solid #bae6fd; box-shadow: inset 0 0 20px rgba(0, 156, 189, 0.05);">
            <div style="grid-column: span 1;">
                <p style="margin: 0 0 8px 0; font-size: 9pt; color: #0369a1; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px;">Fecha y Hora</p>
                <p style="margin: 0; font-size: 12pt; font-weight: 700; color: #0c4a6e;">${date} | ${time}</p>
            </div>
            <div style="grid-column: span 2;">
                <p style="margin: 0 0 8px 0; font-size: 9pt; color: #0369a1; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px;">Ubicación / Sector</p>
                <p style="margin: 0; font-size: 12pt; font-weight: 700; color: #0c4a6e;">${area}</p>
            </div>
            <div style="grid-column: span 1;">
                <p style="margin: 0 0 8px 0; font-size: 9pt; color: #0369a1; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px;">Tipo de Evento</p>
                <p style="margin: 0; font-size: 12pt; font-weight: 700; color: #0c4a6e; text-transform: uppercase;">${type}</p>
            </div>
            <div style="grid-column: span 2;">
                <p style="margin: 0 0 8px 0; font-size: 9pt; color: #0369a1; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px;">Oficial Reportante</p>
                <p style="margin: 0; font-size: 12pt; font-weight: 700; color: #0c4a6e;">${officer}</p>
            </div>
        </div>

        ${people ? `
        <div style="margin-bottom: 30px; break-inside: avoid;">
            <h3 style="border-left: 8px solid #009cbd; padding-left: 18px; font-size: 14pt; margin-bottom: 15px; color: #0891b2; font-weight: 900; text-transform: uppercase;">Personas Involucradas</h3>
            <div style="font-size: 11pt; color: #334155; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px; background: #fff;">${people}</div>
        </div>
        ` : ''}

        <div style="margin-bottom: 30px; break-inside: avoid;">
            <h3 style="border-left: 8px solid #009cbd; padding-left: 18px; font-size: 14pt; margin-bottom: 15px; color: #0891b2; font-weight: 900; text-transform: uppercase;">Descripción de los Hechos</h3>
            <div style="font-size: 11pt; line-height: 1.8; color: #334155; white-space: pre-wrap; text-align: justify; border: 1px solid #e2e8f0; padding: 25px; border-radius: 10px; min-height: 120px; background: #fff;">${detail}</div>
        </div>

        ${actions ? `
        <div style="margin-bottom: 30px; break-inside: avoid;">
            <h3 style="border-left: 8px solid #009cbd; padding-left: 18px; font-size: 14pt; margin-bottom: 15px; color: #0891b2; font-weight: 900; text-transform: uppercase;">Acciones Tomadas</h3>
            <div style="font-size: 11pt; line-height: 1.8; color: #334155; white-space: pre-wrap; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px; background: #fdfdfd;">${actions}</div>
        </div>
        ` : ''}

        ${imgData && imgData.startsWith('data:image') ? `
        <div style="margin-bottom: 40px; break-inside: avoid;">
            <h3 style="border-left: 8px solid #009cbd; padding-left: 18px; font-size: 14pt; margin-bottom: 15px; color: #0891b2; font-weight: 900; text-transform: uppercase;">Evidencia Fotográfica</h3>
            <div style="text-align: center; border: 2px dashed #009cbd; padding: 20px; border-radius: 15px; background: #fafafa;">
                <img src="${imgData}" style="max-width: 100%; max-height: 400px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.12);">
            </div>
        </div>
        ` : ''}

        <div style="margin-top: 80px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; break-inside: avoid;">
            <div style="text-align: center;">
                <div style="border-top: 2.5px solid #009cbd; width: 85%; margin: 0 auto 12px auto;"></div>
                <p style="margin: 0; font-size: 11pt; font-weight: 900; color: #1e293b;">${officer}</p>
                <p style="margin: 0; font-size: 9pt; color: #64748b; font-weight: 700; letter-spacing: 1px;">FIRMA DE OFICIAL</p>
            </div>
            <div style="text-align: center;">
                <div style="border-top: 2.5px solid #cbd5e1; width: 85%; margin: 0 auto 12px auto;"></div>
                <p style="margin: 0; font-size: 11pt; font-weight: 900; color: #1e293b;">&nbsp;</p>
                <p style="margin: 0; font-size: 9pt; color: #64748b; font-weight: 700; letter-spacing: 1px;">SUPERVISIÓN / RECIBIDO</p>
            </div>
        </div>

        <div style="position: fixed; bottom: 12mm; left: 20mm; right: 20mm; text-align: center; border-top: 1px solid #bae6fd; padding-top: 15px;">
            <span style="color: #64748b; font-size: 10pt; font-weight: 600;">Generado por Sistema de Monitoreo el ${new Date().toLocaleString()}</span>
        </div>
    `;

        document.body.appendChild(printContainer);

        // Filter to hide non-print elements
        const elementsToHide = document.querySelectorAll('body > *:not(#executive-print-report)');
        const originalStyles = [];
        elementsToHide.forEach(el => {
            originalStyles.push({ el, display: el.style.display });
            el.style.display = 'none';
        });

        printContainer.style.position = 'static';
        printContainer.style.left = '0';

        setTimeout(() => {
            window.print();

            // Restore
            elementsToHide.forEach((item, index) => {
                item.el.style.display = originalStyles[index].display;
            });
            document.body.removeChild(printContainer);

            showNotification('Reporte generado en formato ejecutivo', 'success');
            addLogEvent('FORMS', 'Reporte ejecutivo generado: ' + type);
        }, 500);
    };

    // ===================== DB EDIT FUNCTIONS =====================

    // --- LLAVES ---
    window.openEditDbKey = function (num) {
        const keys = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_inventory_keys')) || '[]');
        const key = keys.find(k => k.num === num);
        if (!key) return;
        document.getElementById('edit-db-key-num').value = key.num;
        document.getElementById('edit-db-key-num-display').value = '#' + key.num;
        document.getElementById('edit-db-key-name').value = key.name;
        document.getElementById('edit-db-key-alert').value = key.securityAlert || '';
        document.getElementById('edit-db-key-status').value = key.status || 'OPERATIVA';
        document.getElementById('modal-edit-db-key').style.display = 'flex';
    };

    window.saveEditDbKey = function () {
        const num = parseInt(document.getElementById('edit-db-key-num').value);
        const storageKey = window.getSiteKey('holcim_inventory_keys');
        let keys = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const idx = keys.findIndex(k => k.num === num);
        if (idx === -1) return;
        keys[idx].name = document.getElementById('edit-db-key-name').value.trim().toUpperCase();
        keys[idx].securityAlert = document.getElementById('edit-db-key-alert').value.trim();
        keys[idx].status = document.getElementById('edit-db-key-status').value;
        localStorage.setItem(storageKey, JSON.stringify(keys));
        document.getElementById('modal-edit-db-key').style.display = 'none';
        showNotification('LLAVE ACTUALIZADA', 'success');
        addLogEvent('DB', 'Llave #' + num + ' editada');
        if (typeof renderDbKeys === 'function') renderDbKeys();
        else window.renderDbKeys && window.renderDbKeys();
    };

    // --- CARNETS ---
    window.openEditDbBadge = function (num) {
        const badges = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_badge_inventory')) || '[]');
        const badge = badges.find(b => b.num === num);
        if (!badge) return;
        document.getElementById('edit-db-badge-num').value = badge.num;
        document.getElementById('edit-db-badge-num-display').value = '#' + badge.num;
        document.getElementById('edit-db-badge-code').value = badge.code || '';
        document.getElementById('edit-db-badge-alert').value = badge.alert || '';
        document.getElementById('modal-edit-db-badge').style.display = 'flex';
    };

    window.saveEditDbBadge = function () {
        const num = document.getElementById('edit-db-badge-num').value;
        const storageKey = window.getSiteKey('holcim_badge_inventory');
        let badges = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const idx = badges.findIndex(b => b.num === num);
        if (idx === -1) return;
        badges[idx].code = document.getElementById('edit-db-badge-code').value.trim().toUpperCase();
        badges[idx].alert = document.getElementById('edit-db-badge-alert').value.trim();
        localStorage.setItem(storageKey, JSON.stringify(badges));
        document.getElementById('modal-edit-db-badge').style.display = 'none';
        showNotification('CARNET ACTUALIZADO', 'success');
        addLogEvent('DB', 'Carnet #' + num + ' editado');
        window.updateBadgeDropdown && window.updateBadgeDropdown();
        // Re-render badges
        const body = document.getElementById('db-badge-list-body');
        if (body) {
            const all = JSON.parse(localStorage.getItem(storageKey) || '[]');
            body.innerHTML = all.sort((a, b) => a.num.localeCompare(b.num)).map(b => `
            <div class="list-row" style="grid-template-columns: 100px 120px 1fr 160px;">
                <strong>#${b.num}</strong>
                <span>${b.code}</span>
                <span style="font-size:0.8rem; color:var(--text-muted)">${b.alert || '-'}</span>
                <div style="display:flex;gap:4px;">
                    <button class="btn-salida-corpo" onclick="openEditDbBadge('${b.num}')" style="padding:2px 8px; font-size:0.7rem; background:var(--primary-teal); color:white; border-color:var(--primary-teal);"><i class="fas fa-pen"></i></button>
                    <button class="btn-salida-corpo" onclick="deleteDbBadge('${b.num}')">ELIMINAR</button>
                </div>
            </div>
        `).join('');
        }
    };

    // --- PERSONAL (DIRECTORIO) ---
    // ===================== SHIFT NOTES (INDICACIONES) FUNCTIONS =====================
    window.renderNotesList = function () {
        const body = document.getElementById('notes-list-body');
        if (!body) return;

        const notes = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_shift_notes')) || '[]');
        const filterDate = document.getElementById('note-list-filter-date')?.value;

        let filtered = notes;
        if (filterDate) {
            filtered = notes.filter(n => n.date === filterDate);
        }

        // Sort by date (descending)
        filtered.sort((a, b) => new Date(b.date + 'T' + (b.time || '00:00')) - new Date(a.date + 'T' + (a.time || '00:00')));

        if (filtered.length === 0) {
            body.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-muted); grid-column:1/-1">No hay indicaciones registradas.</div>';
            return;
        }

        const user = getSession();

        body.innerHTML = filtered.map(n => {
            return `
                <div class="list-row" style="grid-template-columns: 120px 1fr 100px 100px; font-size: 0.85rem; border-left: 4px solid var(--primary-teal);">
                    <div style="color:var(--primary-teal)"><strong>${new Date(n.date + 'T00:00').toLocaleDateString()}</strong></div>
                    <div style="padding-right: 15px;">
                        <strong style="display:block; margin-bottom:4px; color:var(--navy-black);">${n.title}</strong>
                        <p style="font-size:0.75rem; color:#475569; margin:0; line-height:1.4; white-space: pre-wrap;">${n.content || '-'}</p>
                    </div>
                    <span style="font-size:0.7rem; color:var(--text-muted);">${n.user || 'Sistema'}</span>
                    <div style="display:flex; gap:5px; align-items: center;">
                        <button class="btn-crear" onclick="editShiftNote('${n.id}')" style="padding:4px 8px; font-size:0.65rem; width:auto; height:auto; margin:0; background:var(--primary-teal); border:none;">EDITAR</button>
                        <button class="btn-salida-corpo" onclick="deleteShiftNote('${n.id}')" style="padding:4px 8px; font-size:0.65rem; background:#ef4444; color:white; border:none; width:auto; height:auto; margin:0;">BORRAR</button>
                    </div>
                </div>
            `;
        }).join('');
    };

    const shiftNotesForm = document.getElementById('shift-notes-form');
    if (shiftNotesForm) {
        shiftNotesForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const title = document.getElementById('note-title').value.trim();
            const date = document.getElementById('note-date').value;
            const content = document.getElementById('note-content').value.trim();
            const id = document.getElementById('note-id').value;
            const user = getSession();

            const storageKey = window.getSiteKey('holcim_shift_notes');
            let notes = [];
            try {
                const stored = localStorage.getItem(storageKey);
                notes = stored ? JSON.parse(stored) : [];
                if (!Array.isArray(notes)) notes = [];
            } catch (e) { notes = []; }

            if (id) {
                // Update existing
                const idx = notes.findIndex(n => n.id === id);
                if (idx !== -1) {
                    notes[idx] = { ...notes[idx], title, date, content, updatedAt: new Date().toISOString() };
                    showNotification('INDICACIÓN ACTUALIZADA', 'success');
                }
            } else {
                // Create new
                notes.push({
                    id: 'sn_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                    title, date, content,
                    user: user ? user.username : 'Oficial',
                    createdAt: new Date().toISOString()
                });
                showNotification('INDICACIÓN REGISTRADA', 'success');
            }

            localStorage.setItem(storageKey, JSON.stringify(notes));
            addLogEvent('NOTAS', (id ? 'Editada' : 'Nueva') + ' indicación: ' + title);
            resetNoteForm();
            renderNotesList();
        });
    }

    // --- CONSOLIDATED SETTINGS HELPERS ---
    window.exportSystemData = function () {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('holcim_') || key.startsWith('audit_') || key.includes('_SECURITY_HUB')) {
                data[key] = localStorage.getItem(key);
            }
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HOLCIM_HUB_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('RESPALDO DESCARGADO', 'success');
    };

    window.importSystemData = function (event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                if (confirm('Esto reemplazará los datos actuales. ¿Desea continuar?')) {
                    Object.keys(data).forEach(key => localStorage.setItem(key, data[key]));
                    alert('Datos importados con éxito. La página se recargará.');
                    location.reload();
                }
            } catch (err) { alert('Error al procesar el archivo.'); }
        };
        reader.readAsText(file);
    };

    window.updateSystemSiteName = function () {
        const newName = document.getElementById('config-site-name').value.trim();
        if (!newName) return;
        const session = getSession();
        if (session) {
            session.site = newName;
            setSession(session);
            // Also update user in users list
            let users = JSON.parse(localStorage.getItem('holcim_users'));
            const uIdx = users.findIndex(u => u.email === session.email);
            if (uIdx !== -1) {
                users[uIdx].site = newName;
                localStorage.setItem('holcim_users', JSON.stringify(users));
            }
            alert('Nombre del sitio actualizado. Se requiere recargar.');
            location.reload();
        }
    };

    window.editShiftNote = function (id) {
        const notes = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_shift_notes')) || '[]');
        const note = notes.find(n => n.id === id);
        if (!note) return;

        document.getElementById('note-id').value = note.id;
        document.getElementById('note-title').value = note.title;
        document.getElementById('note-date').value = note.date;
        document.getElementById('note-content').value = note.content;

        document.getElementById('notes-form-title').innerHTML = '<i class="fas fa-edit"></i> Editando Indicación';
        document.getElementById('btn-cancel-note').style.display = 'block';
        document.getElementById('note-title').focus();
    };

    window.deleteShiftNote = function (id) {
        if (!confirm('¿Seguro que desea eliminar esta indicación?')) return;
        const storageKey = window.getSiteKey('holcim_shift_notes');
        let notes = JSON.parse(localStorage.getItem(storageKey) || '[]');
        notes = notes.filter(n => n.id !== id);
        localStorage.setItem(storageKey, JSON.stringify(notes));
        showNotification('INDICACIÓN ELIMINADA', 'info');
        renderNotesList();
    };

    window.resetNoteForm = function () {
        const form = document.getElementById('shift-notes-form');
        if (form) form.reset();
        document.getElementById('note-id').value = '';
        document.getElementById('notes-form-title').innerHTML = '<i class="fas fa-pen-to-square"></i> Nueva Indicación';
        document.getElementById('btn-cancel-note').style.display = 'none';
    };

    // --- RISK POINTS IDENTIFICATION LOGIC (SEISMIC MAP) ---
    window.zonesMap = null;
    window.riskLayers = {};
    window.cctvLayer = null;
    window.apLayer = null;
    window.mapSelectionMode = null; // { type: 'cctv'|'ap', id: ... }

    window.initSecurityZonesMap = function () {
        if (window.zonesMap) {
            setTimeout(() => window.zonesMap.invalidateSize(), 100);
            return;
        }

        const mapDiv = document.getElementById('security-zones-map');
        if (!mapDiv) return;

        // Base Layers
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        });

        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        });

        window.zonesMap = L.map('security-zones-map', {
            center: [9.9281, -84.0907],
            zoom: 15,
            layers: [osm]
        });

        const baseLayers = {
            "Estándar": osm,
            "Satélite": satellite
        };

        window.cctvLayer = L.layerGroup().addTo(window.zonesMap);
        window.apLayer = L.layerGroup().addTo(window.zonesMap);
        const riskLayer = L.layerGroup().addTo(window.zonesMap);
        window.perimeterLayer = L.layerGroup().addTo(window.zonesMap);
        window._riskLayerGroup = riskLayer;

        const overlayLayers = {
            "Puntos de Riesgo": riskLayer,
            "Cámaras CCTV": window.cctvLayer,
            "Puntos de Acceso": window.apLayer,
            "Perímetros": window.perimeterLayer
        };
        L.control.layers(baseLayers, overlayLayers).addTo(window.zonesMap);

        // Map Click & Context Menu Logic
        window.zonesMap.on('contextmenu', function (e) {
            if (window._isDrawingPerimeter) {
                // If drawing, right click finishes perimeter
                if (window._currentPerimeterPoints.length > 2) {
                    document.getElementById('modal-perimeter-note').style.display = 'flex';
                }
                return;
            }

            window._lastMapContextClick = e.latlng;
            const menu = document.getElementById('map-context-menu');
            if (menu) {
                menu.style.display = 'block';
                menu.style.left = e.originalEvent.pageX + 'px';
                menu.style.top = e.originalEvent.pageY + 'px';
            }
        });

        // Hide context menu on normal click
        window.zonesMap.on('click', function (e) {
            const menu = document.getElementById('map-context-menu');
            if (menu) menu.style.display = 'none';

            if (window._isDrawingPerimeter) {
                window._currentPerimeterPoints.push(e.latlng);
                if (window._currentPerimeterLine) {
                    window.zonesMap.removeLayer(window._currentPerimeterLine);
                }
                window._currentPerimeterLine = L.polyline(window._currentPerimeterPoints, { color: '#f59e0b', dashArray: '5, 5' }).addTo(window.zonesMap);
                return;
            }

            if (window.mapSelectionMode) {
                const { type, id, resolve } = window.mapSelectionMode;
                resolve(e.latlng.lat, e.latlng.lng);
                window.mapSelectionMode = null;
                window.zonesMap.getContainer().style.cursor = '';
                return;
            }

            // Default action: open risk modal
            window.openRiskModal(e.latlng.lat, e.latlng.lng);
        });

        // Double click to finish perimeter
        window.zonesMap.on('dblclick', function (e) {
            if (window._isDrawingPerimeter && window._currentPerimeterPoints.length > 2) {
                document.getElementById('modal-perimeter-note').style.display = 'flex';
                // Note: The form submission handles saving and rendering
            }
        });
        window.zonesMap.doubleClickZoom.disable();

        renderRiskPoints();
        renderCctvMarkers();
        renderApMarkers();
        if (window.renderPerimeters) window.renderPerimeters();
        updateRiskStats();
    };

    window.handleRiskPhotoSelect = function (input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                document.getElementById('risk-photo-preview').src = e.target.result;
                document.getElementById('risk-photo-data').value = e.target.result;
                document.getElementById('risk-photo-preview-container').style.display = 'block';
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    window.removeRiskPhoto = function () {
        document.getElementById('risk-photo-input').value = '';
        document.getElementById('risk-photo-data').value = '';
        document.getElementById('risk-photo-preview').src = '';
        document.getElementById('risk-photo-preview-container').style.display = 'none';
    };

    window.openRiskModal = function (lat, lng) {
        document.getElementById('risk-id').value = '';
        document.getElementById('risk-lat').value = lat;
        document.getElementById('risk-lng').value = lng;
        document.getElementById('risk-location-coords').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        document.getElementById('risk-identification-form').reset();
        window.removeRiskPhoto();
        document.querySelector('#modal-zone-checklist h3').innerHTML = '<i class="fas fa-triangle-exclamation"></i> Registrar Nuevo Punto de Riesgo';
        document.getElementById('modal-zone-checklist').style.display = 'flex';
    };

    window.openRiskEdit = function (id) {
        const risks = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_risk_points')) || '[]');
        const risk = risks.find(r => r.id === id);
        if (!risk) return;

        document.getElementById('risk-id').value = risk.id;
        document.getElementById('risk-lat').value = risk.lat;
        document.getElementById('risk-lng').value = risk.lng;
        document.getElementById('risk-location-coords').textContent = `${risk.lat.toFixed(6)}, ${risk.lng.toFixed(6)}`;

        document.getElementById('risk-title').value = risk.title;
        document.getElementById('risk-level').value = risk.level;
        document.getElementById('risk-sector').value = risk.sector;
        document.getElementById('risk-desc').value = risk.desc || '';

        if (risk.photo) {
            document.getElementById('risk-photo-data').value = risk.photo;
            document.getElementById('risk-photo-preview').src = risk.photo;
            document.getElementById('risk-photo-preview-container').style.display = 'block';
        } else {
            window.removeRiskPhoto();
        }

        document.querySelector('#modal-zone-checklist h3').innerHTML = '<i class="fas fa-edit"></i> Editar Punto de Riesgo';
        document.getElementById('modal-zone-checklist').style.display = 'flex';
    };

    window.closeRiskModal = function () {
        document.getElementById('modal-zone-checklist').style.display = 'none';
    };

    window.renderRiskPoints = function () {
        if (!window.zonesMap) return;

        // Clear existing markers
        Object.values(window.riskLayers).forEach(layer => window.zonesMap.removeLayer(layer));
        window.riskLayers = {};

        const risks = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_risk_points')) || '[]');

        risks.forEach(risk => {
            const className = `risk-${risk.level.toLowerCase()}`;

            // Create seismic wave icon
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `
                    <div class="risk-marker ${className}">
                        <div class="risk-marker-wave"></div>
                        <div class="risk-marker-wave"></div>
                        <div class="risk-marker-wave"></div>
                        <div class="risk-marker-inner"></div>
                    </div>
                `,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            const marker = L.marker([risk.lat, risk.lng], { icon }).addTo(window.zonesMap);
            window.riskLayers[risk.id] = marker;

            const popupContent = `
                <div style="min-width: 220px;">
                    <div style="font-weight: 800; color: #e11d48; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px; display:flex; justify-content:space-between; align-items:center;">
                        <span><i class="fas fa-triangle-exclamation"></i> ${risk.title}</span>
                    </div>
                    ${risk.photo ? `<img src="${risk.photo}" style="width:100%; border-radius:4px; margin-bottom:8px; border:1px solid #eee;">` : ''}
                    <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 8px;">
                        <strong>Sectores:</strong> ${risk.sector}<br>
                        <strong>Nivel:</strong> <span class="badge-motivo" style="padding: 2px 6px; font-size:0.6rem; color: white; background: ${risk.level === 'RED' ? '#ef4444' : (risk.level === 'YELLOW' ? '#f59e0b' : '#10b981')}">${risk.level}</span>
                    </div>
                    <div style="font-size: 0.8rem; background: #f8fafc; padding: 8px; border-radius: 4px; border-left: 3px solid #cbd5e1; margin-bottom:10px;">
                        ${risk.desc || 'Sin descripción detallada.'}
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:5px;">
                        <button onclick="window.openRiskEdit('${risk.id}')" style="padding: 5px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.65rem; cursor: pointer;">
                            <i class="fas fa-edit"></i> EDITAR
                        </button>
                        <button onclick="window.sendRiskEmail('${risk.id}')" style="padding: 5px; background: #4f46e5; color: white; border: none; border-radius: 4px; font-size: 0.65rem; cursor: pointer;">
                            <i class="fas fa-envelope"></i> CORREO
                        </button>
                        <button onclick="window.openRiskTracking('${risk.id}')" style="padding: 5px; background: #0f172a; color: white; border: none; border-radius: 4px; font-size: 0.65rem; cursor: pointer; grid-column: span 2;">
                            <i class="fas fa-clipboard-list"></i> SEGUIMIENTO ${risk.tracking && risk.tracking.length > 0 ? '(' + risk.tracking.length + ')' : ''}
                        </button>
                    </div>
                    <button onclick="window.deleteRiskPoint('${risk.id}')" style="width: 100%; padding: 5px; background: #fee2e2; color: #ef4444; border: 1px solid #fecaca; border-radius: 4px; font-size: 0.65rem; cursor: pointer;">
                        <i class="fas fa-trash-can"></i> ELIMINAR
                    </button>
                </div>
            `;
            marker.bindPopup(popupContent);
        });
    };

    window.renderCctvMarkers = function () {
        if (!window.cctvLayer) return;
        window.cctvLayer.clearLayers();
        const cameras = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_cctv_inventory')) || '[]');

        cameras.forEach(cam => {
            if (!cam.lat || !cam.lng) return;
            const isOp = cam.status === 'OPERATIVO';
            const colorClass = isOp ? 'cctv-operational' : 'cctv-failure';
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="cctv-marker ${colorClass}"><i class="fas fa-video"></i></div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            const m = L.marker([cam.lat, cam.lng], { icon }).addTo(window.cctvLayer);
            m.bindPopup(`
                <div style="min-width:220px;">
                    <div style="font-weight:800; border-bottom:1px solid #eee; padding-bottom:5px; margin-bottom:8px; color:${isOp ? '#059669' : '#dc2626'};">
                        <i class="fas fa-video"></i> ${cam.location}
                    </div>
                    ${cam.photo ? `<img src="${cam.photo}" style="width:100%; border-radius:4px; margin-bottom:8px; border:1px solid #eee;">` : ''}
                    <div style="font-size:0.75rem; color:#64748b; line-height:1.8;">
                        <strong>Tipo:</strong> ${cam.type}<br>
                        <strong>Marca:</strong> ${cam.brand || '-'}<br>
                        <strong>IP:</strong> <code>${cam.ip || '-'}</code><br>
                        <strong>Analytics:</strong> ${Array.isArray(cam.analyticsType) ? cam.analyticsType.join(', ') : (cam.analyticsType || '-')}<br>
                        <strong>Observación:</strong> ${cam.observation || '-'}
                    </div>
                    <div style="margin-top:10px; margin-bottom:10px;">
                        <label style="font-size:0.65rem; font-weight:700; text-transform:uppercase; color:#475569;">Cambiar Estado:</label>
                        <select onchange="window.updateCctvStatus('${cam.id}', this.value)" style="width:100%; margin-top:4px; margin-bottom:10px; padding:5px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.75rem;">
                            <option value="OPERATIVO" ${cam.status === 'OPERATIVO' ? 'selected' : ''}>OPERATIVO</option>
                            <option value="FALLA" ${cam.status === 'FALLA' ? 'selected' : ''}>FALLA</option>
                            <option value="MANTENIMIENTO" ${cam.status === 'MANTENIMIENTO' ? 'selected' : ''}>MANTENIMIENTO</option>
                            <option value="FUERA DE SERVICIO" ${cam.status === 'FUERA DE SERVICIO' ? 'selected' : ''}>FUERA DE SERVICIO</option>
                        </select>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:5px;">
                            <button onclick="window.sendCctvEmail('${cam.id}')" style="padding: 5px; background: #4f46e5; color: white; border: none; border-radius: 4px; font-size: 0.65rem; cursor: pointer;">
                                <i class="fas fa-envelope"></i> CORREO
                            </button>
                            <button onclick="window.openCctvTracking('${cam.id}')" style="padding: 5px; background: #0f172a; color: white; border: none; border-radius: 4px; font-size: 0.65rem; cursor: pointer;">
                                <i class="fas fa-clipboard-list"></i> HISTORIAL
                            </button>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px;">
                            <button onclick="window.openEditCctvFromMap('${cam.id}')" style="padding: 5px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.65rem; cursor: pointer;">
                                <i class="fas fa-edit"></i> EDITAR
                            </button>
                            <button onclick="window.deleteCctvFromMap('${cam.id}')" style="padding: 5px; background: #fee2e2; color: #ef4444; border: 1px solid #fecaca; border-radius: 4px; font-size: 0.65rem; cursor: pointer;">
                                <i class="fas fa-trash-can"></i> ELIMINAR
                            </button>
                        </div>
                    </div>
                </div>
            `);
        });
    };

    window.updateCctvStatus = function (id, newStatus) {
        const key = window.getSiteKey('holcim_cctv_inventory');
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = items.findIndex(i => String(i.id) === String(id));
        if (idx > -1) {
            items[idx].status = newStatus;
            localStorage.setItem(key, JSON.stringify(items));
            showNotification('ESTADO CCTV ACTUALIZADO: ' + newStatus, 'success');
            setTimeout(() => renderCctvMarkers(), 300);
            if (window.renderDbCCTV) window.renderDbCCTV();
        }
    };

    window.renderApMarkers = function () {
        if (!window.apLayer) return;
        window.apLayer.clearLayers();
        const points = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_access_points')) || '[]');

        points.forEach(ap => {
            if (!ap.lat || !ap.lng) return;
            const apStatus = ap.currentStatus || 'OPERATIVO';
            const isOp = apStatus === 'OPERATIVO';
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="ap-marker" style="background:${isOp ? '#4f46e5' : '#dc2626'};"><i class="fas fa-door-open"></i></div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            const m = L.marker([ap.lat, ap.lng], { icon }).addTo(window.apLayer);
            m.bindPopup(`
                <div style="min-width:220px;">
                    <div style="font-weight:800; border-bottom:1px solid #eee; padding-bottom:5px; margin-bottom:8px; color:${isOp ? '#4f46e5' : '#dc2626'};">
                        <i class="fas fa-door-open"></i> ${ap.name || ap.location || 'Punto de Acceso'}
                    </div>
                    <div style="font-size:0.75rem; color:#64748b; line-height:1.8;">
                        <strong>Tipo:</strong> ${ap.type || '-'}<br>
                        <strong>Descripción:</strong> ${ap.description || ap.desc || '-'}
                    </div>
                    <div style="margin-top:10px;">
                        <label style="font-size:0.65rem; font-weight:700; text-transform:uppercase; color:#475569;">Cambiar Estado:</label>
                        <select onchange="window.updateApStatus('${ap.id}', this.value)" style="width:100%; margin-top:4px; margin-bottom:10px; padding:5px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.75rem;">
                            <option value="OPERATIVO" ${apStatus === 'OPERATIVO' ? 'selected' : ''}>OPERATIVO</option>
                            <option value="FALLA" ${apStatus === 'FALLA' ? 'selected' : ''}>FALLA</option>
                            <option value="MANTENIMIENTO" ${apStatus === 'MANTENIMIENTO' ? 'selected' : ''}>MANTENIMIENTO</option>
                            <option value="CERRADO" ${apStatus === 'CERRADO' ? 'selected' : ''}>CERRADO</option>
                        </select>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:5px;">
                            <button onclick="window.openApTracking('${ap.id}')" style="padding: 5px; background: #0f172a; color: white; border: none; border-radius: 4px; font-size: 0.65rem; cursor: pointer; grid-column: span 2;">
                                <i class="fas fa-clipboard-list"></i> SEGUIMIENTO
                            </button>
                            <button onclick="window.openEditApFromMap('${ap.id}')" style="padding: 5px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.65rem; cursor: pointer;">
                                <i class="fas fa-edit"></i> EDITAR
                            </button>
                            <button onclick="window.deleteApFromMap('${ap.id}')" style="padding: 5px; background: #fee2e2; color: #ef4444; border: 1px solid #fecaca; border-radius: 4px; font-size: 0.65rem; cursor: pointer;">
                                <i class="fas fa-trash-can"></i> ELIMINAR
                            </button>
                        </div>
                    </div>
                </div>
            `);
        });
    };

    window.updateApStatus = function (id, newStatus) {
        const key = window.getSiteKey('holcim_access_points');
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = items.findIndex(i => String(i.id) === String(id));
        if (idx > -1) {
            items[idx].currentStatus = newStatus;
            localStorage.setItem(key, JSON.stringify(items));
            showNotification('ESTADO PUNTO DE ACCESO ACTUALIZADO: ' + newStatus, 'success');
            setTimeout(() => renderApMarkers(), 300);
        }
    };

    // Pin an item to the map by clicking
    window.pinToMap = function (storageKey, id) {
        if (!window.zonesMap) {
            // Navigate to the map tab first
            const secBtn = document.querySelector('[data-view="security-systems"]');
            if (secBtn) secBtn.click();
            setTimeout(() => window.pinToMap(storageKey, id), 800);
            return;
        }
        showNotification('HAZ CLIC EN EL MAPA PARA POSICIONAR', 'info');
        window.zonesMap.getContainer().style.cursor = 'crosshair';
        window.mapSelectionMode = {
            type: storageKey,
            id: id,
            resolve: function (lat, lng) {
                const items = JSON.parse(localStorage.getItem(window.getSiteKey(storageKey)) || '[]');
                const idx = items.findIndex(i => String(i.id) === String(id));
                if (idx > -1) {
                    items[idx].lat = lat;
                    items[idx].lng = lng;
                    localStorage.setItem(window.getSiteKey(storageKey), JSON.stringify(items));
                    showNotification('COORDENADAS GUARDADAS', 'success');
                    if (storageKey === 'holcim_cctv_inventory') {
                        renderCctvMarkers();
                        if (window.renderDbCCTV) window.renderDbCCTV();
                    } else if (storageKey === 'holcim_access_points') {
                        renderApMarkers();
                        if (window.renderAccessPointsChecklist) window.renderAccessPointsChecklist();
                    }
                }
            }
        };
    };

    window.updateRiskStats = function () {
        const risks = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_risk_points')) || '[]');
        const stats = { RED: 0, YELLOW: 0, GREEN: 0 };
        risks.forEach(r => {
            if (r.level && stats[r.level] !== undefined) {
                stats[r.level]++;
            }
        });

        const redEl = document.getElementById('stats-zones-red');
        const yellowEl = document.getElementById('stats-zones-yellow');
        const greenEl = document.getElementById('stats-zones-green');

        if (redEl) redEl.textContent = stats.RED;
        if (yellowEl) yellowEl.textContent = stats.YELLOW;
        if (greenEl) greenEl.textContent = stats.GREEN;
    };

    // ==== CCTV TRACKING AND EMAIL ====
    window.sendCctvEmail = function (id) {
        const cameras = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_cctv_inventory')) || '[]');
        const cam = cameras.find(c => c.id === id);
        if (!cam) return;

        const subject = encodeURIComponent(`REPORTE DE CCTV: ${cam.location} - ${cam.type}`);
        const body = encodeURIComponent(
            `DETALLES DE EQUIPO CCTV\n` +
            `------------------------------------------\n` +
            `UBICACIÓN: ${cam.location}\n` +
            `TIPO: ${cam.type}\n` +
            `MARCA/MODELO: ${cam.brand || 'N/A'}\n` +
            `IP: ${cam.ip || 'N/A'}\n` +
            `ESTADO ACTUAL: ${cam.status}\n\n` +
            `OBSERVACIONES:\n${cam.observation || 'Sin observaciones'}\n\n` +
            `* Generado desde el MONITOREO DE SEGURIDAD PATRIMONIAL Central.`
        );

        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    window.openCctvTracking = function (id) {
        // Reuse Risk Tracking Modal for CCTV
        const cameras = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_cctv_inventory')) || '[]');
        const cam = cameras.find(c => c.id === id);
        if (!cam) return;

        // Set a flag or special ID format so saveRiskAction knows it's CCTV
        document.getElementById('tracking-risk-id').value = 'cctv_' + id;
        document.getElementById('tracking-risk-title-display').innerHTML = `<i class="fas fa-video"></i> ${cam.location}`;

        const statusLabel = cam.trackingStatus || 'SIN GESTIÓN';
        const statusColors = { EN_PROCESO: '#f59e0b', RESUELTO: '#059669', ESCALADO: '#dc2626', PENDIENTE: '#64748b' };
        const statusBg = statusColors[cam.trackingStatus] || '#94a3b8';
        const levelBg = cam.status === 'OPERATIVO' ? '#10b981' : (cam.status === 'FALLA' ? '#ef4444' : '#f59e0b');

        document.getElementById('tracking-risk-meta').innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div>
                    <strong style="font-size:0.85rem;">CCTV: ${cam.type}</strong><br>
                    <span style="color:#64748b; font-size:0.75rem;">IP: ${cam.ip || 'N/A'} &nbsp;|&nbsp; Coord: ${cam.lat ? cam.lat.toFixed(4) : '-'}, ${cam.lng ? cam.lng.toFixed(4) : '-'}</span>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    <span style="padding:3px 10px; border-radius:20px; background:${levelBg}; color:white; font-size:0.65rem; font-weight:700;">${cam.status}</span>
                    <span style="padding:3px 10px; border-radius:20px; background:${statusBg}; color:white; font-size:0.65rem; font-weight:700;">${statusLabel}</span>
                </div>
            </div>
        `;

        document.getElementById('tracking-responsible').value = '';
        document.getElementById('tracking-new-status').value = '';
        document.getElementById('tracking-action-desc').value = '';

        renderTrackingActions(cam.tracking || []);
        document.getElementById('modal-risk-tracking').style.display = 'flex';
    };

    // ==== MAP CONTEXT MENU AND PERIMETERS ====
    window.handleMapContextClick = function (action) {
        document.getElementById('map-context-menu').style.display = 'none';
        const latlng = window._lastMapContextClick;
        if (!latlng) return;

        if (action === 'camara') {
            document.getElementById('map-cctv-id').value = '';
            document.getElementById('map-cctv-lat').value = latlng.lat;
            document.getElementById('map-cctv-lng').value = latlng.lng;
            document.getElementById('map-cctv-form').reset();
            document.querySelector('#modal-cctv-registration h3').innerHTML = '<i class="fas fa-video"></i> Registrar Nueva Cámara (CCTV)';
            document.getElementById('modal-cctv-registration').style.display = 'flex';
        } else if (action === 'acceso') {
            document.getElementById('map-ap-id').value = '';
            document.getElementById('map-ap-lat').value = latlng.lat;
            document.getElementById('map-ap-lng').value = latlng.lng;
            document.getElementById('map-ap-form').reset();
            document.querySelector('#modal-ap-registration h3').innerHTML = '<i class="fas fa-door-open"></i> Registrar Punto de Acceso';
            document.getElementById('modal-ap-registration').style.display = 'flex';
        } else if (action === 'riesgo') {
            window.openRiskModal(latlng.lat, latlng.lng);
        } else if (action === 'perimetro') {
            window._isDrawingPerimeter = true;
            window._currentPerimeterPoints = [latlng];
            showNotification('HAGA CLIC EN EL MAPA PARA DIBUJAR. DOBLE CLIC PARA FINALIZAR.', 'info', 5000);
        }
    };

    window.cancelPerimeter = function () {
        document.getElementById('modal-perimeter-note').style.display = 'none';
        window._isDrawingPerimeter = false;
        if (window._currentPerimeterLine && window.zonesMap) {
            window.zonesMap.removeLayer(window._currentPerimeterLine);
        }
        window._currentPerimeterPoints = [];
        window._currentPerimeterLine = null;
    };

    const perimeterForm = document.getElementById('perimeter-form');
    if (perimeterForm) {
        perimeterForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const color = document.getElementById('perimeter-color').value;
            const note = document.getElementById('perimeter-note').value;
            const perimeters = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_map_perimeters')) || '[]');
            const editingId = perimeterForm.dataset.editingId;

            if (editingId) {
                const idx = perimeters.findIndex(p => p.id === editingId);
                if (idx > -1) {
                    perimeters[idx].color = color;
                    perimeters[idx].note = note;
                }
                delete perimeterForm.dataset.editingId;
            } else {
                if (!window._currentPerimeterPoints || window._currentPerimeterPoints.length < 3) return;
                perimeters.push({
                    id: 'perim_' + Date.now(),
                    points: window._currentPerimeterPoints.map(p => [p.lat, p.lng]),
                    color: color,
                    note: note,
                    timestamp: new Date().toISOString()
                });
            }

            localStorage.setItem(window.getSiteKey('holcim_map_perimeters'), JSON.stringify(perimeters));
            document.getElementById('modal-perimeter-note').style.display = 'none';
            window._isDrawingPerimeter = false;
            window._currentPerimeterPoints = [];
            if (window._currentPerimeterLine) window.zonesMap.removeLayer(window._currentPerimeterLine);
            window._currentPerimeterLine = null;
            document.getElementById('perimeter-note').value = '';

            // Reset header if it was changed for edit
            const header = document.querySelector('#modal-perimeter-note h3');
            if (header) header.innerHTML = '<i class="fas fa-draw-polygon"></i> Guardar Perímetro';

            showNotification(editingId ? 'PERÍMETRO ACTUALIZADO' : 'PERÍMETRO GUARDADO', 'success');
            renderPerimeters();
        });
    }

    // Direct registration from map forms
    window.openCctvTracking = function (id) {
        const cameras = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_cctv_inventory')) || '[]');
        const cam = cameras.find(c => String(c.id) === String(id));
        if (!cam) return;

        document.getElementById('tracking-risk-id').value = 'cctv_' + id;
        document.getElementById('tracking-risk-title-display').innerHTML = `<i class="fas fa-video"></i> ${cam.location}`;

        const isOp = cam.status === 'OPERATIVO';
        const statusLabel = cam.trackingStatus || 'SIN GESTIÓN';
        const statusColors = { EN_PROCESO: '#f59e0b', RESUELTO: '#059669', ESCALADO: '#dc2626', PENDIENTE: '#64748b' };
        const statusBg = statusColors[cam.trackingStatus] || '#94a3b8';
        const levelBg = isOp ? '#059669' : '#dc2626';

        document.getElementById('tracking-risk-meta').innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div>
                    <strong style="font-size:0.85rem;">CÁMARA: ${cam.type}</strong><br>
                    <span style="color:#64748b; font-size:0.75rem;">IP: ${cam.ip || '-'}</span>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    <span style="padding:3px 10px; border-radius:20px; background:${levelBg}; color:white; font-size:0.65rem; font-weight:700;">${cam.status}</span>
                    <span style="padding:3px 10px; border-radius:20px; background:${statusBg}; color:white; font-size:0.65rem; font-weight:700;">${statusLabel}</span>
                </div>
            </div>
        `;

        document.getElementById('tracking-responsible').value = '';
        document.getElementById('tracking-new-status').value = '';
        document.getElementById('tracking-action-desc').value = '';
        renderTrackingActions(cam.tracking || []);
        document.getElementById('modal-risk-tracking').style.display = 'flex';
    };

    const mapCctvForm = document.getElementById('map-cctv-form');
    if (mapCctvForm) {
        mapCctvForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const editingId = document.getElementById('map-cctv-id').value;
            const key = window.getSiteKey('holcim_cctv_inventory');
            const items = JSON.parse(localStorage.getItem(key) || '[]');

            const itemData = {
                type: document.getElementById('map-cctv-type').value,
                brand: document.getElementById('map-cctv-brand').value.trim().toUpperCase(),
                ip: document.getElementById('map-cctv-ip').value.trim(),
                location: document.getElementById('map-cctv-location').value.trim().toUpperCase(),
                observation: document.getElementById('map-cctv-obs').value.trim(),
                lat: parseFloat(document.getElementById('map-cctv-lat').value),
                lng: parseFloat(document.getElementById('map-cctv-lng').value)
            };

            if (editingId) {
                const idx = items.findIndex(i => String(i.id) === String(editingId));
                if (idx > -1) {
                    items[idx] = { ...items[idx], ...itemData };
                }
            } else {
                const newItem = {
                    id: Date.now().toString(),
                    ...itemData,
                    status: 'OPERATIVO',
                    timestamp: new Date().toISOString()
                };
                items.push(newItem);
            }

            localStorage.setItem(key, JSON.stringify(items));
            document.getElementById('modal-cctv-registration').style.display = 'none';
            showNotification(editingId ? 'CÁMARA ACTUALIZADA' : 'CÁMARA REGISTRADA', 'success');
            renderCctvMarkers();
            if (window.renderDbCCTV) window.renderDbCCTV();
        });
    }

    const mapApForm = document.getElementById('map-ap-form');
    if (mapApForm) {
        mapApForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const editingId = document.getElementById('map-ap-id').value;
            const key = window.getSiteKey('holcim_access_points');
            const items = JSON.parse(localStorage.getItem(key) || '[]');

            const itemData = {
                name: document.getElementById('map-ap-name').value.trim().toUpperCase(),
                location: document.getElementById('map-ap-location').value.trim().toUpperCase(),
                type: document.getElementById('map-ap-type').value,
                lat: parseFloat(document.getElementById('map-ap-lat').value),
                lng: parseFloat(document.getElementById('map-ap-lng').value)
            };

            if (editingId) {
                const idx = items.findIndex(i => String(i.id) === String(editingId));
                if (idx > -1) {
                    items[idx] = { ...items[idx], ...itemData };
                }
            } else {
                const newItem = {
                    id: 'ap_' + Date.now(),
                    ...itemData,
                    status: 'OPERATIVO',
                    timestamp: new Date().toISOString()
                };
                items.push(newItem);
            }

            localStorage.setItem(key, JSON.stringify(items));
            document.getElementById('modal-ap-registration').style.display = 'none';
            showNotification(editingId ? 'PUNTO DE ACCESO ACTUALIZADO' : 'PUNTO DE ACCESO REGISTRADO', 'success');
            renderApMarkers();
            if (window.renderAccessPointsChecklist) window.renderAccessPointsChecklist();
        });
    }

    // CCTV Action Handlers
    window.openEditCctvFromMap = function (id) {
        const cameras = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_cctv_inventory')) || '[]');
        const cam = cameras.find(c => String(c.id) === String(id));
        if (!cam) return;

        document.getElementById('map-cctv-id').value = id;
        document.getElementById('map-cctv-lat').value = cam.lat;
        document.getElementById('map-cctv-lng').value = cam.lng;
        document.getElementById('map-cctv-type').value = cam.type;
        document.getElementById('map-cctv-brand').value = cam.brand || '';
        document.getElementById('map-cctv-ip').value = cam.ip || '';
        document.getElementById('map-cctv-location').value = cam.location;
        document.getElementById('map-cctv-obs').value = cam.observation || '';

        document.querySelector('#modal-cctv-registration h3').innerHTML = '<i class="fas fa-edit"></i> Editar Cámara (CCTV)';
        document.getElementById('modal-cctv-registration').style.display = 'flex';
    };

    window.deleteCctvFromMap = function (id) {
        if (!confirm('¿Desea eliminar esta cámara del sistema?')) return;
        const key = window.getSiteKey('holcim_cctv_inventory');
        let items = JSON.parse(localStorage.getItem(key) || '[]');
        items = items.filter(i => String(i.id) !== String(id));
        localStorage.setItem(key, JSON.stringify(items));
        showNotification('CÁMARA ELIMINADA', 'info');
        renderCctvMarkers();
        if (window.renderDbCCTV) window.renderDbCCTV();
    };

    // AP Action Handlers
    window.openEditApFromMap = function (id) {
        const items = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_access_points')) || '[]');
        const ap = items.find(i => String(i.id) === String(id));
        if (!ap) return;

        document.getElementById('map-ap-id').value = id;
        document.getElementById('map-ap-lat').value = ap.lat;
        document.getElementById('map-ap-lng').value = ap.lng;
        document.getElementById('map-ap-name').value = ap.name;
        document.getElementById('map-ap-location').value = ap.location;
        document.getElementById('map-ap-type').value = ap.type;

        document.querySelector('#modal-ap-registration h3').innerHTML = '<i class="fas fa-edit"></i> Editar Punto de Acceso';
        document.getElementById('modal-ap-registration').style.display = 'flex';
    };

    window.deleteApFromMap = function (id) {
        if (!confirm('¿Desea eliminar este punto de acceso?')) return;
        const key = window.getSiteKey('holcim_access_points');
        let items = JSON.parse(localStorage.getItem(key) || '[]');
        items = items.filter(i => String(i.id) !== String(id));
        localStorage.setItem(key, JSON.stringify(items));
        showNotification('PUNTO DE ACCESO ELIMINADO', 'info');
        renderApMarkers();
        if (window.renderAccessPointsChecklist) window.renderAccessPointsChecklist();
    };

    window.openApTracking = function (id) {
        const items = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_access_points')) || '[]');
        const ap = items.find(i => String(i.id) === String(id));
        if (!ap) return;

        document.getElementById('tracking-risk-id').value = 'ap_' + id;
        document.getElementById('tracking-risk-title-display').innerHTML = `<i class="fas fa-door-open"></i> ${ap.name}`;

        const statusLabel = ap.trackingStatus || 'SIN GESTIÓN';
        const apStatus = ap.currentStatus || 'OPERATIVO';
        const statusColors = { EN_PROCESO: '#f59e0b', RESUELTO: '#059669', ESCALADO: '#dc2626', PENDIENTE: '#64748b' };
        const statusBg = statusColors[ap.trackingStatus] || '#94a3b8';
        const levelBg = apStatus === 'OPERATIVO' ? '#4f46e5' : '#dc2626';

        document.getElementById('tracking-risk-meta').innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div>
                    <strong style="font-size:0.85rem;">ACCESO: ${ap.type}</strong><br>
                    <span style="color:#64748b; font-size:0.75rem;">Ubicación: ${ap.location}</span>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    <span style="padding:3px 10px; border-radius:20px; background:${levelBg}; color:white; font-size:0.65rem; font-weight:700;">${apStatus}</span>
                    <span style="padding:3px 10px; border-radius:20px; background:${statusBg}; color:white; font-size:0.65rem; font-weight:700;">${statusLabel}</span>
                </div>
            </div>
        `;

        document.getElementById('tracking-responsible').value = '';
        document.getElementById('tracking-new-status').value = '';
        document.getElementById('tracking-action-desc').value = '';
        renderTrackingActions(ap.tracking || []);
        document.getElementById('modal-risk-tracking').style.display = 'flex';
    };

    window.renderPerimeters = function () {
        if (!window.perimeterLayer) return;
        window.perimeterLayer.clearLayers();
        const perimeters = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_map_perimeters')) || '[]');

        perimeters.forEach(p => {
            if (!p.points || p.points.length < 3) return;
            const poly = L.polygon(p.points, { color: p.color, weight: 3, fillOpacity: 0.2 }).addTo(window.perimeterLayer);

            const statusColors = { EN_PROCESO: '#f59e0b', RESUELTO: '#059669', ESCALADO: '#dc2626', PENDIENTE: '#64748b' };
            const statusLabel = p.trackingStatus || 'SIN GESTIÓN';
            const statusBg = statusColors[p.trackingStatus] || '#94a3b8';

            const popupContent = `
                <div style="min-width: 220px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                        <strong style="color:${p.color};"><i class="fas fa-draw-polygon"></i> Perímetro</strong>
                        <span style="padding:2px 8px; border-radius:10px; background:${statusBg}; color:white; font-size:0.6rem; font-weight:700;">${statusLabel}</span>
                    </div>
                    <div style="font-size:0.75rem; margin-bottom:10px; color:#475569;">${p.note || 'Sin notas.'}</div>
                    
                    <div style="margin-top:10px; margin-bottom:10px;">
                        <label style="font-size:0.65rem; font-weight:700; text-transform:uppercase; color:#475569;">Estado del Perímetro:</label>
                        <select onchange="window.updatePerimeterStatus('${p.id}', this.value)" style="width:100%; margin-top:4px; margin-bottom:10px; padding:5px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.75rem;">
                            <option value="PENDIENTE" ${p.trackingStatus === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
                            <option value="EN_PROCESO" ${p.trackingStatus === 'EN_PROCESO' ? 'selected' : ''}>EN PROCESO</option>
                            <option value="RESUELTO" ${p.trackingStatus === 'RESUELTO' ? 'selected' : ''}>CERRADO / RESUELTO</option>
                            <option value="ESCALADO" ${p.trackingStatus === 'ESCALADO' ? 'selected' : ''}>ESCALADO</option>
                        </select>

                        <div style="display:grid; grid-template-columns:1fr; gap:5px; margin-bottom:5px;">
                            <button onclick="window.openPerimeterTracking('${p.id}')" style="padding: 5px; background: #0f172a; color: white; border: none; border-radius: 4px; font-size: 0.65rem; cursor: pointer;">
                                <i class="fas fa-clipboard-list"></i> SEGUIMIENTO ${p.tracking && p.tracking.length > 0 ? '(' + p.tracking.length + ')' : ''}
                            </button>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px;">
                            <button onclick="window.openEditPerimeter('${p.id}')" style="padding: 5px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.65rem; cursor: pointer;">
                                <i class="fas fa-edit"></i> EDITAR
                            </button>
                            <button onclick="window.deletePerimeter('${p.id}')" style="padding: 5px; background: #fee2e2; color: #ef4444; border: 1px solid #fecaca; border-radius: 4px; font-size: 0.65rem; cursor: pointer;">
                                <i class="fas fa-trash-can"></i> ELIMINAR
                            </button>
                        </div>
                    </div>
                </div>
            `;
            poly.bindPopup(popupContent);
        });
    };

    window.openEditPerimeter = function (id) {
        const perimeters = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_map_perimeters')) || '[]');
        const p = perimeters.find(item => item.id === id);
        if (!p) return;

        const form = document.getElementById('perimeter-form');
        form.dataset.editingId = id;
        document.getElementById('perimeter-color').value = p.color;
        document.getElementById('perimeter-note').value = p.note;
        document.getElementById('modal-perimeter-note').style.display = 'flex';

        // Change header text
        const header = document.querySelector('#modal-perimeter-note h3');
        if (header) header.innerHTML = '<i class="fas fa-pen-to-square"></i> Editar Perímetro';
    };

    window.deletePerimeter = function (id) {
        if (!confirm('¿Seguro que desea eliminar este perímetro?')) return;
        let perimeters = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_map_perimeters')) || '[]');
        perimeters = perimeters.filter(p => p.id !== id);
        localStorage.setItem(window.getSiteKey('holcim_map_perimeters'), JSON.stringify(perimeters));
        renderPerimeters();
        showNotification('PERÍMETRO ELIMINADO', 'info');
    };

    window.updatePerimeterStatus = function (id, newStatus) {
        const key = window.getSiteKey('holcim_map_perimeters');
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = items.findIndex(i => String(i.id) === String(id));
        if (idx > -1) {
            items[idx].trackingStatus = newStatus;
            localStorage.setItem(key, JSON.stringify(items));
            showNotification('ESTADO DE PERÍMETRO ACTUALIZADO', 'success');
            setTimeout(() => renderPerimeters(), 300);
        }
    };

    window.openPerimeterTracking = function (id) {
        const perimeters = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_map_perimeters')) || '[]');
        const p = perimeters.find(item => item.id === id);
        if (!p) return;

        document.getElementById('tracking-risk-id').value = 'peri_' + id;
        document.getElementById('tracking-risk-title-display').innerHTML = `<i class="fas fa-draw-polygon"></i> Seguimiento de Perímetro`;

        const statusLabel = p.trackingStatus || 'PENDIENTE/NUEVO';
        const statusColors = { EN_PROCESO: '#f59e0b', RESUELTO: '#059669', ESCALADO: '#dc2626', PENDIENTE: '#64748b' };
        const statusBg = statusColors[p.trackingStatus] || '#94a3b8';

        document.getElementById('tracking-risk-meta').innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div>
                    <strong style="font-size:0.85rem;">NOTA: ${p.note || 'Sin nota'}</strong><br>
                    <span style="color:#64748b; font-size:0.75rem;">ID: ${p.id} &nbsp;|&nbsp; Fecha: ${new Date(p.timestamp).toLocaleDateString()}</span>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    <span style="padding:3px 10px; border-radius:20px; background:${p.color}; color:white; font-size:0.65rem; font-weight:700;">DIBUJO</span>
                    <span style="padding:3px 10px; border-radius:20px; background:${statusBg}; color:white; font-size:0.65rem; font-weight:700;">${statusLabel}</span>
                </div>
            </div>
        `;

        document.getElementById('tracking-responsible').value = '';
        document.getElementById('tracking-new-status').value = '';
        document.getElementById('tracking-action-desc').value = '';

        renderTrackingActions(p.tracking || []);
        document.getElementById('modal-risk-tracking').style.display = 'flex';
    };

    // ==== EMAIL AND RISKS ORIGINAL CODE ====
    window.sendRiskEmail = function (id) {
        const risks = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_risk_points')) || '[]');
        const risk = risks.find(r => r.id === id);
        if (!risk) return;

        const subject = encodeURIComponent(`ALERTA DE RIESGO: ${risk.title} (${risk.level})`);
        const body = encodeURIComponent(
            `DETALLES DE IDENTIFICACIÓN DE RIESGO CRÍTICO\n` +
            `------------------------------------------\n` +
            `TÍTULO: ${risk.title}\n` +
            `NIVEL: ${risk.level}\n` +
            `SECTOR: ${risk.sector}\n` +
            `COORDENADAS: ${risk.lat.toFixed(6)}, ${risk.lng.toFixed(6)}\n` +
            `FECHA: ${new Date(risk.timestamp).toLocaleString()}\n\n` +
            `DESCRIPCIÓN:\n${risk.desc || 'Sin descripción'}\n\n` +
            `* Nota: La evidencia fotográfica está disponible en la plataforma de Gestión de Seguridad.`
        );

        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    window.openRiskTracking = function (id) {
        const risks = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_risk_points')) || '[]');
        const risk = risks.find(r => r.id === id);
        if (!risk) return;

        document.getElementById('tracking-risk-id').value = id;
        document.getElementById('tracking-risk-title-display').textContent = risk.title;

        const statusColors = { EN_PROCESO: '#f59e0b', RESUELTO: '#059669', ESCALADO: '#dc2626', PENDIENTE: '#64748b' };
        const statusLabel = risk.trackingStatus || 'SIN GESTIÓN';
        const statusBg = statusColors[risk.trackingStatus] || '#94a3b8';
        const levelBg = risk.level === 'RED' ? '#ef4444' : risk.level === 'YELLOW' ? '#f59e0b' : '#10b981';

        document.getElementById('tracking-risk-meta').innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div>
                    <strong style="font-size:0.85rem;">${risk.title}</strong><br>
                    <span style="color:#64748b; font-size:0.75rem;">Sector: ${risk.sector} &nbsp;|&nbsp; Coord: ${risk.lat.toFixed(4)}, ${risk.lng.toFixed(4)}</span>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    <span style="padding:3px 10px; border-radius:20px; background:${levelBg}; color:white; font-size:0.65rem; font-weight:700;">${risk.level}</span>
                    <span style="padding:3px 10px; border-radius:20px; background:${statusBg}; color:white; font-size:0.65rem; font-weight:700;">${statusLabel}</span>
                </div>
            </div>
        `;

        // Reset form
        document.getElementById('tracking-responsible').value = '';
        document.getElementById('tracking-new-status').value = '';
        document.getElementById('tracking-action-desc').value = '';

        renderTrackingActions(risk.tracking || []);
        document.getElementById('modal-risk-tracking').style.display = 'flex';
    };

    function renderTrackingActions(actions) {
        const container = document.getElementById('tracking-actions-list');
        if (!container) return;
        if (!actions || actions.length === 0) {
            container.innerHTML = '<div style="padding:1.5rem; text-align:center; color:#94a3b8; font-size:0.8rem;"><i class="fas fa-inbox"></i><br>Sin acciones registradas aún.</div>';
            return;
        }

        const statusColors = { EN_PROCESO: '#f59e0b', RESUELTO: '#059669', ESCALADO: '#dc2626', PENDIENTE: '#64748b' };

        container.innerHTML = [...actions].reverse().map(a => `
            <div style="padding:10px 12px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                <div style="flex:1;">
                    <div style="font-size:0.75rem; font-weight:700; color:#1e293b; margin-bottom:2px;">${a.responsible || 'N/A'}</div>
                    <div style="font-size:0.75rem; color:#475569;">${a.description}</div>
                    <div style="font-size:0.65rem; color:#94a3b8; margin-top:2px;">${new Date(a.timestamp).toLocaleString()}</div>
                </div>
                ${a.newStatus ? `<span style="padding:2px 8px; border-radius:10px; background:${statusColors[a.newStatus] || '#64748b'}; color:white; font-size:0.6rem; font-weight:700; white-space:nowrap;">${a.newStatus}</span>` : ''}
            </div>
        `).join('');
    }

    window.saveRiskAction = function () {
        const idRaw = document.getElementById('tracking-risk-id').value;
        const responsible = document.getElementById('tracking-responsible').value.trim();
        const description = document.getElementById('tracking-action-desc').value.trim();
        const newStatus = document.getElementById('tracking-new-status').value;

        if (!description) return showNotification('INGRESE UNA DESCRIPCIÓN DE LA ACCIÓN', 'warning');

        // Determine if it's CCTV, AP, Perimeter or Risk
        const isCctv = idRaw.startsWith('cctv_');
        const isAp = idRaw.startsWith('ap_');
        const isPeri = idRaw.startsWith('peri_');
        const id = isCctv ? idRaw.replace('cctv_', '') : (isAp ? idRaw.replace('ap_', '') : (isPeri ? idRaw.replace('peri_', '') : idRaw));

        let storageKeyName = 'holcim_risk_points';
        if (isCctv) storageKeyName = 'holcim_cctv_inventory';
        else if (isAp) storageKeyName = 'holcim_access_points';
        else if (isPeri) storageKeyName = 'holcim_map_perimeters';

        const storageKey = window.getSiteKey(storageKeyName);
        let items = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const idx = items.findIndex(r => String(r.id) === String(id));
        if (idx === -1) return;

        if (!items[idx].tracking) items[idx].tracking = [];
        items[idx].tracking.push({
            responsible: responsible || 'N/A',
            description,
            newStatus: newStatus || null,
            timestamp: new Date().toISOString()
        });

        if (newStatus) items[idx].trackingStatus = newStatus;

        localStorage.setItem(storageKey, JSON.stringify(items));
        showNotification('ACCIÓN DE SEGUIMIENTO GUARDADA', 'success');
        addLogEvent(isCctv ? 'CCTV' : (isAp ? 'ACCESOS' : 'RIESGOS'), 'Seguimiento: ' + (items[idx].title || items[idx].location || items[idx].name) + ' → ' + (newStatus || 'sin cambio de estado'));

        document.getElementById('tracking-responsible').value = '';
        document.getElementById('tracking-new-status').value = '';
        document.getElementById('tracking-action-desc').value = '';

        renderTrackingActions(items[idx].tracking);

        if (isCctv) {
            renderCctvMarkers();
            window.openCctvTracking(id);
        } else if (isAp) {
            renderApMarkers();
            window.openApTracking(id);
        } else if (isPeri) {
            renderPerimeters();
            window.openPerimeterTracking(id);
        } else {
            renderRiskPoints();
            window.openRiskTracking(id);
        }
    };

    // Form submission
    const riskForm = document.getElementById('risk-identification-form');
    if (riskForm) {
        riskForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const riskId = document.getElementById('risk-id').value;
            const storageKey = window.getSiteKey('holcim_risk_points');
            let risks = JSON.parse(localStorage.getItem(storageKey) || '[]');

            const riskData = {
                id: riskId || 'risk_' + Date.now(),
                lat: parseFloat(document.getElementById('risk-lat').value),
                lng: parseFloat(document.getElementById('risk-lng').value),
                title: document.getElementById('risk-title').value.toUpperCase(),
                level: document.getElementById('risk-level').value,
                sector: document.getElementById('risk-sector').value,
                desc: document.getElementById('risk-desc').value,
                photo: document.getElementById('risk-photo-data').value,
                timestamp: new Date().toISOString()
            };

            if (riskId) {
                const idx = risks.findIndex(r => r.id === riskId);
                if (idx > -1) risks[idx] = riskData;
                showNotification('PUNTO DE RIESGO ACTUALIZADO', 'success');
            } else {
                risks.unshift(riskData);
                showNotification('PUNTO DE RIESGO REGISTRADO', 'success');
                addLogEvent('RIESGOS', 'Identificado peligro: ' + riskData.title);
            }

            localStorage.setItem(storageKey, JSON.stringify(risks));

            window.closeRiskModal();
            renderRiskPoints();
            updateRiskStats();
        });
    }

    window.deleteRiskPoint = function (id) {
        if (!confirm('¿Seguro que desea eliminar este punto de riesgo?')) return;
        const storageKey = window.getSiteKey('holcim_risk_points');
        let risks = JSON.parse(localStorage.getItem(storageKey) || '[]');
        risks = risks.filter(r => r.id !== id);
        localStorage.setItem(storageKey, JSON.stringify(risks));

        showNotification('PUNTO ELIMINADO', 'info');
        renderRiskPoints();
        updateRiskStats();
    };

    window.searchRiskMapLocation = async function () {
        const input = document.getElementById('risk-map-search-input');
        if (!input) return;
        const query = input.value.trim();
        if (!query) return showNotification('INGRESE UN SITIO PARA BUSCAR', 'warning');

        // Locate the specific search button more reliably
        const btn = document.querySelector('button[onclick*="searchRiskMapLocation"]') ||
            document.querySelector('.panel-body button.btn-submit-action');

        const originalHtml = btn ? btn.innerHTML : '';

        try {
            // Show loading state
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> BUSCANDO...';
            }

            console.log('Searching location:', query);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
                headers: {
                    'Accept-Language': 'es',
                    'User-Agent': 'HolcimSecurityPlatform/3.1'
                }
            });
            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);

                console.log('Location found:', lat, lon);

                // Ensure map exists
                if (!window.zonesMap) {
                    window.initSecurityZonesMap();
                }

                if (window.zonesMap) {
                    window.zonesMap.flyTo([lat, lon], 17, {
                        duration: 1.5
                    });

                    // Force resize and redraw after flight to ensure markers and tiles appear
                    setTimeout(() => {
                        window.zonesMap.invalidateSize();
                        renderRiskPoints();
                    }, 500);

                    showNotification('UBICACIÓN ENCONTRADA: ' + result.display_name.split(',')[0], 'success');
                } else {
                    showNotification('ERROR AL INICIALIZAR EL MAPA', 'error');
                }
            } else {
                showNotification('NO SE ENCONTRÓ EL SITIO: ' + query, 'warning');
            }
        } catch (error) {
            console.error('Search error:', error);
            showNotification('ERROR EN LA CONEXIÓN DE BÚSQUEDA', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        }
    };

    window.renderZoneMiniHistory = function () {
        const container = document.getElementById('zone-mini-history-list');
        if (!container) return;

        const logs = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_security_zone_logs')) || '[]');
        if (logs.length === 0) {
            container.innerHTML = '<div style="padding:1rem; color:var(--text-muted); text-align:center;">Sin registros recientes.</div>';
            return;
        }

        const colors = { 'RED': 'var(--red-holcim)', 'YELLOW': 'var(--primary-teal)', 'GREEN': '#10b981' };

        container.innerHTML = logs.slice(0, 5).map(log => `
            <div style="padding:10px; border-bottom:1px solid var(--border-gray); font-size:0.8rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <strong>${log.zoneId} - ${new Date(log.timestamp).toLocaleTimeString()}</strong>
                    <span style="color:${colors[log.newState]}; font-weight:700;">${log.newState}</span>
                </div>
                <div style="color:var(--text-muted); font-size:0.75rem;">Oficial: ${log.user.split('@')[0]}</div>
                ${log.obs ? `<div style="margin-top:4px; font-style:italic;">"${log.obs}"</div>` : ''}
            </div>
        `).join('');
    };

    // --- ALERT MONITORING ---
    window.checkExtraAuthAlerts = function () {
        const ak = window.getSiteKey('holcim_extra_auths');
        const auths = JSON.parse(localStorage.getItem(ak) || '[]');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const hasExpired = auths.some(a => {
            const expDate = new Date(a.dateEnd);
            return expDate < today;
        });

        const navLink = document.querySelector('[data-view="extra-auth"]');
        if (navLink) {
            navLink.classList.toggle('nav-blink-red', hasExpired);
        }
    };

    // Finalize initialization
    checkAuth();

    // Initial alerts check
    setTimeout(() => {
        updateCounters();
        window.checkExtraAuthAlerts();
    }, 1000);

    // --- INACTIVITY MONITOR (2 MINUTES) ---
    let inactivityTimer;
    const INACTIVITY_TIME = 2 * 60 * 1000; // 2 minutes

    window.resetInactivityTimer = () => {
        if (localStorage.getItem('holcim_session')) {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(window.lockSystem, INACTIVITY_TIME);
        }
    };

    window.lockSystem = () => {
        const overlay = document.getElementById('inactivity-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    };

    window.unlockSystem = () => {
        const overlay = document.getElementById('inactivity-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        window.resetInactivityTimer();
    };

    // Listen for activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(name => {
        document.addEventListener(name, window.resetInactivityTimer, true);
    });

    // Initialize timer
    window.resetInactivityTimer();

    // Periodic checks
    setInterval(window.checkExtraAuthAlerts, 60000); // Check every minute
});
