/**
 * SISTEMA DE INSTRUCTIVOS PREMIUM - AMATIQUE BAY
 * Lógica: UI Moderna + Reporte con Colores Institucionales y Márgenes PDF
 */

document.addEventListener('DOMContentLoaded', () => {
    let instructivos = JSON.parse(sessionStorage.getItem('instructivos')) || [];
    let currentId = null;
    let foodIncludesTax = false;

    // Elementos DOM
    const form = document.getElementById('instructivoForm');
    const listContainer = document.getElementById('instructivoList');
    const dynamicContainer = document.getElementById('dynamicBlocksContainer');
    const searchInput = document.getElementById('searchInput');
    const btnSave = document.getElementById('btnSave');
    const btnNew = document.getElementById('btnNew');
    const btnPDF = document.getElementById('btnDownloadPDF');
    const exchangeInput = document.getElementById('exchangeRate');
    const toast = document.getElementById('toast');

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
        cortesias: { title: 'Cortesías', type: 'table', cols: ['Descripción', 'Cant', 'Valor', 'Total'], category: 'other' },
        descuentos: { title: 'Descuentos', type: 'table', cols: ['Descripción', '%', 'Valor'], category: 'discount' }
    };

    renderList();
    initListeners();
    updatePreview();

    function initListeners() {
        btnSave.addEventListener('click', saveInstructivo);
        btnNew.addEventListener('click', resetForm);
        btnPDF.addEventListener('click', downloadPDF);
        searchInput.addEventListener('input', (e) => renderList(e.target.value));
        exchangeInput.addEventListener('input', updatePreview);
        form.addEventListener('input', updatePreview);

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
        document.getElementById('pv-titulo').innerText = data.titulo || '---';
        document.getElementById('pv-evento').innerText = data.evento || '---';
        document.getElementById('pv-contacto').innerText = data.contacto || '---';
        document.getElementById('pv-ejecutiva').innerText = data.ejecutiva || '---';
        document.getElementById('pv-fecha_elaboracion').innerText = data.fecha_elaboracion || '---';
        document.getElementById('pv-fecha_evento').innerText = data.fecha_evento || '---';
        document.getElementById('pv-hora_ingreso').innerText = data.hora_ingreso || '---';
        document.getElementById('pv-asistencia').innerText = data.asistencia || '---';
        document.getElementById('pv-cuenta_maestra').innerText = data.cuenta_maestra || '---';
        document.getElementById('pv-pago').innerText = data.facturado_pagado ? 'FACTURADO Y PAGADO' : 'PENDIENTE';
        document.getElementById('pv-observaciones').innerText = data.observaciones || '---';
        document.getElementById('pv-id').innerText = 'ID: #' + (currentId ? currentId.slice(-4) : '0000');
        document.getElementById('pv-current-date').innerText = new Date().toLocaleDateString();
        document.getElementById('pv-rate-val').innerText = rate.toFixed(2);

        const pvDynamic = document.getElementById('pv-dynamic-sections');
        pvDynamic.innerHTML = '';
        let foodSub = 0, roomSub = 0, discounts = 0;

        document.querySelectorAll('[data-block]:checked').forEach(cb => {
            const key = cb.dataset.block;
            const template = blockTemplates[key];
            const section = document.createElement('div');
            section.className = 'report-section page-break-avoid';
            let content = '';
            if (template.type === 'text') {
                content = `<p class="text-block">${document.querySelector(`[name="block_data_${key}"]`).value || '---'}</p>`;
            } else {
                const rows = document.querySelectorAll(`#table-${key} tbody tr`);
                let tableRows = '';
                rows.forEach(tr => {
                    const inputs = tr.querySelectorAll('input');
                    tableRows += `<tr>${Array.from(inputs).map(inp => `<td>${inp.value}</td>`).join('')}</tr>`;
                    const totalVal = parseFloat(tr.querySelector('input[readOnly], input[data-col="2"]')?.value) || 0;
                    if (template.category === 'food') foodSub += totalVal;
                    if (template.category === 'room') roomSub += totalVal;
                    if (template.category === 'discount') discounts += (parseFloat(inputs[2].value) || 0);
                });
                content = `<table class="report-table"><thead><tr>${template.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${tableRows || '<tr><td colspan="100%">Sin datos</td></tr>'}</tbody></table>`;
            }
            section.innerHTML = `<div class="report-section-title">${template.title} ${(['alimentos_desglose', 'cocteles'].includes(key) && foodIncludesTax) ? '(Precios Incluyen IVA)' : ''}</div>${content}`;
            pvDynamic.appendChild(section);
        });

        const ivaRate = (parseFloat(data.tax_percent) || 12) / 100;
        const roomTaxRate = (parseFloat(data.turismo_percent) || 10) / 100;
        const serviceRate = data.omit_service ? 0 : ((parseFloat(data.service_percent) || 10) / 100);
        const propinaFija = parseFloat(data.propina_fija) || 0;

        let foodIVA = foodIncludesTax ? 0 : (foodSub * ivaRate);
        const foodService = foodSub * serviceRate;
        const foodTotal = foodSub + foodIVA + foodService + propinaFija;
        const roomIVA = roomSub * ivaRate;
        const roomTurismo = roomSub * roomTaxRate;
        const roomTotal = roomSub + roomIVA + roomTurismo;
        const grandTotalGTQ = foodTotal + roomTotal - discounts;
        const grandTotalUSD = grandTotalGTQ / rate;

        document.getElementById('pv-food-sub').innerText = fmt(foodSub);
        document.getElementById('pv-food-tax').innerText = foodIncludesTax ? "INCLUIDO" : fmt(foodIVA);
        document.getElementById('pv-food-service').innerText = fmt(foodService);
        document.getElementById('pv-food-propina').innerText = fmt(propinaFija);
        document.getElementById('pv-food-total').innerText = fmt(foodTotal);
        document.getElementById('pv-row-service').style.display = data.omit_service ? 'none' : 'flex';
        document.getElementById('pv-room-sub').innerText = fmt(roomSub);
        document.getElementById('pv-room-tax').innerText = fmt(roomIVA);
        document.getElementById('pv-room-turismo').innerText = fmt(roomTurismo);
        document.getElementById('pv-room-total').innerText = fmt(roomTotal);
        document.getElementById('pv-grand-total-gtq').innerText = fmt(grandTotalGTQ);
        document.getElementById('pv-grand-total-usd').innerText = `$ ${grandTotalUSD.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById('pv-usd-area').style.display = data.show_usd ? 'flex' : 'none';
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
        sessionStorage.setItem('instructivos', JSON.stringify(instructivos));
        showToast('¡Guardado!');
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
        
        // Configuración html2pdf con márgenes de seguridad
        const opt = {
            margin: [10, 10, 10, 10], // Margen de 10mm en todos los lados
            filename: `Instructivo_${document.getElementById('pv-titulo').innerText}.pdf`,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                letterRendering: true
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        // Pre-cargar imágenes antes de generar
        const images = element.getElementsByTagName('img');
        const promises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
        });

        Promise.all(promises).then(() => {
            html2pdf().set(opt).from(element).save();
        });
    }

    function showToast(msg) {
        toast.innerText = msg;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
    }
});
