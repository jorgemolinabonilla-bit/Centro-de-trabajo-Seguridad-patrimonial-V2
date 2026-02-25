// Statistics Dashboard Logic - Holcim Security Platform
// Integrated with Chart.js for data visualization

(function () {
    let charts = {};

    window.renderStatistics = function () {
        // Populate filters if needed
        populateStatsFilters();

        // Stats Summary
        updateSummaryStats();

        // Chart 1: Visitor Type (Last 30 days)
        renderVisitorTypeChart();

        // Chart 2: Top Departments
        renderDepartmentChart();

        // Chart 3: Top Companies
        renderCompanyChart();

        // Chart 4: Motivo de Ingreso
        renderReasonChart();

        // Chart 5: Extra Authorizations Status
        renderExtraAuthChart();

        // Chart 6: Monthly Trend
        renderTrendChart();
    };

    function populateStatsFilters() {
        const deptSelect = document.getElementById('stats-filter-dept');
        if (!deptSelect || deptSelect.options.length > 1) return;

        const depts = [
            "SEGURIDAD", "MANTENIMIENTO", "PRODUCCION", "CALIDAD",
            "RECURSOS HUMANOS (RRHH)", "ADMINISTRACION", "H&S",
            "PROYECTOS", "GEOCYCLE", "LOGISTICA", "ALMACEN",
            "AMBIENTE", "COMUNICACION", "CEPAL", "PROVEEDURIA",
            "TI", "CETEC", "MINERIA", "SERVICIOS GENERALES"
        ];

        depts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            deptSelect.appendChild(opt);
        });

        // Add listeners
        ['stats-filter-start', 'stats-filter-end', 'stats-filter-dept'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', window.renderStatistics);
        });
    }

    function getFilteredLogs() {
        let logs = window.getSiteData('holcim_access_logs') || [];
        const start = document.getElementById('stats-filter-start')?.value;
        const end = document.getElementById('stats-filter-end')?.value;
        const dept = document.getElementById('stats-filter-dept')?.value || 'ALL';

        return logs.filter(l => {
            const logDate = l.entryTime.split(' ')[0];
            const matchStart = !start || logDate >= start;
            const matchEnd = !end || logDate <= end;
            const matchDept = dept === 'ALL' || l.department === dept;
            return matchStart && matchEnd && matchDept;
        });
    }

    function getLogs() {
        return getFilteredLogs();
    }

    function getExtraAuths() {
        return window.getSiteData('holcim_extra_auths') || [];
    }

    function getKeys() {
        return window.getSiteData('holcim_key_loans') || [];
    }

    function updateSummaryStats() {
        const logs = getLogs();
        const active = logs.filter(l => !l.exitTime);
        const extraAuths = getExtraAuths();
        const keys = getKeys().filter(k => !k.returnTime);

        // Entries today (relative to current filter or real today)
        const realToday = new Date().toISOString().split('T')[0];
        const entriesToday = logs.filter(l => l.entryTime.startsWith(realToday)).length;

        document.getElementById('stat-total-entries').textContent = entriesToday;
        document.getElementById('stat-active-now').textContent = active.length;
        document.getElementById('stat-extra-auth').textContent = extraAuths.length;
        document.getElementById('stat-active-keys').textContent = keys.length;
    }

    function renderVisitorTypeChart() {
        const logs = getLogs();
        const counts = { 'VISITANTE': 0, 'PROVEEDOR': 0, 'CONTRATISTA': 0 };
        logs.forEach(l => {
            if (counts[l.visitorType] !== undefined) counts[l.visitorType]++;
        });

        const ctx = document.getElementById('chart-visitor-type').getContext('2d');
        if (charts.visitorType) charts.visitorType.destroy();

        charts.visitorType = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: ['#009cbd', '#a4cc00', '#00102b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    function renderDepartmentChart() {
        const logs = getLogs();
        const deptMap = {};
        logs.forEach(l => {
            const d = l.department || 'OTROS';
            deptMap[d] = (deptMap[d] || 0) + 1;
        });

        const sorted = Object.entries(deptMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const ctx = document.getElementById('chart-department').getContext('2d');
        if (charts.department) charts.department.destroy();

        charts.department = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(s => s[0]),
                datasets: [{
                    label: 'Ingresos',
                    data: sorted.map(s => s[1]),
                    backgroundColor: '#a4cc00'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } }
            }
        });
    }

    function renderCompanyChart() {
        const logs = getLogs();
        const coMap = {};
        logs.forEach(l => {
            const c = l.company || 'PARTICULAR';
            coMap[c] = (coMap[c] || 0) + 1;
        });

        const sorted = Object.entries(coMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const ctx = document.getElementById('chart-company').getContext('2d');
        if (charts.company) charts.company.destroy();

        charts.company = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(s => s[0]),
                datasets: [{
                    label: 'Ingresos',
                    data: sorted.map(s => s[1]),
                    backgroundColor: '#00102b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    function renderReasonChart() {
        const logs = getLogs();
        const reMap = {};
        logs.forEach(l => {
            const r = l.reason || 'OTROS';
            reMap[r] = (reMap[r] || 0) + 1;
        });

        const sorted = Object.entries(reMap).sort((a, b) => b[1] - a[1]);
        const ctx = document.getElementById('chart-reason').getContext('2d');
        if (charts.reason) charts.reason.destroy();

        charts.reason = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: sorted.map(s => s[0]),
                datasets: [{
                    data: sorted.map(s => s[1]),
                    backgroundColor: ['#ed1c16', '#a4cc00', '#009cbd', '#00102b', '#7c3aed', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
    }

    function renderExtraAuthChart() {
        const auths = getExtraAuths();
        let vigente = 0, vencida = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        auths.forEach(a => {
            const exp = new Date(a.dateEnd);
            if (exp < today) vencida++;
            else vigente++;
        });

        const ctx = document.getElementById('chart-extra-auth').getContext('2d');
        if (charts.extraAuth) charts.extraAuth.destroy();

        charts.extraAuth = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Vigentes', 'Vencidas'],
                datasets: [{
                    data: [vigente, vencida],
                    backgroundColor: ['#009cbd', '#ed1c16'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    function renderTrendChart() {
        const logs = getLogs();
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(d.toISOString().split('T')[0]);
        }

        const counts = last7Days.map(day => {
            return logs.filter(l => l.entryTime.startsWith(day)).length;
        });

        const ctx = document.getElementById('chart-monthly-trend').getContext('2d');
        if (charts.trend) charts.trend.destroy();

        charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days.map(d => d.split('-').slice(1).reverse().join('/')),
                datasets: [{
                    label: 'Ingresos por Día',
                    data: counts,
                    borderColor: '#009cbd',
                    backgroundColor: 'rgba(0, 156, 189, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }
})();
