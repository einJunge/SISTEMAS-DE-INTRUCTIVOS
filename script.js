/**
 * SISTEMA DE INSTRUCTIVOS PREMIUM - AMATIQUE BAY
 * Lógica: UI Moderna + Reporte Institucional + Persistencia Permanente + Escalado Responsivo
 */

document.addEventListener('DOMContentLoaded', () => {
    let instructivos = JSON.parse(localStorage.getItem('instructivos_amatique')) || [];
    let currentId = null;
    let foodIncludesTax = false;
    let roomIncludesTax = false;
    let reportType = 'instructivo'; 

    const form = document.getElementById('instructivoForm');
    const listContainer = document.getElementById('instructivoList');
    const dynamicContainer = document.getElementById('dynamicBlocksContainer');
    const searchInput = document.getElementById('searchInput');
    const btnSave = document.getElementById('btnSave');
    const btnNew = document.getElementById('btnNew');
    const btnPDF = document.getElementById('btnDownloadPDF');
    const exchangeInput = document.getElementById('exchangeRate');
    const toast = document.getElementById('toast');
    const previewContainer = document.getElementById('previewContainer');
    const printArea = document.getElementById('printArea');

    const blockTemplates = {
        recepcion: { title: 'Recepción', type: 'text', category: 'operativo' },
        restaurante: { title: 'Restaurante', type: 'text', category: 'operativo' },
        rooming: { title: 'Rooming List', type: 'text', category: 'operativo' },
        seguridad: { title: 'Seguridad', type: 'text', category: 'operativo' },
        maestra: { title: 'Cuenta Maestra', type: 'text', category: 'operativo' },
        cancelacion: { title: 'Políticas de Cancelación', type: 'text', category: 'operativo' },
        pagos: { title: 'Políticas de Pago', type: 'text', category: 'operativo' },
        facturacion: { title: 'Facturación', type: 'text', category: 'operativo' },
        alimentos: { title: 'Alimentos y Bebidas (Info)', type: 'text', category: 'operativo' },
        hospedaje_desglose: { title: 'Desglose Hospedaje', type: 'table', cols: ['Tipo', 'Cant', 'Noches', 'Tarifa', 'Total'], category: 'room' },
        alimentos_desglose: { title: 'Desglose Alimentos', type: 'table', cols: ['Nombre', 'Cant', 'Precio', 'Total'], category: 'food' },
        cocteles: { title: 'Cócteles', type: 'table', cols: ['Nombre', 'Cant', 'Precio', 'Total'], category: 'food' },
        otros_cargos: { title: 'Otros Cargos (Salón, Audio, etc.)', type: 'table', cols: ['Descripción', 'Cant', 'Precio', 'Total'], category: 'others' },
        cortesias: { title: 'Cortesías', type: 'table', cols: ['Descripción', 'Cant', 'Valor', 'Total'], category: 'other' },
        descuentos: { title: 'Descuentos (Sobre Subtotal)', type: 'table', cols: ['Descripción', '%', 'Valor'], category: 'discount' }
    };

    renderList();
    initListeners();
    updatePreview();
    handleResize();

    function initListeners() {
        btnSave.addEventListener('click', saveInstructivo);
        btnNew.addEventListener('click', resetForm);
        btnPDF.addEventListener('click', downloadPDF);
        searchInput.addEventListener('input', (e) => renderList(e.target.value));
        exchangeInput.addEventListener('input', updatePreview);
        form.addEventListener('input', updatePreview);
        window.addEventListener('resize', handleResize);

        document.querySelectorAll('[data-block]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const key = e.target.dataset.block;
                if (e.target.checked) {
                    if (['alimentos_desglose', 'cocteles'].includes(key)) {
                        foodIncludesTax = confirm("¿El precio de estos alimentos/bebidas YA incluye impuestos?");
                    }
                    if (key === 'hospedaje_desglose') {
                        roomIncludesTax = confirm("¿El precio de hospedaje YA incluye impuestos (IVA 12% e INGUAT 10%)?");
                    }
                    createBlockUI(key);
                } else {
                    removeBlockUI(key);
                }
                updatePreview();
            });
        });
    }

    function handleResize() {
        const panel = document.getElementById('previewPanel');
        // Descontar padding (14px * 2) y un pequeño margen de seguridad
        const available = panel.offsetWidth - 36;
        const docWidth = 794;
        const scale = Math.min(1, available / docWidth);
        previewContainer.style.transform = `scale(${scale})`;
        previewContainer.style.transformOrigin = 'top center';
        // Ajustar la altura del contenedor para que el scroll funcione bien
        const scaledHeight = printArea.offsetHeight * scale;
        previewContainer.style.height = scale < 1 ? `${scaledHeight}px` : 'auto';
    }

    function createBlockUI(key, data = null) {
        if (document.getElementById(`block-${key}`)) return;
        const template = blockTemplates[key];
        const div = document.createElement('div');
        div.className = 'dynamic-block';
        div.id = `block-${key}`;
        let content = '';
        if (template.type === 'text') {
            content = `<textarea class="form-control" name="block_data_${key}" rows="3">${data || ''}</textarea>`;
        } else {
            content = `<table class="dynamic-table" id="table-${key}"><thead><tr>${template.cols.map(c => `<th>${c}</th>`).join('')}<th></th></tr></thead><tbody></tbody></table><button type="button" class="btn-add-row" onclick="addRow('${key}')">+ Agregar Fila</button>`;
        }
        div.innerHTML = `<div class="block-header"><h5>${template.title} ${(['alimentos_desglose', 'cocteles'].includes(key) && foodIncludesTax) ? '(IVA Inc.)' : ''}${(key === 'hospedaje_desglose' && roomIncludesTax) ? '(Imp. Inc.)' : ''}</h5></div><div class="block-content">${content}</div>`;
        dynamicContainer.appendChild(div);
        if (template.type === 'table') { if (data) data.forEach(r => addRow(key, r)); else addRow(key); }
    }

    function removeBlockUI(key) { const el = document.getElementById(`block-${key}`); if (el) el.remove(); }

    window.setReportType = function(type) {
        reportType = type;
        const tabInst = document.getElementById('tabInstructivo');
        const tabConv = document.getElementById('tabConvenio');
        if (type === 'instructivo') {
            tabInst.style.background = '#1a365d'; tabInst.style.color = 'white';
            tabConv.style.background = 'transparent'; tabConv.style.color = '#cbd5e1';
        } else {
            tabConv.style.background = '#1a365d'; tabConv.style.color = 'white';
            tabInst.style.background = 'transparent'; tabInst.style.color = '#cbd5e1';
        }
        updatePreview();
    };

    window.addRow = function(key, data = []) {
        const table = document.querySelector(`#table-${key} tbody`);
        const template = blockTemplates[key];
        const tr = document.createElement('tr');
        template.cols.forEach((col, i) => {
            const td = document.createElement('td');
            const input = document.createElement('input');
            input.type = ['Cant', 'Precio', 'Total', 'Tarifa', 'Noches', 'Valor', '%'].includes(col) ? 'number' : 'text';
            input.className = 'form-control';
            input.value = data[i] || '';
            if (col === 'Total') { input.readOnly = true; input.style.background = '#f8fafc'; }
            input.addEventListener('input', () => { calcRow(tr, key, template); updatePreview(); });
            td.appendChild(input); tr.appendChild(td);
        });
        const action = document.createElement('td');
        action.innerHTML = '<button type="button" class="btn-icon" style="padding:4px 8px; border-radius:4px; border:1px solid #ddd; cursor:pointer;" onclick="this.closest(\'tr\').remove(); updatePreview();">×</button>';
        tr.appendChild(action); table.appendChild(tr); calcRow(tr, key, template);
    };

    function calcRow(tr, key, template) {
        const inputs = tr.querySelectorAll('input');
        let cant = 0, price = 0, nights = 1, totalInput = null;
        template.cols.forEach((name, i) => {
            if (name === 'Cant') cant = parseFloat(inputs[i].value) || 0;
            if (['Precio', 'Tarifa', 'Valor'].includes(name)) price = parseFloat(inputs[i].value) || 0;
            if (name === 'Noches') nights = parseFloat(inputs[i].value) || 1;
            if (name === 'Total') totalInput = inputs[i];
        });
        if (totalInput) { totalInput.value = (cant * price * (key === 'hospedaje_desglose' ? nights : 1)).toFixed(2); }
    }

    function updatePreview() {
        const data = Object.fromEntries(new FormData(form).entries());
        const rate = parseFloat(exchangeInput.value) || 1;
        const pvContainer = document.getElementById('printArea');
        pvContainer.classList.remove('clean-style');
        const oldSub = document.querySelector('.report-title-area div');
        if (oldSub) oldSub.remove();
        
        const reportTitle = document.querySelector('.report-title-area h1');
        if (reportTitle) {
            if (reportType === 'instructivo') {
                reportTitle.innerText = 'INSTRUCTIVO DE SERVICIOS';
                const subTitle = document.createElement('div');
                subTitle.style.fontSize = '16px';
                subTitle.style.fontWeight = 'bold';
                subTitle.innerText = data.titulo || '';
                reportTitle.after(subTitle);
            } else {
                reportTitle.innerText = 'CONVENIO DE EVENTO';
            }
        }

        document.getElementById('pv-titulo').innerText = data.titulo || '---';
        document.getElementById('pv-evento').innerText = data.evento || '---';
        document.getElementById('pv-contacto').innerText = data.contacto || '---';
        document.getElementById('pv-ejecutiva').innerText = data.ejecutiva || '---';
        document.getElementById('pv-fecha_elaboracion').innerText = data.fecha_elaboracion || '---';
        document.getElementById('pv-fecha_evento').innerText = data.fecha_evento || '---';
        document.getElementById('pv-hora_ingreso').innerText = data.hora_ingreso || '---';
        document.getElementById('pv-asistencia').innerText = data.asistencia || '---';
        document.getElementById('pv-salon_area').innerText = data.salon_area || '---';
        document.getElementById('pv-restricciones').innerText = data.restricciones || '---';
        document.getElementById('pv-cuenta_maestra').innerText = data.cuenta_maestra || '---';
        document.getElementById('pv-pago').innerText = data.facturado_pagado ? 'FACTURADO Y PAGADO' : 'PENDIENTE';
        document.getElementById('pv-observaciones').innerText = data.observaciones || '---';
        document.getElementById('pv-id').innerText = 'ID: #' + (currentId ? currentId.slice(-4) : '0000');
        document.getElementById('pv-current-date').innerText = new Date().toLocaleDateString();
        document.getElementById('pv-rate-val').innerText = rate.toFixed(2);

        const pvDynamic = document.getElementById('pv-dynamic-sections');
        pvDynamic.innerHTML = '';
        
        const fields = document.querySelectorAll('.report-field');
        fields.forEach(f => {
            const label = f.querySelector('.report-label').innerText.toLowerCase();
            if (reportType === 'convenio') {
                const operativos = ['cta. maestra:', 'estado:'];
                f.style.display = operativos.includes(label) ? 'none' : 'flex';
            } else {
                f.style.display = 'flex';
            }
        });

        if (reportType === 'instructivo') {
            renderInstructivoConsolidado(pvDynamic, data, rate);
        } else {
            renderConvenioCliente(pvDynamic, data, rate);
        }

        updateFinancialDisplay(data, rate);
    }

    /* ─── CAT 1: INSTRUCTIVO INTERNO ─── sin cambios */
    function renderInstructivoConsolidado(container, data, rate) {
        container.classList.add('clean-style');
        const metadata = document.createElement('div');
        metadata.className = 'clean-metadata';
        metadata.innerHTML = `
            <p><strong>Fecha de elaboración:</strong> ${data.fecha_elaboracion || '---'}</p>
            <p><strong>Persona Contacto:</strong> ${data.contacto || '---'}</p>
            <p><strong>Ejecutiva de ventas:</strong> ${data.ejecutiva || '---'}</p>
            <p style="text-align: center; margin-top: 10px; font-weight: 900;">***ESTE INSTRUCTIVO CONSTA DE 2 páginas***</p>
            <hr style="border: 1px solid #000; margin: 10px 0;">
        `;
        container.appendChild(metadata);

        const opData = document.createElement('div');
        opData.className = 'clean-op-data';
        opData.innerHTML = `
            <div style="display: grid; grid-template-columns: 180px 1fr; gap: 5px;">
                <strong>HORA DE INGRESO:</strong> <span>${data.hora_ingreso || '---'} hrs.</span>
                <strong>Día evento:</strong> <span>${data.fecha_evento || '---'}</span>
                <strong>ASISTENCIA GARANTIZADA:</strong> <span>${data.asistencia || '---'} PAX</span>
            </div>
        `;
        container.appendChild(opData);

        const paymentSection = document.createElement('div');
        paymentSection.className = 'clean-payment-section';
        paymentSection.innerHTML = `
            <h4 style="margin: 20px 0 10px 0; text-transform: uppercase;">ESPECIFICACIONES DE LA CUENTA MAESTRA Y FORMA DE PAGO</h4>
            <div style="display: grid; grid-template-columns: 200px 1fr; gap: 10px;">
                <strong>LA CUENTA MAESTRA CUBRE:</strong> <span>${data.cuenta_maestra || 'Lo estipulado en el contrato.'}</span>
                <strong>DATOS DE FACTURACIÓN:</strong> <span>${data.facturacion_texto || 'Facturar a: pendiente'}</span>
            </div>
            <hr style="border: 1px solid #000; margin: 20px 0;">
        `;
        container.appendChild(paymentSection);

        const detailBlocks = ['recepcion', 'restaurante', 'rooming', 'seguridad', 'maestra', 'alimentos'];
        detailBlocks.forEach(key => {
            const cb = document.querySelector(`[data-block="${key}"]`);
            if (cb && cb.checked) {
                const template = blockTemplates[key];
                const section = document.createElement('div');
                section.className = 'clean-detail-block';
                const text = document.querySelector(`[name="block_data_${key}"]`).value || '---';
                section.innerHTML = `
                    <h5 style="text-transform: uppercase; margin-bottom: 5px;">${template.title}</h5>
                    <div style="white-space: pre-wrap; margin-bottom: 20px;">${text}</div>
                `;
                container.appendChild(section);
            }
        });
    }

    /* ─── CAT 2: CONVENIO PARA EL CLIENTE ─── diseño completo orientado al cliente */
    function renderConvenioCliente(container, data, rate) {
        const calc = completeFinancialCalculations(data, rate);

        // ── 1. Introducción / carta de presentación
        const intro = document.createElement('div');
        intro.style.cssText = 'margin: 18px 0 10px; font-size: 11px; line-height: 1.6;';
        intro.innerHTML = `
            <p>Estimado/a <strong>${data.contacto || 'Cliente'}</strong>,</p>
            <p>Por medio del presente documento hacemos constar los acuerdos y condiciones establecidos para la realización del evento indicado, de conformidad con lo convenido entre las partes.</p>
            <hr style="border:1px solid #c8a96e; margin: 12px 0;">
        `;
        container.appendChild(intro);

        // ── 2. Resumen ejecutivo del evento
        const resumen = document.createElement('div');
        resumen.innerHTML = `
            <div style="background:#f0f4f8; border-left:4px solid #1a365d; padding:12px 16px; margin-bottom:16px; font-size:10.5px;">
                <div style="font-weight:800; text-transform:uppercase; margin-bottom:8px; color:#1a365d;">RESUMEN DEL EVENTO</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 20px;">
                    <div><strong>Evento:</strong> ${data.evento || '---'}</div>
                    <div><strong>Fecha:</strong> ${data.fecha_evento || '---'}</div>
                    <div><strong>Hora de inicio:</strong> ${data.hora_ingreso || '---'} hrs.</div>
                    <div><strong>Asistencia:</strong> ${data.asistencia || '---'} PAX</div>
                    <div><strong>Salón / Área:</strong> ${data.salon_area || '---'}</div>
                    <div><strong>Ejecutiva responsable:</strong> ${data.ejecutiva || '---'}</div>
                    ${data.restricciones ? `<div style="grid-column:1/-1;"><strong>Condiciones especiales:</strong> ${data.restricciones}</div>` : ''}
                </div>
            </div>
        `;
        container.appendChild(resumen);

        // ── 3. Bloques comerciales: cancelación, pagos, facturación
        const comercialBlocks = ['cancelacion', 'pagos', 'facturacion'];
        comercialBlocks.forEach(key => {
            const cb = document.querySelector(`[data-block="${key}"]`);
            if (cb && cb.checked) {
                const template = blockTemplates[key];
                const text = document.querySelector(`[name="block_data_${key}"]`).value || '---';
                const section = document.createElement('div');
                section.style.cssText = 'margin-bottom:14px; font-size:10.5px;';
                section.innerHTML = `
                    <div style="font-weight:800; text-transform:uppercase; border-bottom:2px solid #1a365d; padding-bottom:4px; margin-bottom:6px; color:#1a365d;">${template.title}</div>
                    <p style="white-space:pre-wrap; margin:0;">${text}</p>
                `;
                container.appendChild(section);
            }
        });

        // ── 4. Desglose de servicios contratados (tablas detalladas)
        let hasAnyTable = false;
        const tableSection = document.createElement('div');
        tableSection.style.marginBottom = '16px';

        const sectionTitle = document.createElement('div');
        sectionTitle.style.cssText = 'font-weight:800; text-transform:uppercase; border-bottom:2px solid #1a365d; padding-bottom:4px; margin-bottom:10px; color:#1a365d; font-size:11px;';
        sectionTitle.innerText = 'DETALLE DE SERVICIOS CONTRATADOS';
        tableSection.appendChild(sectionTitle);

        const thStyle = 'border:1px solid #aaa; padding:5px 7px; background:#1a365d; color:#fff; font-size:9.5px; text-align:left;';
        const tdStyle = 'border:1px solid #ccc; padding:5px 7px; font-size:9.5px;';
        const tdRStyle = 'border:1px solid #ccc; padding:5px 7px; font-size:9.5px; text-align:right;';

        // Hospedaje
        if (document.querySelector('[data-block="hospedaje_desglose"]:checked')) {
            hasAnyTable = true;
            let rows = '';
            let subTotal = 0;
            document.querySelectorAll('#table-hospedaje_desglose tbody tr').forEach(tr => {
                const inputs = tr.querySelectorAll('input');
                const total = parseFloat(inputs[4].value) || 0;
                subTotal += total;
                rows += `<tr>
                    <td style="${tdStyle}">${inputs[0].value}</td>
                    <td style="${tdStyle} text-align:center;">${inputs[1].value}</td>
                    <td style="${tdStyle} text-align:center;">${inputs[2].value}</td>
                    <td style="${tdRStyle}">Q ${parseFloat(inputs[3].value||0).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                    <td style="${tdRStyle}">Q ${total.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                </tr>`;
            });
            const ivaRow = roomIncludesTax ? `<tr><td colspan="4" style="${tdRStyle} background:#f8f8f8; font-weight:700;">IVA (12%) + INGUAT (10%):</td><td style="${tdRStyle} background:#f8f8f8; font-weight:700;">INCLUIDOS</td></tr>` :
                `<tr><td colspan="4" style="${tdRStyle} background:#f8f8f8; font-weight:700;">+ IVA (12%) + INGUAT (10%):</td><td style="${tdRStyle} background:#f8f8f8; font-weight:700;">Q ${(calc.roomIVA + calc.roomTurismo).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`;
            tableSection.innerHTML += `
                <div style="margin-bottom:12px;">
                    <div style="font-weight:700; font-size:10px; text-transform:uppercase; margin-bottom:4px; color:#2d4a6e;">🛏 Hospedaje ${roomIncludesTax ? '<em style="font-weight:400;">(impuestos incluidos en tarifa)</em>' : ''}</div>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead><tr>
                            <th style="${thStyle}">Tipo de Habitación</th>
                            <th style="${thStyle} text-align:center;">Cant.</th>
                            <th style="${thStyle} text-align:center;">Noches</th>
                            <th style="${thStyle} text-align:right;">Tarifa/Noche</th>
                            <th style="${thStyle} text-align:right;">Subtotal</th>
                        </tr></thead>
                        <tbody>${rows}${ivaRow}
                        <tr style="font-weight:800; background:#e8f0fe;">
                            <td colspan="4" style="${tdRStyle} font-weight:800;">TOTAL HOSPEDAJE:</td>
                            <td style="${tdRStyle} font-weight:800;">Q ${calc.roomTotal.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                        </tr></tbody>
                    </table>
                </div>`;
        }

        // Alimentos y Bebidas
        const foodKeys = ['alimentos_desglose', 'cocteles'];
        let foodRows = ''; let foodSubTotal = 0;
        foodKeys.forEach(key => {
            if (document.querySelector(`[data-block="${key}"]:checked`)) {
                hasAnyTable = true;
                const label = key === 'cocteles' ? '🍹 Cócteles' : '🍽 Alimentos';
                document.querySelectorAll(`#table-${key} tbody tr`).forEach(tr => {
                    const inputs = tr.querySelectorAll('input');
                    const total = parseFloat(inputs[3].value) || 0;
                    foodSubTotal += total;
                    foodRows += `<tr>
                        <td style="${tdStyle}">${inputs[0].value} <em style="color:#666;font-size:8.5px;">(${label})</em></td>
                        <td style="${tdStyle} text-align:center;">${inputs[1].value}</td>
                        <td style="${tdRStyle}">Q ${parseFloat(inputs[2].value||0).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                        <td style="${tdRStyle}">Q ${total.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                    </tr>`;
                });
            }
        });
        if (foodRows) {
            const ivaFoodRow = foodIncludesTax
                ? `<tr><td colspan="3" style="${tdRStyle} background:#f8f8f8; font-weight:700;">IVA (12%) + Servicio (10%):</td><td style="${tdRStyle} background:#f8f8f8; font-weight:700;">INCLUIDOS</td></tr>`
                : `<tr><td colspan="3" style="${tdRStyle} background:#f8f8f8; font-weight:700;">+ IVA (12%) + Servicio (10%):</td><td style="${tdRStyle} background:#f8f8f8; font-weight:700;">Q ${(calc.foodIVA + calc.foodService).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`;
            tableSection.innerHTML += `
                <div style="margin-bottom:12px;">
                    <div style="font-weight:700; font-size:10px; text-transform:uppercase; margin-bottom:4px; color:#2d4a6e;">🍽 Alimentos y Bebidas ${foodIncludesTax ? '<em style="font-weight:400;">(impuestos incluidos en precio)</em>' : ''}</div>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead><tr>
                            <th style="${thStyle}">Descripción</th>
                            <th style="${thStyle} text-align:center;">Personas</th>
                            <th style="${thStyle} text-align:right;">Precio Unit.</th>
                            <th style="${thStyle} text-align:right;">Total</th>
                        </tr></thead>
                        <tbody>${foodRows}${ivaFoodRow}
                        <tr style="font-weight:800; background:#e8f0fe;">
                            <td colspan="3" style="${tdRStyle} font-weight:800;">TOTAL ALIMENTOS Y BEBIDAS:</td>
                            <td style="${tdRStyle} font-weight:800;">Q ${calc.foodTotal.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                        </tr></tbody>
                    </table>
                </div>`;
        }

        // Otros cargos
        let otherRows = ''; let otherSubTotal = 0;
        ['otros_cargos'].forEach(key => {
            if (document.querySelector(`[data-block="${key}"]:checked`)) {
                hasAnyTable = true;
                document.querySelectorAll(`#table-${key} tbody tr`).forEach(tr => {
                    const inputs = tr.querySelectorAll('input');
                    const total = parseFloat(inputs[3].value) || 0;
                    otherSubTotal += total;
                    otherRows += `<tr>
                        <td style="${tdStyle}">${inputs[0].value}</td>
                        <td style="${tdStyle} text-align:center;">${inputs[1].value}</td>
                        <td style="${tdRStyle}">Q ${parseFloat(inputs[2].value||0).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                        <td style="${tdRStyle}">Q ${total.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                    </tr>`;
                });
            }
        });
        if (otherRows) {
            tableSection.innerHTML += `
                <div style="margin-bottom:12px;">
                    <div style="font-weight:700; font-size:10px; text-transform:uppercase; margin-bottom:4px; color:#2d4a6e;">🎤 Otros Cargos</div>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead><tr>
                            <th style="${thStyle}">Descripción</th>
                            <th style="${thStyle} text-align:center;">Cant.</th>
                            <th style="${thStyle} text-align:right;">Precio Unit.</th>
                            <th style="${thStyle} text-align:right;">Total</th>
                        </tr></thead>
                        <tbody>${otherRows}
                        <tr style="font-weight:800; background:#e8f0fe;">
                            <td colspan="3" style="${tdRStyle} font-weight:800;">TOTAL OTROS CARGOS:</td>
                            <td style="${tdRStyle} font-weight:800;">Q ${otherSubTotal.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                        </tr></tbody>
                    </table>
                </div>`;
        }

        // Cortesías
        if (document.querySelector('[data-block="cortesias"]:checked')) {
            hasAnyTable = true;
            let cortRows = '';
            document.querySelectorAll('#table-cortesias tbody tr').forEach(tr => {
                const inputs = tr.querySelectorAll('input');
                cortRows += `<tr>
                    <td style="${tdStyle}">${inputs[0].value}</td>
                    <td style="${tdStyle} text-align:center;">${inputs[1].value}</td>
                    <td style="${tdRStyle} color:#16803c; font-weight:600;">CORTESÍA</td>
                </tr>`;
            });
            if (cortRows) {
                tableSection.innerHTML += `
                    <div style="margin-bottom:12px;">
                        <div style="font-weight:700; font-size:10px; text-transform:uppercase; margin-bottom:4px; color:#16803c;">🎁 Cortesías Incluidas</div>
                        <table style="width:100%; border-collapse:collapse;">
                            <thead><tr>
                                <th style="${thStyle}">Descripción</th>
                                <th style="${thStyle} text-align:center;">Cantidad</th>
                                <th style="${thStyle} text-align:right;">Valor</th>
                            </tr></thead>
                            <tbody>${cortRows}</tbody>
                        </table>
                    </div>`;
            }
        }

        if (hasAnyTable) container.appendChild(tableSection);

        // ── 5. Gran total destacado para el cliente
        const grandBox = document.createElement('div');
        grandBox.style.cssText = 'background:linear-gradient(135deg,#1a365d,#2d5a9e); color:#fff; border-radius:8px; padding:16px 20px; margin:14px 0; font-size:11px;';
        grandBox.innerHTML = `
            <div style="font-size:13px; font-weight:800; text-transform:uppercase; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.3); padding-bottom:8px;">
                INVERSIÓN TOTAL DEL EVENTO
            </div>
            <div style="display:grid; grid-template-columns:1fr auto; gap:6px; font-size:10.5px;">
                ${calc.roomSubRecalc > 0 ? `<div>Hospedaje:</div><div style="text-align:right;">Q ${calc.roomTotal.toLocaleString('en-US',{minimumFractionDigits:2})}</div>` : ''}
                ${calc.foodSubRecalc > 0 ? `<div>Alimentos y Bebidas:</div><div style="text-align:right;">Q ${calc.foodTotal.toLocaleString('en-US',{minimumFractionDigits:2})}</div>` : ''}
                ${calc.othersSubRecalc > 0 ? `<div>Otros Cargos:</div><div style="text-align:right;">Q ${calc.othersSubRecalc.toLocaleString('en-US',{minimumFractionDigits:2})}</div>` : ''}
                ${calc.discountsRecalc > 0 ? `<div style="color:#ffd700;">Descuento aplicado:</div><div style="text-align:right; color:#ffd700;">- Q ${calc.discountsRecalc.toLocaleString('en-US',{minimumFractionDigits:2})}</div>` : ''}
            </div>
            <div style="display:grid; grid-template-columns:1fr auto; margin-top:10px; padding-top:10px; border-top:2px solid rgba(255,255,255,0.4); font-size:14px; font-weight:900;">
                <div>TOTAL GENERAL:</div>
                <div style="text-align:right;">Q ${calc.grandTotalGTQ.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
            </div>
            ${data.show_usd ? `<div style="display:grid; grid-template-columns:1fr auto; margin-top:4px; font-size:11px; opacity:0.85;"><div>Equivalente USD (T/C: ${rate.toFixed(2)}):</div><div style="text-align:right;">$ ${calc.grandTotalUSD.toLocaleString('en-US',{minimumFractionDigits:2})}</div></div>` : ''}
        `;
        container.appendChild(grandBox);

        // ── 6. Datos de facturación destacados
        if (data.facturacion_texto) {
            const factBox = document.createElement('div');
            factBox.style.cssText = 'background:#fffbeb; border:1px solid #f59e0b; border-radius:6px; padding:10px 14px; font-size:10px; margin-bottom:10px;';
            factBox.innerHTML = `<strong>📋 DATOS DE FACTURACIÓN:</strong> ${data.facturacion_texto}`;
            container.appendChild(factBox);
        }
    }

    function completeFinancialCalculations(data, rate) {
        const ivaRate = (parseFloat(data.tax_percent) || 12) / 100;
        const roomTaxRate = (parseFloat(data.turismo_percent) || 10) / 100;
        const serviceRate = data.omit_service ? 0 : ((parseFloat(data.service_percent) || 10) / 100);
        const propinaFija = parseFloat(data.propina_fija) || 0;

        let foodSubRecalc = 0, roomSubRecalc = 0, othersSubRecalc = 0, discountsRecalc = 0;
        document.querySelectorAll('[data-block]:checked').forEach(cb => {
            const key = cb.dataset.block;
            const template = blockTemplates[key];
            document.querySelectorAll(`#table-${key} tbody tr`).forEach(tr => {
                const inputs = tr.querySelectorAll('input');
                const totalVal = parseFloat(inputs[inputs.length - 1].value) || 0;
                if (template.category === 'food') foodSubRecalc += totalVal;
                if (template.category === 'room') roomSubRecalc += totalVal;
                if (template.category === 'others') othersSubRecalc += totalVal;
                if (template.category === 'discount') discountsRecalc += (parseFloat(inputs[2].value) || 0);
            });
        });

        const baseFoodAfterDiscount = Math.max(0, foodSubRecalc - discountsRecalc);
        let foodIVA = foodIncludesTax ? 0 : (baseFoodAfterDiscount * ivaRate);
        const foodService = baseFoodAfterDiscount * serviceRate;
        const foodTotal = baseFoodAfterDiscount + foodIVA + foodService + propinaFija;

        const roomIVA = roomIncludesTax ? 0 : (roomSubRecalc * ivaRate);
        const roomTurismo = roomIncludesTax ? 0 : (roomSubRecalc * roomTaxRate);
        const roomTotal = roomIncludesTax ? roomSubRecalc : (roomSubRecalc + roomIVA + roomTurismo);

        const grandTotalGTQ = foodTotal + roomTotal + othersSubRecalc;
        const grandTotalUSD = grandTotalGTQ / rate;
        
        return { foodSubRecalc, foodIVA, foodService, foodTotal, roomSubRecalc, roomIVA, roomTurismo, roomTotal, othersSubRecalc, discountsRecalc, grandTotalGTQ, grandTotalUSD };
    }

    function updateFinancialDisplay(data, rate) {
        const calc = completeFinancialCalculations(data, rate);
        const summaryArea = document.querySelector('.financial-summary');

        document.querySelector('.signature-area').style.display = 'flex';
        document.querySelector('.report-section:has(#pv-observaciones)').style.display = 'block';

        if (reportType === 'instructivo') {
            let detailedTables = '';
            
            let foodRows = ''; let foodSectionSubtotal = 0;
            ['alimentos_desglose', 'cocteles'].forEach(key => {
                if (document.querySelector(`[data-block="${key}"]:checked`)) {
                    document.querySelectorAll(`#table-${key} tbody tr`).forEach(tr => {
                        const inputs = tr.querySelectorAll('input');
                        const totalVal = parseFloat(inputs[inputs.length - 1].value || 0);
                        foodSectionSubtotal += totalVal;
                        foodRows += `<tr><td style="border:1px solid #000;padding:5px;text-align:center;">${inputs[1].value}</td><td style="border:1px solid #000;padding:5px;">${inputs[0].value}</td><td style="border:1px solid #000;padding:5px;text-align:center;">${inputs[1].value}</td><td style="border:1px solid #000;padding:5px;text-align:right;">Q${parseFloat(inputs[2].value||0).toFixed(2)}</td><td style="border:1px solid #000;padding:5px;text-align:right;">Q${totalVal.toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`;
                    });
                }
            });
            if (foodRows) {
                foodRows += `<tr style="font-weight:bold; background:#f8fafc;"><td colspan="4" style="border:1px solid #000;padding:5px;text-align:right;">TOTAL ALIMENTOS Y BEBIDAS</td><td style="border:1px solid #000;padding:5px;text-align:right;">Q${foodSectionSubtotal.toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`;
                detailedTables += `<h5 style="text-transform:uppercase;margin-top:20px;">DESGLOSE ALIMENTOS Y BEBIDAS</h5><table style="width:100%;border-collapse:collapse;font-size:10px;"><thead><tr style="background:#f0f0f0;"><th style="border:1px solid #000;padding:5px;">Cant.</th><th style="border:1px solid #000;padding:5px;">DESCRIPCION</th><th style="border:1px solid #000;padding:5px;">PERSONAS</th><th style="border:1px solid #000;padding:5px;">PRECIO UNITARIO</th><th style="border:1px solid #000;padding:5px;">TOTAL</th></tr></thead><tbody>${foodRows}</tbody></table>`;
            }

            let roomRows = ''; let roomSectionSubtotal = 0;
            if (document.querySelector(`[data-block="hospedaje_desglose"]:checked`)) {
                document.querySelectorAll(`#table-hospedaje_desglose tbody tr`).forEach(tr => {
                    const inputs = tr.querySelectorAll('input');
                    const totalVal = parseFloat(inputs[inputs.length - 1].value || 0);
                    roomSectionSubtotal += totalVal;
                    roomRows += `<tr><td style="border:1px solid #000;padding:5px;text-align:center;">${inputs[1].value}</td><td style="border:1px solid #000;padding:5px;">${inputs[0].value} (${inputs[2].value} noches)</td><td style="border:1px solid #000;padding:5px;text-align:center;">-</td><td style="border:1px solid #000;padding:5px;text-align:right;">Q${parseFloat(inputs[3].value||0).toFixed(2)}</td><td style="border:1px solid #000;padding:5px;text-align:right;">Q${totalVal.toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`;
                });
            }
            if (roomRows) {
                roomRows += `<tr style="font-weight:bold; background:#f8fafc;"><td colspan="4" style="border:1px solid #000;padding:5px;text-align:right;">TOTAL HOSPEDAJE</td><td style="border:1px solid #000;padding:5px;text-align:right;">Q${roomSectionSubtotal.toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`;
                detailedTables += `<h5 style="text-transform:uppercase;margin-top:20px;">DESGLOSE HOSPEDAJE</h5><table style="width:100%;border-collapse:collapse;font-size:10px;"><thead><tr style="background:#f0f0f0;"><th style="border:1px solid #000;padding:5px;">Cant.</th><th style="border:1px solid #000;padding:5px;">DESCRIPCION</th><th style="border:1px solid #000;padding:5px;">PERSONAS</th><th style="border:1px solid #000;padding:5px;">PRECIO UNITARIO</th><th style="border:1px solid #000;padding:5px;">TOTAL</th></tr></thead><tbody>${roomRows}</tbody></table>`;
            }

            let otherRows = ''; let otherSectionSubtotal = 0;
            ['otros_cargos', 'cortesias'].forEach(key => {
                if (document.querySelector(`[data-block="${key}"]:checked`)) {
                    document.querySelectorAll(`#table-${key} tbody tr`).forEach(tr => {
                        const inputs = tr.querySelectorAll('input');
                        const isCort = key === 'cortesias';
                        const totalVal = isCort ? 0 : parseFloat(inputs[inputs.length - 1].value || 0);
                        otherSectionSubtotal += totalVal;
                        otherRows += `<tr><td style="border:1px solid #000;padding:5px;text-align:center;">${inputs[1].value}</td><td style="border:1px solid #000;padding:5px;">${inputs[0].value}${isCort?' (Cortesía)':''}</td><td style="border:1px solid #000;padding:5px;text-align:center;">-</td><td style="border:1px solid #000;padding:5px;text-align:right;">Q${parseFloat(inputs[2].value||0).toFixed(2)}</td><td style="border:1px solid #000;padding:5px;text-align:right;">Q${totalVal.toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`;
                    });
                }
            });
            if (otherRows) {
                otherRows += `<tr style="font-weight:bold; background:#f8fafc;"><td colspan="4" style="border:1px solid #000;padding:5px;text-align:right;">TOTAL OTROS CARGOS</td><td style="border:1px solid #000;padding:5px;text-align:right;">Q${otherSectionSubtotal.toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`;
                detailedTables += `<h5 style="text-transform:uppercase;margin-top:20px;">OTROS CARGOS Y CORTESIAS</h5><table style="width:100%;border-collapse:collapse;font-size:10px;"><thead><tr style="background:#f0f0f0;"><th style="border:1px solid #000;padding:5px;">Cant.</th><th style="border:1px solid #000;padding:5px;">DESCRIPCION</th><th style="border:1px solid #000;padding:5px;">PERSONAS</th><th style="border:1px solid #000;padding:5px;">PRECIO UNITARIO</th><th style="border:1px solid #000;padding:5px;">TOTAL</th></tr></thead><tbody>${otherRows}</tbody></table>`;
            }

            summaryArea.innerHTML = `
                ${detailedTables}
                <div class="summary-columns" style="margin-top:30px;">
                    <div class="summary-box">
                        <div class="box-title">RESUMEN ALIMENTOS Y BEBIDAS</div>
                        <div class="summary-row"><span>Subtotal Bruto:</span> <span>${fmt(calc.foodSubRecalc)}</span></div>
                        <div class="summary-row" style="color: #c05621;"><span>Descuento Aplicado:</span> <span>- ${fmt(calc.discountsRecalc)}</span></div>
                        <div class="summary-row"><span>IVA (12%):</span> <span>${foodIncludesTax ? "INCLUIDO" : fmt(calc.foodIVA)}</span></div>
                        ${data.omit_service ? '' : `<div class="summary-row"><span>Servicio (10%):</span> <span>${fmt(calc.foodService)}</span></div>`}
                        <div class="summary-row"><span>Propina:</span> <span>${fmt(parseFloat(data.propina_fija) || 0)}</span></div>
                        <div class="summary-row total"><span>TOTAL A&B:</span> <span>${fmt(calc.foodTotal)}</span></div>
                    </div>
                    <div class="summary-box">
                        <div class="box-title">RESUMEN HOSPEDAJE ${roomIncludesTax ? '(Imp. Incluidos)' : ''}</div>
                        <div class="summary-row"><span>Subtotal Bruto:</span> <span>${fmt(calc.roomSubRecalc)}</span></div>
                        <div class="summary-row"><span>IVA (12%):</span> <span>${roomIncludesTax ? "INCLUIDO" : fmt(calc.roomIVA)}</span></div>
                        <div class="summary-row"><span>INGUAT (10%):</span> <span>${roomIncludesTax ? "INCLUIDO" : fmt(calc.roomTurismo)}</span></div>
                        <div class="summary-row total"><span>TOTAL HOSPEDAJE:</span> <span>${fmt(calc.roomTotal)}</span></div>
                    </div>
                    <div class="summary-box">
                        <div class="box-title">OTROS CARGOS</div>
                        <div class="summary-row"><span>Total Otros:</span> <span>${fmt(calc.othersSubRecalc)}</span></div>
                    </div>
                </div>
                <div class="grand-total-box">
                    <div class="total-gtq">TOTAL GENERAL: <span>${fmt(calc.grandTotalGTQ)}</span></div>
                    ${data.show_usd ? `<div class="total-usd">TOTAL USD: <span>$ ${calc.grandTotalUSD.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>` : ''}
                </div>
            `;
            document.querySelector('.report-grid').style.display = 'none';
        } else {
            // Convenio: el resumen financiero interno ya está embebido en renderConvenioCliente,
            // ocultamos el bloque estático del HTML para no duplicar
            summaryArea.innerHTML = '';
            document.querySelector('.report-grid').style.display = 'grid';
        }

        const signatures = document.querySelectorAll('.signature-box p');
        if (signatures.length >= 2) {
            if (reportType === 'convenio') {
                signatures[0].innerText = 'EJECUTIVA DE VENTAS / AMATIQUE BAY';
                signatures[1].innerText = 'ACEPTACIÓN Y FIRMA DEL CLIENTE';
            } else {
                signatures[0].innerText = 'EJECUTIVA DE VENTAS';
                signatures[1].innerText = 'ACEPTACIÓN CLIENTE';
            }
        }
        const obsTitle = document.querySelector('#pv-observaciones').previousElementSibling;
        if (obsTitle) {
            obsTitle.innerText = reportType === 'convenio' ? 'OBSERVACIONES Y ACUERDOS ADICIONALES' : 'OBSERVACIONES';
        }
        handleResize();
    }

    function fmt(val) { return 'Q ' + val.toLocaleString('en-US', {minimumFractionDigits: 2}); }
    function fmt(val) { return 'Q ' + val.toLocaleString('en-US', {minimumFractionDigits: 2}); }

    // ══════════════════════════════════════════════════════════════
    //  SUPABASE — tabla: instructivos_amatique
    // ══════════════════════════════════════════════════════════════
    const SUPABASE_URL  = 'https://orkkwpjvyaxukjdzjsuu.supabase.co';       
    const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ya2t3cGp2eWF4dWtqZHpqc3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzOTI2NjEsImV4cCI6MjA5MDk2ODY2MX0.Tm6z-LB156niABM2nz-z1tRuMH6DfKd6TP6hsZjTDOU';  
    const TABLE = 'instructivos_amatique';

    // ── Cliente Supabase vía REST (sin SDK, sin bundler) ──
    async function sbFetch(method, path, body = null) {
        const opts = {
            method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Content-Type': 'application/json',
                'Prefer': method === 'POST' ? 'return=representation' : 'return=representation'
            }
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, opts);
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err);
        }
        const text = await res.text();
        return text ? JSON.parse(text) : null;
    }

    // ── CARGAR todos los instructivos al iniciar ──
    async function loadFromSupabase() {
        showDbStatus('connecting');
        try {
            const rows = await sbFetch('GET', `${TABLE}?order=titulo.asc&select=*`);
            instructivos = (rows || []).map(r => ({
                ...r.data,
                id: r.id,
                _db_id: r.id
            }));
            showDbStatus('ok');
            renderList();
        } catch(e) {
            showDbStatus('error');
            showToast('⚠️ Error conectando a Supabase. Verifica tus credenciales.');
            console.error(e);
        }
    }

    // ── Estado visual de conexión DB ──
    function showDbStatus(state) {
        const dot = document.getElementById('dbStatusDot');
        const lbl = document.getElementById('dbStatusLabel');
        if (!dot) return;
        const map = {
            connecting: { color: '#f59e0b', text: 'Conectando...' },
            ok:         { color: '#16803c', text: 'Conectado ✓' },
            saving:     { color: '#3b82f6', text: 'Guardando...' },
            error:      { color: '#dc2626', text: 'Sin conexión' }
        };
        const s = map[state] || map.error;
        dot.style.background = s.color;
        if (lbl) lbl.innerText = s.text;
    }

    // ── GUARDAR (INSERT o UPDATE) ──
    async function saveInstructivo() {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.foodIncludesTax = foodIncludesTax;
        data.roomIncludesTax = roomIncludesTax;
        data.activeBlocks = {};
        document.querySelectorAll('[data-block]:checked').forEach(cb => {
            const key = cb.dataset.block;
            if (blockTemplates[key].type === 'text') {
                data.activeBlocks[key] = document.querySelector(`[name="block_data_${key}"]`).value;
            } else {
                const rows = [];
                document.querySelectorAll(`#table-${key} tbody tr`).forEach(tr => {
                    const r = []; tr.querySelectorAll('input').forEach(i => r.push(i.value)); rows.push(r);
                });
                data.activeBlocks[key] = rows;
            }
        });

        showDbStatus('saving');
        try {
            if (currentId) {
                // UPDATE
                const rows = await sbFetch('PATCH',
                    `${TABLE}?id=eq.${currentId}`,
                    { titulo: data.titulo || 'Sin título', data }
                );
                const idx = instructivos.findIndex(i => i.id === currentId);
                if (idx >= 0) instructivos[idx] = { ...data, id: currentId, _db_id: currentId };
                showToast('✅ Actualizado: ' + (data.titulo || '---'));
            } else {
                // INSERT
                const rows = await sbFetch('POST',
                    TABLE,
                    { titulo: data.titulo || 'Sin título', data }
                );
                const newRow = Array.isArray(rows) ? rows[0] : rows;
                currentId = newRow.id;
                data.id = currentId;
                data._db_id = currentId;
                instructivos.push(data);
                document.getElementById('formTitle').innerText = 'Editando: ' + (data.titulo || '');
                showToast('💾 Guardado: ' + (data.titulo || '---'));
            }
            showDbStatus('ok');
            renderList();
        } catch(e) {
            showDbStatus('error');
            showToast('⚠️ Error al guardar. Revisa la consola.');
            console.error(e);
        }
    }

    // ── ELIMINAR ──
    async function deleteInstructivo(id) {
        const item = instructivos.find(i => i.id === id);
        if (!confirm(`¿Eliminar "${item?.titulo || 'este instructivo'}"?\nEsta acción no se puede deshacer.`)) return;
        showDbStatus('saving');
        try {
            await sbFetch('DELETE', `${TABLE}?id=eq.${id}`);
            instructivos = instructivos.filter(i => i.id !== id);
            showDbStatus('ok');
            showToast('🗑 Eliminado correctamente');
            if (currentId === id) resetForm();
            else renderList();
        } catch(e) {
            showDbStatus('error');
            showToast('⚠️ Error al eliminar');
            console.error(e);
        }
    }

    function renderList(filter = '') {
        listContainer.innerHTML = '';
        const filtered = instructivos.filter(i =>
            (i.titulo||'').toLowerCase().includes((filter||'').toLowerCase())
        );
        if (filtered.length === 0) {
            listContainer.innerHTML = `<p style="font-size:11px;color:#94a3b8;text-align:center;padding:20px 10px;line-height:1.6;">Sin instructivos.<br>Crea uno nuevo o revisa<br>la conexión a Supabase.</p>`;
            return;
        }
        filtered.forEach(i => {
            const div = document.createElement('div');
            div.className = `instructivo-item ${i.id === currentId ? 'active' : ''}`;
            div.innerHTML = `
                <div style="flex:1;min-width:0;">
                    <h4 style="margin:0 0 2px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${i.titulo || 'Sin Título'}</h4>
                    <p style="margin:0;font-size:10px;opacity:.7;">${i.evento || '---'}</p>
                </div>
                <button class="btn-delete-item" title="Eliminar" onclick="event.stopPropagation(); deleteItem('${i.id}')">🗑</button>
            `;
            div.querySelector('div').addEventListener('click', () => loadInstructivo(i.id));
            listContainer.appendChild(div);
        });
    }

    window.deleteItem = function(id) { deleteInstructivo(id); };

    function loadInstructivo(id) {
        const i = instructivos.find(x => x.id === id);
        if (!i) return;
        currentId = id;
        foodIncludesTax = i.foodIncludesTax || false;
        roomIncludesTax = i.roomIncludesTax || false;
        document.getElementById('formTitle').innerText = 'Editando: ' + (i.titulo || '');
        dynamicContainer.innerHTML = '';
        document.querySelectorAll('[data-block]').forEach(cb => cb.checked = false);
        for (const k in i) {
            const input = form.querySelector(`[name="${k}"]`);
            if (input) { if (input.type === 'checkbox') input.checked = i[k] === 'on'; else input.value = i[k]; }
        }
        if (i.activeBlocks) {
            for (const k in i.activeBlocks) {
                const cb = document.querySelector(`[data-block="${k}"]`);
                if (cb) { cb.checked = true; createBlockUI(k, i.activeBlocks[k]); }
            }
        }
        renderList();
        updatePreview();
    }

    function resetForm() {
        currentId = null; foodIncludesTax = false; roomIncludesTax = false; form.reset();
        document.getElementById('formTitle').innerText = 'Nuevo Instructivo';
        dynamicContainer.innerHTML = '';
        document.querySelectorAll('[data-block]').forEach(cb => cb.checked = false);
        updatePreview(); renderList();
    }

    function downloadPDF() {
        const element = document.getElementById('printArea');
        const opt = {
            margin: [10, 6, 10, 8],
            filename: `${reportType === 'instructivo' ? 'Instructivo' : 'Convenio'}_${document.getElementById('pv-titulo').innerText}.pdf`,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    }

    // ── Iniciar carga desde Supabase ──
    loadFromSupabase();

    function showToast(msg) {
        toast.innerText = msg;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3500);
    }
});
