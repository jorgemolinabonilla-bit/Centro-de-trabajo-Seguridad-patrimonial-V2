// Package Management Module - Holcim Control de Acceso
// Handles: package registration, pending list, delivery confirmation, and history

document.addEventListener('DOMContentLoaded', function () {

    var packageForm = document.getElementById('package-form');

    window.renderPackages = function () {
        var listBody = document.getElementById('package-list-body');
        var historyBody = document.getElementById('package-history-body');
        if (!listBody || !historyBody) return;

        var pkgData = window.getSiteData('holcim_packages');
        var search = (document.getElementById('pkg-search')?.value || '').toLowerCase();
        var start = document.getElementById('pkg-filter-start')?.value;
        var end = document.getElementById('pkg-filter-end')?.value;
        var status = document.getElementById('pkg-filter-status')?.value || 'ALL';

        var filtered = pkgData.filter(function (p) {
            var matchSearch = p.courier.toLowerCase().includes(search) ||
                p.recipient.toLowerCase().includes(search) ||
                (p.sender || '').toLowerCase().includes(search) ||
                (p.tracking || '').toLowerCase().includes(search) ||
                (p.object || '').toLowerCase().includes(search);
            var pkgDate = new Date(p.receivedAt).toISOString().split('T')[0];
            var matchStart = !start || pkgDate >= start;
            var matchEnd = !end || pkgDate <= end;
            var matchStatus = status === 'ALL' || (status === 'ENTREGADO' ? !!p.deliveredAt : !p.deliveredAt);

            return matchSearch && matchStart && matchEnd && matchStatus;
        });

        var pending = filtered.filter(function (p) { return !p.deliveredAt; });
        var delivered = filtered.filter(function (p) { return !!p.deliveredAt; });

        function getCourierIcon(name) {
            name = (name || '').toUpperCase();
            if (name.includes('DHL')) return '<i class="fas fa-truck" style="color:#d40511; margin-right:5px;"></i>';
            if (name.includes('UPS')) return '<i class="fas fa-box" style="color:#351c15; margin-right:5px;"></i>';
            if (name.includes('FEDEX')) return '<i class="fas fa-shipping-fast" style="color:#4d148c; margin-right:5px;"></i>';
            if (name.includes('CORREOS')) return '<i class="fas fa-envelope" style="color:#ffcc00; margin-right:5px;"></i>';
            if (name.includes('SERVIENTREGA')) return '<i class="fas fa-truck-moving" style="color:#00a651; margin-right:5px;"></i>';
            if (name.includes('PEDIDOSYA') || name.includes('UBER') || name.includes('RAPPI')) return '<i class="fas fa-motorcycle" style="color:var(--primary-teal); margin-right:5px;"></i>';
            return '<i class="fas fa-box" style="color:var(--text-muted); margin-right:5px;"></i>';
        }

        if (pending.length === 0) {
            listBody.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--text-muted)"><i class="fas fa-box-open fa-2x" style="opacity:0.3;margin-bottom:1rem;display:block;"></i>Sin paquetes pendientes.</div>';
        } else {
            listBody.innerHTML = pending.map(function (p) {
                return '<div class="list-row" style="grid-template-columns: 120px 100px 120px 140px 1fr 140px 140px 100px;">' +
                    '<div style="font-size:0.8rem">' + (p.sender || '-') + '</div>' +
                    '<div style="font-size:0.75rem">' + (p.tracking || '-') + '</div>' +
                    '<div><strong style="color:var(--primary-teal); cursor:pointer" onclick="openPackageEdit(' + p.id + ')">' + getCourierIcon(p.courier) + p.courier + '</strong></div>' +
                    '<div style="font-size:0.75rem">' + (p.object || '-') + '</div>' +
                    '<div>' + p.recipient + '</div>' +
                    '<div style="font-size:0.75rem; font-weight:700">' + (p.receivedByOfficer || '-') + '</div>' +
                    '<div style="font-size:0.75rem">' + new Date(p.receivedAt).toLocaleString() + '</div>' +
                    '<div style="display:flex; gap:5px;">' +
                    '<button class="btn-salida-corpo" style="background:var(--primary-teal);color:#fff;border-color:var(--primary-teal);padding:5px 10px;" onclick="openDeliverModal(' + p.id + ')"><i class="fas fa-check"></i></button>' +
                    '<button class="btn-salida-corpo" style="background:#64748b;color:#fff;border-color:#64748b;padding:5px 10px;" onclick="openPackageEdit(' + p.id + ')"><i class="fas fa-edit"></i></button>' +
                    '<button class="btn-salida-corpo" style="background:var(--red-holcim);color:#fff;border-color:var(--red-holcim);padding:5px 10px;" onclick="deletePackage(' + p.id + ')"><i class="fas fa-trash"></i></button>' +
                    '</div>' +
                    '</div>';
            }).join('');
        }

        if (delivered.length === 0) {
            historyBody.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Sin entregas registradas que coincidan.</div>';
        } else {
            historyBody.innerHTML = delivered.map(function (p) {
                return '<div class="list-row" style="grid-template-columns: 120px 100px 150px 1fr 120px 120px 120px 120px 120px;">' +
                    '<div style="font-size:0.75rem">' + (p.sender || '-') + '</div>' +
                    '<div style="font-size:0.75rem">' + (p.tracking || '-') + '</div>' +
                    '<div><strong style="cursor:pointer; color:var(--primary-teal)" onclick="openPackageEdit(' + p.id + ')">' + getCourierIcon(p.courier) + p.courier + '</strong></div>' +
                    '<div>' + p.recipient + '</div>' +
                    '<div style="font-size:0.75rem; font-weight:700">' + (p.receivedByOfficer || '-') + '</div>' +
                    '<div style="font-size:0.75rem">' + new Date(p.receivedAt).toLocaleString() + '</div>' +
                    '<div style="font-size:0.75rem; color:var(--primary-teal);font-weight:700">' + (p.receivedBy || '-') + '</div>' +
                    '<div style="font-size:0.75rem; font-weight:700">' + (p.deliveredByOfficer || '-') + '</div>' +
                    '<div style="display:flex; gap:5px;">' +
                    '<span class="induction-status status-active" style="font-size:0.65rem;padding:3px 6px; cursor:pointer" onclick="openTraceability(' + p.id + ', \'' + p.recipient + '\')">ENTREGADO</span>' +
                    '<button class="btn-salida-corpo" style="background:var(--red-holcim);color:#fff;border-color:var(--red-holcim);padding:2px 6px; font-size:0.65rem;" onclick="deletePackage(' + p.id + ')"><i class="fas fa-trash"></i></button>' +
                    '</div>' +
                    '</div>';
            }).join('');
        }

    };



    window.deletePackage = function (id) {
        if (!confirm('¿Está seguro de eliminar este registro de paquetería? Esta acción no se puede deshacer.')) return;

        var pkgData = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_packages')) || '[]');
        var filtered = pkgData.filter(function (p) { return p.id !== id; });

        localStorage.setItem(window.getSiteKey('holcim_packages'), JSON.stringify(filtered));
        if (typeof showNotification === 'function') showNotification('REGISTRO ELIMINADO', 'warning');
        window.renderPackages();
    };

    window.exportPackages = function (format) {
        var pkgData = window.getSiteData('holcim_packages');
        if (pkgData.length === 0) {
            if (typeof showNotification === 'function') showNotification('NO HAY PAQUETES PARA EXPORTAR', 'danger');
            return;
        }

        if (format === 'xlsx') {
            var csv = "\uFEFFEMISOR,GUIA,MENSAJERIA,OBJETO,DESTINATARIO,OFICIAL RECEPTOR,FECHA RECIBIDO,ENTREGADO A,OFICIAL ENTREGO,FECHA ENTREGA,ESTADO\n";
            pkgData.forEach(function (p) {
                csv += '"' + (p.sender || '-') + '","' + (p.tracking || '-') + '","' + p.courier + '","' + (p.object || '-') + '","' + p.recipient + '","' + (p.receivedByOfficer || '-') + '","' + new Date(p.receivedAt).toLocaleString() + '","' + (p.receivedBy || '-') + '","' + (p.deliveredByOfficer || '-') + '","' + (p.deliveredAt ? new Date(p.deliveredAt).toLocaleString() : '-') + '","' + (p.deliveredAt ? 'ENTREGADO' : 'PENDIENTE') + '"\n';
            });
            var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'Reporte_Paqueteria_Holcim_' + new Date().toISOString().split('T')[0] + '.csv';
            a.click();
        } else {
            window.print();
        }
    };

    window.populatePackageOfficers = function () {
        var officerSelects = [document.getElementById('pkg-officer'), document.getElementById('delivery-officer-select')];
        var officers = window.getSiteData('holcim_security_officers');

        officerSelects.forEach(function (sel) {
            if (!sel) return;
            var currentVal = sel.value;
            sel.innerHTML = '<option value="">Seleccione Oficial...</option>';
            officers.forEach(function (off) {
                var opt = document.createElement('option');
                opt.value = off.name.toUpperCase();
                opt.textContent = off.name.toUpperCase();
                sel.appendChild(opt);
            });
            if (currentVal) sel.value = currentVal;
        });
    };

    ['pkg-search', 'pkg-filter-start', 'pkg-filter-end', 'pkg-filter-status'].forEach(function (id) {
        document.getElementById(id)?.addEventListener('input', window.renderPackages);
    });

    window.openPackageEdit = function (id) {
        var pkgData = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_packages')) || '[]');
        var pkg = pkgData.find(function (p) { return p.id === id; });
        if (pkg) {
            document.getElementById('edit-package-id').value = pkg.id;
            document.getElementById('edit-pkg-sender').value = pkg.sender || '';
            document.getElementById('edit-pkg-courier').value = pkg.courier;
            document.getElementById('edit-pkg-tracking').value = pkg.tracking || '';
            document.getElementById('edit-pkg-object').value = pkg.object || '';
            document.getElementById('edit-pkg-recipient').value = pkg.recipient;
            document.getElementById('modal-edit-package').style.display = 'flex';
        }
    };

    window.savePackageEdit = function () {
        var id = parseInt(document.getElementById('edit-package-id').value);
        var pkgData = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_packages')) || '[]');
        var pkg = pkgData.find(function (p) { return p.id === id; });
        if (pkg) {
            var fields = {
                sender: document.getElementById('edit-pkg-sender').value.trim().toUpperCase(),
                courier: document.getElementById('edit-pkg-courier').value.trim().toUpperCase(),
                tracking: document.getElementById('edit-pkg-tracking').value.trim().toUpperCase(),
                object: document.getElementById('edit-pkg-object').value.trim().toUpperCase(),
                recipient: document.getElementById('edit-pkg-recipient').value.trim().toUpperCase()
            };
            var changed = false;
            for (var key in fields) {
                if (pkg[key] !== fields[key]) {
                    if (typeof window.addAuditLog === 'function') {
                        window.addAuditLog('PAQUETERIA', pkg.id, key, pkg[key], fields[key]);
                    }
                    pkg[key] = fields[key]; changed = true;
                }
            }
            if (changed) {
                localStorage.setItem(window.getSiteKey('holcim_packages'), JSON.stringify(pkgData));
                if (typeof showNotification === 'function') showNotification('PAQUETE ACTUALIZADO', 'success');
            }
            document.getElementById('modal-edit-package').style.display = 'none';
            window.renderPackages();
        }
    };

    window.openDeliverModal = function (id) {
        var pkgData = window.getSiteData('holcim_packages');
        var pkg = pkgData.find(p => p.id === id);
        if (!pkg) return;

        document.getElementById('delivery-package-id').value = id;
        document.getElementById('delivery-receiver-name').value = '';
        document.getElementById('delivery-package-info').innerHTML =
            '<strong>EMISOR:</strong> ' + (pkg.sender || '-') + '<br>' +
            '<strong>GUIA:</strong> ' + (pkg.tracking || '-') + '<br>' +
            '<strong>MENSAJERIA:</strong> ' + pkg.courier + '<br>' +
            '<strong>PARA:</strong> ' + pkg.recipient;

        window.populatePackageOfficers();
        document.getElementById('modal-package-delivery').style.display = 'flex';
    };

    window.confirmPackageDelivery = function () {
        var id = parseInt(document.getElementById('delivery-package-id').value);
        var receiver = document.getElementById('delivery-receiver-name').value.trim().toUpperCase();
        var officer = document.getElementById('delivery-officer-select').value;

        if (!receiver) { alert('Debe ingresar el nombre de quien recibe.'); return; }
        if (!officer) { alert('Debe seleccionar el oficial que entrega.'); return; }

        var pkgData = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_packages')) || '[]');
        var pkg = pkgData.find(p => p.id === id);
        if (!pkg) return;

        pkg.deliveredAt = Date.now();
        pkg.receivedBy = receiver;
        pkg.deliveredByOfficer = officer;

        localStorage.setItem(window.getSiteKey('holcim_packages'), JSON.stringify(pkgData));

        if (typeof addLogEvent === 'function') {
            addLogEvent('PAQUETERIA', 'Entregado por ' + officer + ' a ' + receiver + ' | Para: ' + pkg.recipient);
        }
        if (typeof showNotification === 'function') {
            showNotification('PAQUETE ENTREGADO EXITOSAMENTE', 'success');
        }
        document.getElementById('modal-package-delivery').style.display = 'none';
        window.renderPackages();
    };

    window.openRegisterPackageModal = function () {
        if (packageForm) packageForm.reset();
        window.populatePackageOfficers();
        document.getElementById('modal-register-package').style.display = 'flex';
    };

    if (packageForm) {
        packageForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var senderEl = document.getElementById('pkg-sender');
            var courierEl = document.getElementById('pkg-courier');
            var trackingEl = document.getElementById('pkg-tracking');
            var objectEl = document.getElementById('pkg-object');
            var recipientEl = document.getElementById('pkg-recipient');
            var officerEl = document.getElementById('pkg-officer');

            if (!courierEl || !objectEl || !recipientEl || !officerEl) return;

            var newPkg = {
                id: Date.now(),
                sender: senderEl ? senderEl.value.trim().toUpperCase() : '',
                courier: courierEl.value.trim().toUpperCase(),
                tracking: trackingEl ? trackingEl.value.trim().toUpperCase() : '',
                object: objectEl.value.trim().toUpperCase(),
                recipient: recipientEl.value.trim().toUpperCase(),
                receivedByOfficer: officerEl.value.trim().toUpperCase(),
                receivedAt: Date.now(),
                deliveredAt: null,
                receivedBy: null,
                deliveredByOfficer: null
            };

            var pkgData = JSON.parse(localStorage.getItem(window.getSiteKey('holcim_packages')) || '[]');
            pkgData.unshift(newPkg);
            localStorage.setItem(window.getSiteKey('holcim_packages'), JSON.stringify(pkgData));

            if (typeof addLogEvent === 'function') {
                addLogEvent('PAQUETERIA', 'Nuevo paquete (Seg: ' + newPkg.receivedByOfficer + ') de ' + (newPkg.sender || newPkg.courier) + ' para ' + newPkg.recipient);
            }
            if (typeof showNotification === 'function') {
                showNotification('PAQUETE REGISTRADO', 'success');
            }
            window.renderPackages();
            packageForm.reset();
            document.getElementById('modal-register-package').style.display = 'none';
        });
    }

    // Initial render on load
    window.renderPackages();
    window.populatePackageOfficers();

    // Re-render when navigating to the packages view
    document.addEventListener('click', function (e) {
        var link = e.target.closest('.nav-link[data-view="packages"]');
        if (link) {
            window.populatePackageOfficers();
            setTimeout(window.renderPackages, 200);
        }
    });

});
