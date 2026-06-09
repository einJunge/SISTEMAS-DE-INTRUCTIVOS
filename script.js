/**
 * SISTEMA DE INSTRUCTIVOS PREMIUM - AMATIQUE BAY
 * Lógica: UI Moderna + Reporte Institucional + Persistencia Permanente + Escalado Responsivo
 */

document.addEventListener('DOMContentLoaded', () => {
    let instructivos = JSON.parse(localStorage.getItem('instructivos_amatique')) || [];
    let currentId = null;
    let foodIncludesTax = false;
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
                    createBlockUI(key);
                } else {
                    removeBlockUI(key);
                }
                updatePreview();
            });
        });
    }

    function handleResize() {
        const containerWidth = document.getElementById('previewPanel').offsetWidth - 40;
        const reportWidth = 794; 
        const scale = containerWidth / reportWidth;
        if (scale < 1) {
            previewContainer.style.transform = `scale(${scale})`;
            previewContainer.style.height = `${printArea.offsetHeight * scale}px`;
        } else {
            previewContainer.style.transform = 'scale(1)';
            previewContainer.style.height = 'auto';
        }
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
        div.innerHTML = `<div class="block-header"><h5>${template.title} ${(['alimentos_desglose', 'cocteles'].includes(key) && foodIncludesTax) ? '(IVA Inc.)' : ''}</h5></div><div class="block-content">${content}</div>`;
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
            reportTitle.innerText = reportType === 'instructivo' ? 'INSTRUCTIVO DE SERVICIOS' : 'CONVENIO DE EVENTO';
            if (reportType === 'instructivo') {
                const subTitle = document.createElement('div');
                subTitle.style.fontSize = '16px';
                subTitle.style.fontWeight = 'bold';
                subTitle.innerText = data.titulo || '';
                reportTitle.after(subTitle);
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
            renderConvenioResumido(pvDynamic, data, rate);
        }

        updateFinancialDisplay(data, rate);
    }

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

    function renderConvenioResumido(container, data, rate) {
        const comercialBlocks = ['cancelacion', 'pagos', 'facturacion'];
        document.querySelectorAll('[data-block]:checked').forEach(cb => {
            const key = cb.dataset.block;
            if (comercialBlocks.includes(key)) {
                const template = blockTemplates[key];
                const section = document.createElement('div');
                section.className = 'report-section page-break-avoid';
                const content = `<p class="text-block">${document.querySelector(`[name="block_data_${key}"]`).value || '---'}</p>`;
                section.innerHTML = `<div class="report-section-title">${template.title}</div>${content}`;
                container.appendChild(section);
            }
        });

        const summarySection = document.createElement('div');
        summarySection.className = 'report-section page-break-avoid';
        let hasSummary = false;
        const summaryRows = [];

        document.querySelectorAll('[data-block]:checked').forEach(cb => {
            if (cb.dataset.block === 'hospedaje_desglose') {
                hasSummary = true;
                document.querySelectorAll(`#table-hospedaje_desglose tbody tr`).forEach(tr => {
                    const inputs = tr.querySelectorAll('input');
                    summaryRows.push({
                        servicio: inputs[0].value + ' (' + inputs[2].value + ' noches)',
                        cantidad: inputs[1].value,
                        total: 'Q ' + parseFloat(inputs[4].value).toLocaleString('en-US', {minimumFractionDigits: 2})
                    });
                });
            }
        });

        const detailedKeys = ['alimentos_desglose', 'cocteles', 'otros_cargos', 'cortesias'];
        document.querySelectorAll('[data-block]:checked').forEach(cb => {
            const key = cb.dataset.block;
            if (detailedKeys.includes(key)) {
                hasSummary = true;
                document.querySelectorAll(`#table-${key} tbody tr`).forEach(tr => {
                    const inputs = tr.querySelectorAll('input');
                    const isCortesía = key === 'cortesias';
                    summaryRows.push({
                        servicio: inputs[0].value + (isCortesía ? ' (Cortesía)' : ''),
                        cantidad: inputs[1].value,
                        total: isCortesía ? 'Q 0.00' : 'Q ' + parseFloat(inputs[3].value).toLocaleString('en-US', {minimumFractionDigits: 2})
                    });
                });
            }
        });

        if (hasSummary) {
            let tableRows = '';
            summaryRows.forEach(row => {
                tableRows += `<tr><td>${row.servicio}</td><td>${row.cantidad}</td><td style="text-align: right;">${row.total}</td></tr>`;
            });
            const calc = completeFinancialCalculations(data, rate);
            summarySection.innerHTML = `
                <div class="report-section-title">RESUMEN DE SERVICIOS Y PRESUPUESTO</div>
                <table class="report-table">
                    <thead><tr><th>Servicio</th><th>Cantidad</th><th>Valor</th></tr></thead>
                    <tbody>
                        ${tableRows}
                        <tr style="background: #f8fafc; font-weight: bold;">
                            <td colspan="2" style="text-align: right;">TOTAL ESTIMADO DEL EVENTO</td>
                            <td style="text-align: right;">Q ${calc.grandTotalGTQ.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        </tr>
                    </tbody>
                </table>`;
            container.appendChild(summarySection);
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
                // En nuestras tablas, el campo 'Total' es siempre el último input del tr
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

        const roomIVA = roomSubRecalc * ivaRate;
        const roomTurismo = roomSubRecalc * roomTaxRate;
        const roomTotal = roomSubRecalc + roomIVA + roomTurismo;

        const grandTotalGTQ = foodTotal + roomTotal + othersSubRecalc;
        const grandTotalUSD = grandTotalGTQ / rate;
        
        return { foodSubRecalc, foodIVA, foodService, foodTotal, roomSubRecalc, roomIVA, roomTurismo, roomTotal, othersSubRecalc, discountsRecalc, grandTotalGTQ, grandTotalUSD };
    }

    function updateFinancialDisplay(data, rate) {
        const calc = completeFinancialCalculations(data, rate);
        const summaryArea = document.querySelector('.financial-summary');
        
        // El resumen financiero SIEMPRE debe ser visible y detallado
        document.querySelector('.signature-area').style.display = 'flex';
        document.querySelector('.report-section:has(#pv-observaciones)').style.display = 'block';

        if (reportType === 'instructivo') {
            // En INSTRUCTIVO, primero mostramos las tablas de desglose SEPARADAS
            let detailedTables = '';
            
            // Tabla Alimentos
            let foodRows = '';
            let foodSectionSubtotal = 0;
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

            // Tabla Hospedaje
            let roomRows = '';
            let roomSectionSubtotal = 0;
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

            // Tabla Otros
            let otherRows = '';
            let otherSectionSubtotal = 0;
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

            // Finalmente el Resumen Financiero
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
                        <div class="box-title">RESUMEN HOSPEDAJE</div>
                        <div class="summary-row"><span>Subtotal Bruto:</span> <span>${fmt(calc.roomSubRecalc)}</span></div>
                        <div class="summary-row"><span>IVA (12%):</span> <span>${fmt(calc.roomIVA)}</span></div>
                        <div class="summary-row"><span>TURISMO (10%):</span> <span>${fmt(calc.roomTurismo)}</span></div>
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
            summaryArea.innerHTML = `
                <div class="summary-columns">
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
                        <div class="box-title">RESUMEN HOSPEDAJE</div>
                        <div class="summary-row"><span>Subtotal Bruto:</span> <span>${fmt(calc.roomSubRecalc)}</span></div>
                        <div class="summary-row"><span>IVA (12%):</span> <span>${fmt(calc.roomIVA)}</span></div>
                        <div class="summary-row"><span>TURISMO (10%):</span> <span>${fmt(calc.roomTurismo)}</span></div>
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
            obsTitle.innerText = reportType === 'convenio' ? 'OBSERVACIONES COMERCIALES Y ACUERDOS' : 'OBSERVACIONES';
        }
        handleResize();
    }

    function fmt(val) { return 'Q ' + val.toLocaleString('en-US', {minimumFractionDigits: 2}); }

    function saveInstructivo() {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.foodIncludesTax = foodIncludesTax;
        data.activeBlocks = {};
        document.querySelectorAll('[data-block]:checked').forEach(cb => {
            const key = cb.dataset.block;
            if (blockTemplates[key].type === 'text') data.activeBlocks[key] = document.querySelector(`[name="block_data_${key}"]`).value;
            else {
                const rows = [];
                document.querySelectorAll(`#table-${key} tbody tr`).forEach(tr => {
                    const r = []; tr.querySelectorAll('input').forEach(i => r.push(i.value)); rows.push(r);
                });
                data.activeBlocks[key] = rows;
            }
        });
        if (currentId) {
            const idx = instructivos.findIndex(i => i.id === currentId);
            instructivos[idx] = { ...data, id: currentId };
        } else {
            const newId = Date.now().toString();
            instructivos.push({ ...data, id: newId });
            currentId = newId;
        }
        localStorage.setItem('instructivos_amatique', JSON.stringify(instructivos));
        showToast('¡Guardado Permanente!');
        renderList();
    }

    function renderList(filter = '') {
        listContainer.innerHTML = '';
        instructivos.filter(i => (i.titulo||'').toLowerCase().includes(filter.toLowerCase())).forEach(i => {
            const div = document.createElement('div');
            div.className = `instructivo-item ${i.id === currentId ? 'active' : ''}`;
            div.innerHTML = `<h4>${i.titulo || 'Sin Título'}</h4><p>${i.evento || '---'}</p>`;
            div.onclick = () => loadInstructivo(i.id);
            listContainer.appendChild(div);
        });
    }

    function loadInstructivo(id) {
        const i = instructivos.find(x => x.id === id);
        if (!i) return;
        currentId = id;
        foodIncludesTax = i.foodIncludesTax || false;
        document.getElementById('formTitle').innerText = 'Editando: ' + i.titulo;
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
        currentId = null; foodIncludesTax = false; form.reset();
        document.getElementById('formTitle').innerText = 'Nuevo Instructivo';
        dynamicContainer.innerHTML = '';
        document.querySelectorAll('[data-block]').forEach(cb => cb.checked = false);
        updatePreview(); renderList();
    }

    function downloadPDF() {
        const element = document.getElementById('printArea');
        const opt = {
            margin: [08, 06, 12, 08],
            filename: `${reportType === 'instructivo' ? 'Instructivo' : 'Convenio'}_${document.getElementById('pv-titulo').innerText}.pdf`,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    }

    window.exportData = function() {
        const dataStr = JSON.stringify(instructivos);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', 'BACKUP_INSTRUCTIVOS_AMATIQUE.json');
        linkElement.click();
        showToast('Backup Exportado');
    };

    window.importData = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    instructivos = imported;
                    localStorage.setItem('instructivos_amatique', JSON.stringify(instructivos));
                    renderList();
                    showToast('Backup Importado con Éxito');
                }
            } catch (err) { alert('Archivo no válido'); }
        };
        reader.readAsText(file);
    };

    function showToast(msg) {
        toast.innerText = msg;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
    }
});
