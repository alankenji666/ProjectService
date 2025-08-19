// app.js - Módulo Principal da Aplicação

// Importa todos os outros módulos e utilitários necessários
import { debounce, addBusinessDays, getBusinessDaysDifference, createDetailItem, createNFeCard } from './utils.js';
import { PesquisarProduto } from './pesquisarProduto.js';
import { Dashboards } from './dashBoardVendas.js';
import { ConferenciaNFe } from './conferenciaNFe.js';
import { GerenciarEstoque } from './gerenciaEstoque.js';

export const App = (function() {
    // --- URLs e Módulos (serão recebidos na inicialização) ---
    let _urls = {};
    let _modules = {};

    // --- Variáveis de Estado Globais ---
    let _allProducts = [];
    let _allOrdersTerceiros = []; 
    let _allOrdersFabrica = []; 
    let _allNFeData = []; 
    let _selectedStockItems = new Set();
    let _currentModalFabricaOrdersForPrint = [];
    
    let _ordersTableState = {
        searchTerm: '',
        sortColumn: 'descricao', 
        sortDirection: 'asc', 
        selectedType: 'terceiros',
        statusFilters: new Set() 
    };

    let _itemsToPrint = [];
    let _currentPrintModalType = '';

    // --- Referências ao DOM ---
    let _dom = {};

    // --- Funções de Utilidade ---
    function _parsePtBrDate(dateString) {
        if (!dateString || typeof dateString !== 'string') return null;
        const parts = dateString.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                const fullYear = year < 100 ? 2000 + year : year;
                return new Date(fullYear, month, day);
            }
        }
        return null;
    }

    function _showMessageModal(title, message) {
        _dom.messageModalTitle.textContent = title;
        _dom.messageModalContent.innerHTML = message;
        _dom.messageModal.classList.remove('hidden');
    }

    function _showConfirmationModal(title, message) {
        return new Promise((resolve) => {
            _dom.confirmationModalTitle.textContent = title;
            _dom.confirmationModalContent.innerHTML = message;
            _dom.confirmationModal.classList.remove('hidden');

            const onConfirm = () => {
                _dom.confirmYesBtn.removeEventListener('click', onConfirm);
                _dom.confirmNoBtn.removeEventListener('click', onCancel);
                _dom.confirmationModal.classList.add('hidden');
                resolve(true);
            };

            const onCancel = () => {
                _dom.confirmYesBtn.removeEventListener('click', onConfirm);
                _dom.confirmNoBtn.removeEventListener('click', onCancel);
                _dom.confirmationModal.classList.add('hidden');
                resolve(false);
            };

            _dom.confirmYesBtn.addEventListener('click', onConfirm, { once: true });
            _dom.confirmNoBtn.addEventListener('click', onCancel, { once: true });
        });
    }
    
    function _showImagePreview(event) {
        const imgElement = event.target;
        const imageUrl = imgElement.dataset.imageUrl;
        if (!imageUrl || imageUrl.includes('placehold.co')) return;

        if (_dom.customProductTooltip) {
            _dom.customProductTooltip.innerHTML = `<img src="${imageUrl}" alt="Pré-visualização" class="max-w-xs max-h-xs rounded-lg shadow-lg">`;
            const rect = imgElement.getBoundingClientRect();
            _dom.customProductTooltip.style.left = `${rect.right + 15}px`;
            _dom.customProductTooltip.style.visibility = 'hidden';
            _dom.customProductTooltip.classList.remove('hidden');
            const tooltipHeight = _dom.customProductTooltip.offsetHeight;
            let topPos = rect.top;
            if (topPos + tooltipHeight > window.innerHeight) {
                topPos = window.innerHeight - tooltipHeight - 10;
            }
            if (topPos < 10) {
                topPos = 10;
            }
            _dom.customProductTooltip.style.top = `${topPos}px`;
            _dom.customProductTooltip.style.visibility = 'visible';
            void _dom.customProductTooltip.offsetWidth;
            _dom.customProductTooltip.style.opacity = '1';
        }
    }

    function _hideImagePreview() {
        if (_dom.customProductTooltip) {
            _dom.customProductTooltip.style.opacity = '0';
            setTimeout(() => {
                if (_dom.customProductTooltip.style.opacity === '0') {
                    _dom.customProductTooltip.classList.add('hidden');
                    _dom.customProductTooltip.innerHTML = '';
                }
            }, 200);
        }
    }

    // --- Funções de Lógica Principal ---
    function _showPage(pageId) {
        Object.values(_dom.pages).forEach(page => page.classList.add('hidden'));
        Object.values(_dom.navLinks).forEach(link => link.classList.remove('active'));
        
        if(_dom.globalFilterBar) _dom.globalFilterBar.classList.add('hidden');
        if(_dom.dashboardFilterBar) _dom.dashboardFilterBar.classList.add('hidden');
        if(_dom.nfeFilterBar) _dom.nfeFilterBar.classList.add('hidden');
        if(_dom.reportActionBar) _dom.reportActionBar.classList.add('hidden');
        if(_dom.requisitionActionBar) _dom.requisitionActionBar.classList.add('hidden');

        let pageToShow = _dom.pages.pesquisar;
        let navLinkToActivate = _dom.navLinks.pesquisar;

        switch(pageId) {
            case 'estoque':
                pageToShow = _dom.pages.estoque;
                navLinkToActivate = _dom.navLinks.estoque;
                if (_dom.globalFilterBar) {
                    _dom.globalFilterBar.classList.remove('hidden');
                    _dom.stockActionsContainer.classList.remove('hidden');
                }
                _updateSelectedCountDisplay();
                break;
            case 'conferencia-nfe':
                pageToShow = _dom.pages.conferenciaNFe;
                navLinkToActivate = _dom.navLinks.conferenciaNFe;
                if (_dom.nfeFilterBar) _dom.nfeFilterBar.classList.remove('hidden');
                if (typeof _modules.ConferenciaNFe !== 'undefined') _modules.ConferenciaNFe.render();
                break;
            case 'dashboards':
                pageToShow = _dom.pages.dashboards;
                navLinkToActivate = _dom.navLinks.dashboards;
                if (_dom.dashboardFilterBar) _dom.dashboardFilterBar.classList.remove('hidden');
                if (typeof _modules.Dashboards !== 'undefined') _modules.Dashboards.render();
                break;
            case 'overview-requisitions':
                pageToShow = _dom.pages.overviewRequisitions;
                if (_dom.requisitionActionBar) _dom.requisitionActionBar.classList.remove('hidden');
                _renderRequisitionOverviewPage();
                break;
            case 'report':
                pageToShow = _dom.pages.report;
                if (_dom.reportActionBar) _dom.reportActionBar.classList.remove('hidden');
                break;
            case 'pesquisar':
            default:
                if (_dom.globalFilterBar) {
                    _dom.globalFilterBar.classList.remove('hidden');
                    _dom.stockActionsContainer.classList.add('hidden');
                }
                if (typeof _modules.PesquisarProduto !== 'undefined') _modules.PesquisarProduto.render(_allProducts);
                break;
        }
        
        pageToShow.classList.remove('hidden');
        if(navLinkToActivate) navLinkToActivate.classList.add('active');
        _applyGlobalFilters();
    }

    async function _fetchData() {
        _dom.loadingOverlay.classList.remove('hidden');
        try {
            const [productsRes, ordersTerceirosRes, ordersFabricaRes, nfeRes] = await Promise.all([
                fetch(`${_urls.PRODUCTS_API_URL}?t=${new Date().getTime()}`),
                fetch(`${_urls.ORDERS_API_URL_TERCEIROS}?t=${new Date().getTime()}`),
                fetch(`${_urls.ORDERS_API_URL_FABRICA}?t=${new Date().getTime()}`),
                fetch(`${_urls.NFE_API_URL}?t=${new Date().getTime()}`)
            ]);

            const productsData = await productsRes.json();
            _allProducts = productsData.data || [];

            const ordersTerceirosData = await ordersTerceirosRes.json();
            _allOrdersTerceiros = _processRawOrdersData(ordersTerceirosData.data, 'terceiros');

            const ordersFabricaData = await ordersFabricaRes.json();
            _allOrdersFabrica = _processRawOrdersData(ordersFabricaData.data, 'fabrica');

            const nfeData = await nfeRes.json();
            _allNFeData = nfeData.data || [];

            _renderCategoryFilters();
            _applyGlobalFilters();
            _updateSelectedCountDisplay();

            const currentPage = document.querySelector('main:not(.hidden)');
            if (currentPage) {
                const pageId = currentPage.id.replace('page-', '').replace(/-/g, '');
                if (pageId === 'conferencianfe' && typeof _modules.ConferenciaNFe !== 'undefined') _modules.ConferenciaNFe.render();
                if (pageId === 'dashboards' && typeof _modules.Dashboards !== 'undefined') _modules.Dashboards.render();
            }

        } catch (error) {
            _showMessageModal("Erro ao Carregar Dados", `Falha ao buscar dados: ${error.message}. Verifique a conexão e as URLs das APIs.`);
        } finally {
            _dom.loadingOverlay.classList.add('hidden');
        }
    }
    
    function _processRawOrdersData(rawData, type) {
        if (!rawData || rawData.length < 2) { 
            return [];
        }
        const headers = rawData[0].map(h => h && typeof h === 'string' ? h.toLowerCase().trim() : '');
        const itemRows = rawData.slice(1);
        const requiredCols = ['requisição', 'situação', 'data pedido'];
        if (requiredCols.some(col => headers.indexOf(col) === -1)) {
            console.error("Colunas essenciais faltando nos dados de pedidos:", headers);
            return [];
        }
        const colIndices = {
            requisition: headers.indexOf('requisição'),
            situacao: headers.indexOf('situação'),
            dataPedido: headers.indexOf('data pedido'),
            codigoService: headers.indexOf('codigo service'),
            codigoMks: headers.indexOf('codigo mks-equipamentos'),
            descricao: headers.indexOf('descrição'),
            quantidade: headers.indexOf('quantidade pedido'),
            localizacao: headers.indexOf('localização'),
            diasCorridos: headers.indexOf('dias corridos'),
            observacao: headers.indexOf('observação'),
            prazoEntrega: headers.indexOf('prazo entrega')
        };

        const ordersMap = new Map(); 
        itemRows.forEach(row => {
            const orderCode = row[colIndices.requisition];
            if (!orderCode) return; 

            if (!ordersMap.has(orderCode)) {
                ordersMap.set(orderCode, {
                    orderCode: orderCode,
                    dataPedido: row[colIndices.dataPedido], 
                    totalItems: 0,
                    totalAtendido: 0,
                    totalPendente: 0,
                    rawItems: [], 
                    itemHeaders: headers 
                });
            }
            const order = ordersMap.get(orderCode);
            const itemStatus = (row[colIndices.situacao] || '').toLowerCase();
            order.rawItems.push({
                orderCode: orderCode,
                codigoService: row[colIndices.codigoService] || '',
                codigoMksEquipamentos: row[colIndices.codigoMks] || '', 
                descricao: row[colIndices.descricao] || '',
                localizacao: row[colIndices.localizacao] || 0,
                quantidadePedido: row[colIndices.quantidade] || 0,
                situacao: itemStatus,
                dataPedido: row[colIndices.dataPedido],
                diasCorridosRaw: row[colIndices.diasCorridos] || 0, 
                observacao: row[colIndices.observacao] || '',
                prazoEntregaRaw: row[colIndices.prazoEntrega] || '',
                requisitionType: type
            });
            order.totalItems++;
            if (itemStatus === 'ok') {
                order.totalAtendido++;
            } else {
                order.totalPendente++;
            }
        });

        return Array.from(ordersMap.values()).map(order => {
            if (order.totalItems === 0) order.situacao = 'Sem Itens';
            else if (order.totalPendente === 0) order.situacao = 'Atendido';
            else if (order.totalAtendido > 0) order.situacao = 'Parcialmente Atendido';
            else order.situacao = 'Pendente';
            return order;
        });
    }

    function _applyGlobalFilters() {
        if (!_dom.globalSearchInput || !_dom.globalCategoryCheckboxesContainer) return;
        const searchTerm = _dom.globalSearchInput.value.toLowerCase();
        const selectedCategories = [..._dom.globalCategoryCheckboxesContainer.querySelectorAll('.category-checkbox:checked')].map(cb => cb.value);
        
        if (_dom.globalFilterButtonLabel) _dom.globalFilterButtonLabel.textContent = `Filtro (${selectedCategories.length})`;

        let filteredProducts = _allProducts.filter(product => {
            const searchMatch = (product.codigo?.toLowerCase().includes(searchTerm) || product.descricao?.toLowerCase().includes(searchTerm));
            
            let categoryMatch = selectedCategories.length === 0 ? true : selectedCategories.some(categoryKey => {
                switch (categoryKey) {
                    case 'consumo': return product.grupo_de_tags_tags?.includes('Estoque - Consumo');
                    case 'fabrica': return product.grupo_de_tags_tags?.includes('Estoque - Fábrica');
                    case 'terceiros': return product.grupo_de_tags_tags?.includes('Estoque - Terceiros');
                    case 'demanda': return product.grupo_de_tags_tags?.includes('Sob Demanda - Fábrica');
                    case 'servicos': return product.codigo?.startsWith('7');
                    case 'em_branco': return !product.grupo_de_tags_tags || product.grupo_de_tags_tags.length === 0 || (product.grupo_de_tags_tags.length === 1 && product.grupo_de_tags_tags[0] === '');
                    default: return false;
                }
            });
            return searchMatch && categoryMatch;
        });
        
        filteredProducts.sort((a, b) => {
            const descA = a.descricao || '';
            const descB = b.descricao || '';
            return descA.localeCompare(descB, 'pt-BR');
        });


        if (!_dom.pages.pesquisar.classList.contains('hidden')) {
            if (typeof _modules.PesquisarProduto !== 'undefined') {
                _modules.PesquisarProduto.render(filteredProducts);
            }
        }
        if (!_dom.pages.estoque.classList.contains('hidden')) {
            const stockPageProducts = filteredProducts.filter(p => !p.codigo?.startsWith('7'));
            if (typeof _modules.GerenciarEstoque !== 'undefined') {
                _modules.GerenciarEstoque.render(stockPageProducts, _calculateAguardandoChegarMap(), _selectedStockItems, _allProducts);
            }
        }
    }

    function _renderCategoryFilters() {
        const container = _dom.globalCategoryCheckboxesContainer;
        if (!container) return; 
        const categories = {
            consumo: { label: 'Estoque - Consumo', check: p => p.grupo_de_tags_tags?.includes('Estoque - Consumo') },
            fabrica: { label: 'Estoque - Fábrica', check: p => p.grupo_de_tags_tags?.includes('Estoque - Fábrica') },
            terceiros: { label: 'Estoque - Terceiros', check: p => p.grupo_de_tags_tags?.includes('Estoque - Terceiros') },
            demanda: { label: 'Sob Demanda - Fábrica', check: p => p.grupo_de_tags_tags?.includes('Sob Demanda - Fábrica') },
            servicos: { label: 'Serviços', check: p => p.codigo?.startsWith('7') },
            em_branco: { label: 'Grupo de Tags em Branco', check: p => !p.grupo_de_tags_tags || p.grupo_de_tags_tags.length === 0 || (p.grupo_de_tags_tags.length === 1 && p.grupo_de_tags_tags[0] === '') }
        };
        const counts = Object.keys(categories).reduce((acc, key) => { acc[key] = _allProducts.filter(categories[key].check).length; return acc; }, {});
        container.innerHTML = Object.keys(categories).map(key => {
            if (counts[key] === 0) return '';
            return `<label class="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer"><input type="checkbox" class="category-checkbox h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" value="${key}"><span class="flex-grow text-gray-700">${categories[key].label}</span><span class="text-gray-500 text-xs font-mono">(${counts[key]})</span></label>`;
        }).join('');
    }
    
    function _toggleProductSelection(productId, isChecked) {
        if (isChecked) {
            _selectedStockItems.add(productId);
        } else {
            _selectedStockItems.delete(productId);
        }
        _updateSelectedCountDisplay();
        _applyGlobalFilters();
    }
    
    function _clearSelection() {
        _selectedStockItems.clear();
        _updateSelectedCountDisplay();
        _applyGlobalFilters();
    }

    function _updateSelectedCountDisplay() {
        if (_dom.selectedItemsCountDisplay) {
            _dom.selectedItemsCountDisplay.textContent = `Itens selecionados: ${_selectedStockItems.size}`;
        }
        if (_dom.generateReportButton) {
            _dom.generateReportButton.disabled = _selectedStockItems.size === 0;
        }
        if (_dom.clearSelectionBtn) {
            _dom.clearSelectionBtn.classList.toggle('hidden', _selectedStockItems.size === 0);
        }
    }
    
    function _calculateAguardandoChegarMap() {
        const aguardandoMap = new Map();
        const allOrderItems = [
            ..._allOrdersTerceiros.flatMap(o => o.rawItems),
            ..._allOrdersFabrica.flatMap(o => o.rawItems)
        ];

        for (const item of allOrderItems) {
            if (item.situacao.toLowerCase() !== 'ok' && item.codigoService) {
                const currentQty = aguardandoMap.get(item.codigoService) || 0;
                const itemQty = parseInt(item.quantidadePedido, 10) || 0;
                aguardandoMap.set(item.codigoService, currentQty + itemQty);
            }
        }
        return aguardandoMap;
    }

    function _createRequisitionCard(id, title, count, color) {
        const isActive = id === _ordersTableState.selectedType ? 'active' : '';
        return `<div data-id="${id}" class="status-card ${color} text-white p-3 rounded-lg shadow-lg cursor-pointer transform transition-transform duration-300 hover:scale-105 ${isActive}">
                    <h3 class="text-sm font-semibold">${title}</h3>
                    <p class="text-2xl font-bold mt-2">${count}</p>
                </div>`;
    }

    function _renderRequisitionOverviewPage() {
        // ... (código mantido para brevidade)
    }

    function _renderOrderSortIcon(column) {
        if (_ordersTableState.sortColumn !== column) return '';
        return _ordersTableState.sortDirection === 'asc' ? '▲' : '▼';
    }

    function _renderConsolidatedOrdersTable() {
        // ... (código mantido para brevidade)
    }

    function _renderOrdersByItemView(orders) {
        // ... (código mantido para brevidade)
    }

    async function _handleItemStatusChange(orderCode, codigoService, requisitionType, checkboxElement) {
        // ... (código mantido para brevidade)
    }

    async function _handleLaunchRequisition(type) {
        // ... (código mantido para brevidade)
    }

    function _removeItemFromPrintPreview(index) {
        _itemsToPrint.splice(index, 1);
        _renderPrintPreviewTable();
    }

    function _openPrintPreviewModal(items, type) {
        _itemsToPrint = JSON.parse(JSON.stringify(items));
        _currentPrintModalType = type;
        const titles = {
            orders: 'Pré-visualização para Impressão de Pedidos',
            nfe: 'Pré-visualização para Impressão de Notas Fiscais',
            fabrica_solicitacao: 'Pré-visualização para Impressão de Solicitação Fábrica'
        };
        if (_dom.printModalTitle) _dom.printModalTitle.textContent = titles[type] || 'Pré-visualização';
        _renderPrintPreviewTable();
        if (_dom.printTableModal) _dom.printTableModal.classList.remove('hidden');
    }

    function _renderPrintPreviewTable() {
        // ... (código mantido para brevidade)
    }

    async function _confirmPrintPreview() {
        // ... (código mantido para brevidade)
    }
    
    function _printCurrentReportTable() {
        // ... (código mantido para brevidade)
    }

    function _bindEvents() {
        const debouncedApplyGlobalFilters = debounce(_applyGlobalFilters, 300);

        _dom.navLinks.pesquisar.addEventListener('click', () => _showPage('pesquisar'));
        _dom.navLinks.estoque.addEventListener('click', () => _showPage('estoque'));
        _dom.navLinks.conferenciaNFe.addEventListener('click', () => _showPage('conferencia-nfe'));
        _dom.navLinks.dashboards.addEventListener('click', () => _showPage('dashboards'));
        
        _dom.refreshButton.addEventListener('click', _fetchData);
        _dom.globalSearchInput.addEventListener('input', debouncedApplyGlobalFilters);
        _dom.globalCategoryCheckboxesContainer.addEventListener('change', _applyGlobalFilters);
        
        _dom.generateReportButton.addEventListener('click', () => {
            if(typeof _modules.GerenciarEstoque !== 'undefined') {
                _modules.GerenciarEstoque.generateReport(_allProducts, _selectedStockItems, _calculateAguardandoChegarMap());
            }
        });

        _dom.reportBackBtn.addEventListener('click', () => {
             if(typeof _modules.GerenciarEstoque !== 'undefined') _modules.GerenciarEstoque.backToStockView();
        }); 

        // ... (outros eventos globais)
    }

    function _cacheDomElements() {
        _dom = {
            pages: {
                pesquisar: document.getElementById('page-pesquisar-produto'),
                estoque: document.getElementById('page-gerenciar-estoque'),
                overviewRequisitions: document.getElementById('page-overview-requisitions'),
                report: document.getElementById('page-report'),
                conferenciaNFe: document.getElementById('page-conferencia-nfe'),
                dashboards: document.getElementById('page-dashboards')
            },
            navLinks: {
                pesquisar: document.getElementById('nav-pesquisar'),
                estoque: document.getElementById('nav-estoque'),
                conferenciaNFe: document.getElementById('nav-conferencia-nfe'),
                dashboards: document.getElementById('nav-dashboards')
            },
            loadingOverlay: document.getElementById('loading-overlay'),
            refreshButton: document.getElementById('refresh-button'),
            globalFilterBar: document.getElementById('global-filter-bar'),
            globalSearchInput: document.getElementById('global-search-input'),
            globalCategoryCheckboxesContainer: document.getElementById('global-category-checkboxes'),
            stockActionsContainer: document.getElementById('stock-actions'),
            selectedItemsCountDisplay: document.getElementById('selected-items-count'),
            clearSelectionBtn: document.getElementById('clear-selection-btn'),
            generateReportButton: document.getElementById('generate-report-button'),
            dashboardFilterBar: document.getElementById('dashboard-filter-bar'),
            nfeFilterBar: document.getElementById('nfe-filter-bar'),
            reportActionBar: document.getElementById('report-action-bar'),
            reportBackBtn: document.getElementById('report-back-btn'),
            requisitionActionBar: document.getElementById('requisition-action-bar'),
            messageModal: document.getElementById('message-modal'),
            messageModalTitle: document.getElementById('message-modal-title'),
            messageModalContent: document.getElementById('message-modal-content'),
            confirmationModal: document.getElementById('confirmation-modal'),
            confirmationModalTitle: document.getElementById('confirmation-modal-title'),
            confirmationModalContent: document.getElementById('confirmation-modal-content'),
            confirmYesBtn: document.getElementById('confirm-yes-btn'),
            confirmNoBtn: document.getElementById('confirm-no-btn'),
            customProductTooltip: document.createElement('div')
        };
        _dom.customProductTooltip.id = 'custom-product-tooltip';
        _dom.customProductTooltip.className = 'fixed hidden bg-white p-1 rounded-lg shadow-2xl border border-gray-200 z-[100]'; 
        document.body.appendChild(_dom.customProductTooltip);
    }

    function init(config) {
        _urls = config.urls;
        _modules = config.modules;
        _cacheDomElements();
        _bindEvents();
        _showPage('pesquisar');
        _fetchData().then(() => {
            _modules.PesquisarProduto.init({
                allProducts: _allProducts,
                domElements: {
                    product_list_container: document.getElementById('product-list-container'),
                    product_details_container: document.getElementById('product-details-container'),
                    details_placeholder: document.getElementById('details-placeholder'),
                    product_details: document.getElementById('product-details')
                },
                utilities: { createDetailItem: _modules.utils.createDetailItem, showImagePreview: _showImagePreview, hideImagePreview: _hideImagePreview }
            });
            _modules.Dashboards.init({
                allNFeData: _allNFeData,
                domElements: {
                    dashboardSummaryCards: document.getElementById('dashboard-summary-cards'),
                    salesChartCanvas: document.getElementById('sales-chart'),
                    salesTableContainer: document.getElementById('sales-table-container'),
                    dashboardStartDateInput: document.getElementById('dashboard-start-date'),
                    dashboardEndDateInput: document.getElementById('dashboard-end-date'),
                    dashboardClearFiltersBtn: document.getElementById('dashboard-clear-filters-btn')
                }
            });
            _modules.ConferenciaNFe.init({
                allNFeData: _allNFeData,
                domElements: {
                    nfeOverviewCardsContainer: document.getElementById('nfe-overview-cards'),
                    nfeDiagnosticTableContainer: document.getElementById('nfe-diagnostic-table-container'),
                    noNFeMessageOverview: document.getElementById('no-nfe-message-overview'),
                    nfeStartDateInput: document.getElementById('nfe-start-date'),
                    nfeEndDateInput: document.getElementById('nfe-end-date'),
                    nfeClearFiltersBtn: document.getElementById('nfe-clear-filters-btn')
                },
                utilities: { showMessageModal: _showMessageModal, showConfirmationModal: _showConfirmationModal, showLoading: () => _dom.loadingOverlay.classList.remove('hidden'), hideLoading: () => _dom.loadingOverlay.classList.add('hidden') },
                urls: { nfeConferenciaApi: _urls.NFE_CONFERENCIA_API_URL }
            });
            _modules.GerenciarEstoque.init({
                domElements: {
                    pageEstoque: _dom.pages.estoque,
                    pageReport: _dom.pages.report
                },
                utilities: { showImagePreview: _showImagePreview, hideImagePreview: _hideImagePreview, showMessageModal: _showMessageModal },
                callbacks: {
                    toggleProductSelection: _toggleProductSelection,
                    applyFilters: _applyGlobalFilters,
                    showPage: _showPage,
                    getFilteredProducts: () => _allProducts.filter(p => !p.codigo?.startsWith('7')),
                    getAguardandoMap: _calculateAguardandoChegarMap,
                    getSelectedItems: () => _selectedStockItems,
                    getAllProducts: () => _allProducts
                }
            });
        });
    }

    return {
        init
    };
})();
