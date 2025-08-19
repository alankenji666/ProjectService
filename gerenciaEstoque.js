// gerenciaEstoque.js

import { createStatusPill } from './utils.js';

export const GerenciarEstoque = (function() {
    // --- Variáveis de estado e configuração privadas ---
    let _dom = {};
    let _utils = {};
    let _callbacks = {};
    let _stockState = {
        statusFilter: 'todos',
        currentPage: 1,
        itemsPerPage: 15,
        sortColumn: 'descricao',
        sortDirection: 'asc'
    };
    let _aguardandoMap = new Map();
    let _currentFilteredProducts = [];
    let _reportQuantities = new Map();
    let _currentView = 'stock'; // 'stock' ou 'report'

    // --- Funções Privadas do Módulo ---

    function _renderSortIcon(column) {
        if (_stockState.sortColumn !== column) return '';
        return _stockState.sortDirection === 'asc' ? '▲' : '▼';
    }

    function _createStatusCard(status, title, count, color) {
        return `<div data-status="${status}" class="status-card ${color} text-white p-3 rounded-lg shadow-lg cursor-pointer transform transition-transform duration-300 hover:scale-105 ${status === _stockState.statusFilter ? 'active' : ''}"><h3 class="text-sm font-semibold">${title}</h3><p class="text-2xl font-bold mt-2">${count}</p></div>`;
    }

    // --- Funções de Renderização e Eventos para a TELA DE ESTOQUE ---

    function _bindStockPageEvents() {
        const stockTable = _dom.pageEstoque.querySelector('table');
        if (stockTable) {
            stockTable.addEventListener('mouseover', (event) => {
                if (event.target.classList.contains('product-list-item-img')) {
                    _utils.showImagePreview(event);
                }
            });
            stockTable.addEventListener('mouseout', (event) => {
                if (event.target.classList.contains('product-list-item-img')) {
                    _utils.hideImagePreview();
                }
            });
        }

        _dom.pageEstoque.querySelectorAll('.status-card').forEach(card => card.addEventListener('click', () => {
            _stockState.statusFilter = card.dataset.status;
            _stockState.currentPage = 1;
            _callbacks.applyFilters();
        }));

        _dom.pageEstoque.querySelectorAll('.sortable-header').forEach(header => header.addEventListener('click', () => {
            const sortKey = header.dataset.sort;
            if (_stockState.sortColumn === sortKey) {
                _stockState.sortDirection = _stockState.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                _stockState.sortColumn = sortKey;
                _stockState.sortDirection = 'asc';
            }
            _callbacks.applyFilters();
        }));

        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (_stockState.currentPage > 1) {
                    _stockState.currentPage--;
                    _callbacks.applyFilters();
                }
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(_currentFilteredProducts.length / _stockState.itemsPerPage);
                if (_stockState.currentPage < totalPages) {
                    _stockState.currentPage++;
                    _callbacks.applyFilters();
                }
            });
        }

        _dom.pageEstoque.querySelectorAll('.stock-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (event) => {
                _callbacks.toggleProductSelection(event.target.dataset.productId, event.target.checked);
            });
        });

        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (event) => {
                const isChecked = event.target.checked;
                const paginatedProducts = _getPaginatedProducts();
                paginatedProducts.forEach(p => {
                    _callbacks.toggleProductSelection(p.id, isChecked);
                });
                 _callbacks.applyFilters(); // Re-render to show checkbox changes
            });
        }
    }
    
    function _getPaginatedProducts(productsWithStatus) {
        const startIndex = (_stockState.currentPage - 1) * _stockState.itemsPerPage;
        const endIndex = startIndex + _stockState.itemsPerPage;
        return productsWithStatus.slice(startIndex, endIndex);
    }

    function _renderStockPage(productsToRender, aguardandoMap, selectedStockItems) {
        _currentFilteredProducts = productsToRender || [];
        _aguardandoMap = aguardandoMap || new Map();

        const productsWithStatus = _currentFilteredProducts.map(p => {
            const aguardandoChegar = _aguardandoMap.get(p.codigo) || 0;
            const estoqueAtual = p.estoque ?? 0;
            const estoqueEfetivo = estoqueAtual + aguardandoChegar;
            let status = 'ok';
            if (p.estoque_minimo !== null && estoqueEfetivo <= p.estoque_minimo) status = 'baixo';
            else if (p.estoque_maximo !== null && estoqueEfetivo > p.estoque_maximo) status = 'excesso';
            else if (estoqueAtual < 0) status = 'indefinido';
            return { ...p, stockStatus: status, aguardandoChegar: aguardandoChegar };
        });

        const statusFilteredProducts = productsWithStatus.filter(p => _stockState.statusFilter === 'todos' ? true : p.stockStatus === _stockState.statusFilter);
        
        statusFilteredProducts.sort((a, b) => {
            const sortKey = _stockState.sortColumn;
            const valA = a[sortKey];
            const valB = b[sortKey];
            let comparison = 0;
            if (['estoque', 'estoque_minimo', 'estoque_maximo', 'vendas_ultimos_90_dias', 'aguardandoChegar'].includes(sortKey)) {
                comparison = (parseFloat(valA) || 0) - (parseFloat(valB) || 0);
            } else {
                comparison = String(valA || '').localeCompare(String(valB || ''), 'pt-BR', { numeric: true });
            }
            return _stockState.sortDirection === 'asc' ? comparison : -comparison;
        });

        const totalItems = statusFilteredProducts.length;
        const totalPages = Math.ceil(totalItems / _stockState.itemsPerPage);
        _stockState.currentPage = Math.min(_stockState.currentPage, totalPages) || 1;
        
        const paginatedProducts = _getPaginatedProducts(statusFilteredProducts);

        let html = `
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold text-gray-800">Diagnóstico de Estoque</h1>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                ${_createStatusCard('todos', 'Itens Filtrados', _currentFilteredProducts.length, 'bg-blue-500')}
                ${_createStatusCard('baixo', 'Estoque Baixo', productsWithStatus.filter(p=>p.stockStatus==='baixo').length, 'bg-yellow-500')}
                ${_createStatusCard('ok', 'Estoque OK', productsWithStatus.filter(p=>p.stockStatus==='ok').length, 'bg-green-500')}
                ${_createStatusCard('excesso', 'Excesso de Estoque', productsWithStatus.filter(p=>p.stockStatus==='excesso').length, 'bg-red-500')}
            </div>
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50"><tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input type="checkbox" id="select-all-checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-sort="descricao">
                            <div class="flex items-center">Produto ${_renderSortIcon('descricao')}</div>
                        </th>
                        <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-sort="estoque">
                            <div class="flex items-center justify-center">Estoque Atual ${_renderSortIcon('estoque')}</div>
                        </th>
                        <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" data-sort="aguardandoChegar">
                            <div class="flex items-center justify-center">Aguardando Chegar ${_renderSortIcon('aguardandoChegar')}</div>
                        </th>
                        <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" data-sort="vendas_ultimos_90_dias">
                            <div class="flex items-center justify-center">Vendas 90d ${_renderSortIcon('vendas_ultimos_90_dias')}</div>
                        </th>
                        <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Mín / Máx</th>
                        <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr></thead>
                    <tbody class="bg-white divide-y divide-gray-200">`;

        if(paginatedProducts.length === 0) {
            html += `<tr><td colspan="7" class="text-center py-8 text-gray-500">Nenhum item encontrado.</td></tr>`;
        } else {
            paginatedProducts.forEach(p => {
                const isChecked = selectedStockItems.has(p.id) ? 'checked' : '';
                const imageUrl = p.url_imagens_externas && p.url_imagens_externas[0] 
                    ? p.url_imagens_externas[0] 
                    : 'https://placehold.co/50x50/e2e8f0/64748b?text=?';
                html += `<tr>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <input type="checkbox" class="stock-checkbox h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" data-product-id="${p.id}" ${isChecked}>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <img src="${imageUrl}" 
                                         alt="${p.descricao || 'Imagem do produto'}" 
                                         class="product-list-item-img" 
                                         data-image-url="${imageUrl}"
                                         onerror="this.onerror=null;this.src='https://placehold.co/50x50/e2e8f0/64748b?text=?';">
                                    <div class="ml-4">
                                        <div class="text-sm font-medium text-gray-900">${p.descricao}</div>
                                        <div class="text-sm text-gray-500">${p.codigo}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-800">${p.estoque ?? 0}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-blue-600">${p.aguardandoChegar}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-600">${p.vendas_ultimos_90_dias ?? 0}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">${p.estoque_minimo ?? 0} / ${p.estoque_maximo ?? 0}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">${createStatusPill(p.stockStatus)}</td>
                        </tr>`;
            });
        }
        html += `</tbody></table></div>
            <div class="flex items-center justify-between mt-4">
                <button id="prev-page-btn" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" ${ _stockState.currentPage === 1 ? 'disabled' : '' }>Anterior</button>
                <span class="text-sm text-gray-700">Página ${_stockState.currentPage} de ${totalPages || 1}</span>
                <button id="next-page-btn" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" ${ _stockState.currentPage === totalPages || totalPages === 0 ? 'disabled' : '' }>Próximo</button>
            </div>
        `;
        _dom.pageEstoque.innerHTML = html;
        
        _bindStockPageEvents();
    }

    // --- Funções de Renderização e Eventos para a TELA DE RELATÓRIO ---

    function _bindReportPageEvents() {
        _dom.pageReport.querySelectorAll('.remove-item-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const productIdToRemove = event.target.dataset.productId;
                _callbacks.toggleProductSelection(productIdToRemove, false); // Desmarca o item
                _reportQuantities.delete(productIdToRemove); 
                render(_callbacks.getFilteredProducts(), _callbacks.getAguardandoMap(), _callbacks.getSelectedItems());
            });
        });

        _dom.pageReport.addEventListener('mouseover', (event) => {
            if (event.target.classList.contains('product-list-item-img')) {
                _utils.showImagePreview(event);
            }
        });
        _dom.pageReport.addEventListener('mouseout', (event) => {
            if (event.target.classList.contains('product-list-item-img')) {
                _utils.hideImagePreview();
            }
        });
    }

    function _renderReportPage(allProducts, selectedItems, aguardandoMap) {
        const selectedProducts = allProducts.filter(p => selectedItems.has(p.id));
        
        selectedProducts.forEach(p => {
            if (!_reportQuantities.has(p.id)) {
                const vendas90d = p.vendas_ultimos_90_dias || 0;
                const estoqueMin = p.estoque_minimo || 0;
                const estoqueMax = p.estoque_maximo || 0;
                const estoqueAtual = p.estoque || 0;
                let calculatedQty = (vendas90d + estoqueMin) - estoqueAtual;
                if (estoqueMax > 0) {
                    const maxOrderQty = estoqueMax - estoqueAtual;
                    if (calculatedQty > maxOrderQty) calculatedQty = maxOrderQty;
                }
                const initialQty = Math.round(Math.max(0, calculatedQty));
                _reportQuantities.set(p.id, initialQty);
            }
        });

        let reportContentHtml = `
            <div id="page-report-content" class="container mx-auto mt-4">
                <h1 class="text-3xl font-bold text-gray-800 mb-6 text-center">Relatório de Produtos Selecionados</h1>
                <div class="bg-white rounded-lg shadow-md overflow-hidden">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-full">Produto</th>
                                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estoque</th>
                                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aguardando Chegar</th>
                                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Mín/Máx</th>
                                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd. a Requisitar</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
        `;
        selectedProducts.forEach(p => {
            const currentQuantity = _reportQuantities.get(p.id) || 0;
            const aguardandoChegar = aguardandoMap.get(p.codigo) || 0;
            const imageUrl = p.url_imagens_externas && p.url_imagens_externas[0] 
                ? p.url_imagens_externas[0] 
                : 'https://placehold.co/50x50/e2e8f0/64748b?text=?';
            reportContentHtml += `
                <tr data-product-id="${p.id}">
                    <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button class="remove-item-btn text-red-600 hover:text-red-900" data-product-id="${p.id}">Remover</button>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <img src="${imageUrl}" alt="${p.descricao || 'Imagem do produto'}" class="product-list-item-img" data-image-url="${imageUrl}" onerror="this.onerror=null;this.src='https://placehold.co/50x50/e2e8f0/64748b?text=?';">
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">${p.descricao}</div>
                                <div class="text-sm text-gray-500">${p.codigo}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-800">${p.estoque ?? 0}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-blue-600">${aguardandoChegar}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">${p.estoque_minimo ?? 0} / ${p.estoque_maximo ?? 0}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <input type="number" value="${currentQuantity}" data-product-id="${p.id}" class="report-quantity-input w-24 px-2 py-1 border border-gray-300 rounded-md text-center" min="0">
                    </td>
                </tr>
            `;
        });
        reportContentHtml += `</tbody></table></div></div>`;

        _dom.pageReport.innerHTML = reportContentHtml;
        _bindReportPageEvents();
    }

    // --- Funções Públicas ---

    function render(productsToRender, aguardandoMap, selectedStockItems, allProducts) {
        if (_currentView === 'stock') {
            _renderStockPage(productsToRender, aguardandoMap, selectedStockItems);
        } else if (_currentView === 'report') {
            _renderReportPage(allProducts, selectedItems, aguardandoMap);
        }
    }
    
    function generateReport(allProducts, selectedItems, aguardandoMap) {
        if (selectedItems.size === 0) {
            _utils.showMessageModal("Nenhum Item Selecionado", "Por favor, selecione ao menos um item para gerar o relatório.");
            return;
        }
        _currentView = 'report';
        _callbacks.showPage('report');
        render(null, aguardandoMap, selectedItems, allProducts);
    }
    
    function updateReportQuantity(productId, newQuantity) {
        const parsedQuantity = parseInt(newQuantity, 10);
        if (!isNaN(parsedQuantity) && parsedQuantity >= 0) {
            _reportQuantities.set(productId, parsedQuantity);
        } else {
            _reportQuantities.set(productId, 0);
        }
    }

    function backToStockView() {
        _currentView = 'stock';
        _callbacks.showPage('estoque');
    }

    function init(config) {
        _dom = {
            pageEstoque: config.domElements.pageEstoque,
            pageReport: config.domElements.pageReport
        };
        _utils = {
            showImagePreview: config.utilities.showImagePreview,
            hideImagePreview: config.utilities.hideImagePreview,
            showMessageModal: config.utilities.showMessageModal
        };
        _callbacks = {
            toggleProductSelection: config.callbacks.toggleProductSelection,
            applyFilters: config.callbacks.applyFilters,
            showPage: config.callbacks.showPage,
            getFilteredProducts: config.callbacks.getFilteredProducts,
            getAguardandoMap: config.callbacks.getAguardandoMap,
            getSelectedItems: config.callbacks.getSelectedItems
        };
    }

    return {
        init,
        render,
        generateReport,
        updateReportQuantity,
        backToStockView
    };
})();
