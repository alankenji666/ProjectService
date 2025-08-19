// conferenciaNFe.js

import { createNFeCard, formatCnpjCpf } from './utils.js';

export const ConferenciaNFe = (function() {
    // --- Variáveis de estado e configuração privadas ---
    let _allNFeData = [];
    let _dom = {};
    let _utils = {}; // Para funções como showMessageModal, etc.
    let _nfeTableState = {
        sortColumn: 'data_de_emissao',
        sortDirection: 'desc',
        currentStoreFilter: 'todos',
        conferenceStatusFilter: 'todos',
        isInitialView: true,
        filters: {
            startDate: null,
            endDate: null
        },
        currentDateFilterValue: 'all'
    };

    // --- Funções de utilidade do módulo ---
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

    function _renderNFeSortIcon(column) {
        if (_nfeTableState.sortColumn !== column) return '';
        return _nfeTableState.sortDirection === 'asc' ? '▲' : '▼';
    }

    // --- Funções de renderização ---
    async function _handleNFeConferenciaChange(event) {
        const selectElement = event.target;
        const nfeId = selectElement.dataset.nfeId;
        const newStatus = selectElement.value;
        const oldStatus = selectElement.dataset.currentStatus;

        if (newStatus === oldStatus) return;

        const confirmed = await _utils.showConfirmationModal(
            "Confirmar Alteração",
            `Deseja alterar o status da Nota Fiscal ID <b>${nfeId}</b> para '<b>${newStatus}</b>'?`
        );

        if (confirmed) {
            _utils.showLoading();
            try {
                const payload = { id_nota: nfeId, conferido: newStatus };
                const response = await fetch(_utils.urls.nfeConferenciaApi, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erro na rede (Status: ${response.status}): ${errorText}`);
                }

                const nfeToUpdate = _allNFeData.find(nfe => String(nfe.id_nota) === String(nfeId));
                if (nfeToUpdate) {
                    nfeToUpdate.conferido = newStatus;
                    selectElement.dataset.currentStatus = newStatus;
                }
                
                render(); // Re-renderiza a página para refletir a mudança
                
            } catch (error) {
                _utils.showMessageModal("Erro na Alteração", `Falha ao alterar status: ${error.message}.`);
                selectElement.value = oldStatus; // Reverte em caso de falha
            } finally {
                _utils.hideLoading();
            }
        } else {
            selectElement.value = oldStatus; // Reverte se o usuário cancelar
        }
    }

    function _renderNFeDiagnosticTable(storeFilter) {
        let filteredNFe = _allNFeData;
        const { startDate, endDate } = _nfeTableState.filters;

        if (startDate || endDate) {
            filteredNFe = filteredNFe.filter(nfe => {
                const nfeDate = _parsePtBrDate(nfe.data_de_emissao);
                if (!nfeDate) return false;
                const startMatch = startDate ? nfeDate >= startDate : true;
                const endMatch = endDate ? nfeDate <= endDate : true;
                return startMatch && endMatch;
            });
        }
        
        const storeMap = { 'bling': 'Bling', 'mercado_livre': 'Mercado Livre', 'loja_integrada': 'Loja Integrada' };
        const storeName = storeMap[storeFilter] || 'Todos os Canais';

        if (storeFilter !== 'todos') {
            filteredNFe = filteredNFe.filter(nfe => nfe.origem_loja === storeName);
        }
        
        if (_nfeTableState.conferenceStatusFilter === 'conferidas') {
            filteredNFe = filteredNFe.filter(nfe => nfe.conferido === 'Sim');
        } else if (_nfeTableState.conferenceStatusFilter === 'nao_conferidas') {
            filteredNFe = filteredNFe.filter(nfe => nfe.conferido !== 'Sim');
        }

        filteredNFe.sort((a, b) => {
            const sortKey = _nfeTableState.sortColumn;
            let valA = a[sortKey];
            let valB = b[sortKey];
            if (sortKey === 'data_de_emissao') {
                valA = _parsePtBrDate(valA) || new Date(0);
                valB = _parsePtBrDate(valB) || new Date(0);
            } else if (['valor_da_nota', 'valor_do_frete'].includes(sortKey)) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            }
            const comparison = valA > valB ? 1 : (valA < valB ? -1 : 0);
            return _nfeTableState.sortDirection === 'asc' ? comparison : -comparison;
        });

        const headers = [
            { label: 'CONFERIDO?', key: 'conferido' },
            { label: 'Nº DA NOTA', key: 'numero_da_nota' }, 
            { label: 'DATA DE EMISSÃO', key: 'data_de_emissao' },
            { label: 'CLIENTE', key: 'nome_do_cliente' },
            { label: 'VENDEDOR', key: 'nome_do_vendedor' },
            { label: 'VALOR', key: 'valor_da_nota' },
            { label: 'SITUAÇÃO', key: 'situacao' }
        ];

        let tableHtml = `
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
                <div class="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">Diagnóstico de Vendas: ${storeName}</h3>
                    <button id="close-diagnostic-table-btn" class="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                </div>
                <div id="nfe-diagnostic-table-content" class="overflow-auto max-h-[60vh]">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                ${headers.map(h => `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-sort="${h.key}">${h.label} ${_renderNFeSortIcon(h.key)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${filteredNFe.map(nfe => {
                                const nfeDate = _parsePtBrDate(nfe.data_de_emissao);
                                const isConferido = nfe.conferido === 'Sim';
                                return `
                                <tr class="${isConferido ? 'row-conferido' : 'row-nao-conferido'}">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <select class="nfe-conferido-select border border-gray-300 rounded-md p-1" data-nfe-id="${nfe.id_nota}" data-current-status="${isConferido ? 'Sim' : 'Não'}">
                                            <option value="Sim" ${isConferido ? 'selected' : ''}>Sim</option>
                                            <option value="Não" ${!isConferido ? 'selected' : ''}>Não</option>
                                        </select>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600"><a href="${nfe.link_danfe || '#'}" target="_blank" rel="noopener noreferrer">${nfe.numero_da_nota || 'N/A'}</a></td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${nfeDate ? nfeDate.toLocaleDateString('pt-BR') : 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${nfe.nome_do_cliente || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${nfe.nome_do_vendedor || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(parseFloat(nfe.valor_da_nota) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${nfe.situacao || 'N/A'}</td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        if (_dom.diagnosticTableContainer) {
            _dom.diagnosticTableContainer.innerHTML = tableHtml;
            _dom.diagnosticTableContainer.querySelector('#close-diagnostic-table-btn').addEventListener('click', () => {
                _dom.diagnosticTableContainer.innerHTML = '';
                _nfeTableState.isInitialView = true;
                _nfeTableState.currentStoreFilter = 'todos';
                _nfeTableState.conferenceStatusFilter = 'todos';
                render();
            });
            _dom.diagnosticTableContainer.querySelectorAll('.sortable-header').forEach(header => {
                header.addEventListener('click', () => {
                    const sortKey = header.dataset.sort;
                    if (_nfeTableState.sortColumn === sortKey) {
                        _nfeTableState.sortDirection = _nfeTableState.sortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        _nfeTableState.sortColumn = sortKey;
                        _nfeTableState.sortDirection = 'asc';
                    }
                    _renderNFeDiagnosticTable(storeFilter);
                });
            });
            _dom.diagnosticTableContainer.querySelectorAll('.nfe-conferido-select').forEach(select => {
                select.addEventListener('change', _handleNFeConferenciaChange);
            });
        }
    }

    function _applyNFeFilters() {
        if (!_dom.startDateInput || !_dom.endDateInput) return;
        const startDateValue = _dom.startDateInput.value;
        const endDateValue = _dom.endDateInput.value;
        _nfeTableState.filters.startDate = startDateValue ? new Date(startDateValue + 'T00:00:00') : null;
        _nfeTableState.filters.endDate = endDateValue ? new Date(endDateValue + 'T23:59:59') : null;
        render();
    }

    function _setDateRange(value) {
        const today = new Date();
        let startDate, endDate;
        const formatDate = (date) => date.toISOString().split('T')[0];
        const days = parseInt(value, 10);

        if (!isNaN(days)) {
            endDate = today;
            startDate = new Date();
            startDate.setDate(endDate.getDate() - days);
        } else {
            switch (value) {
                case 'all': startDate = null; endDate = null; break;
                case 'current_month': startDate = new Date(today.getFullYear(), today.getMonth(), 1); endDate = today; break;
                case 'last_month': startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1); endDate = new Date(today.getFullYear(), today.getMonth(), 0); break;
                case 'last_3_months': endDate = new Date(today.getFullYear(), today.getMonth(), 0); startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 2, 1); break;
                case 'last_6_months': endDate = new Date(today.getFullYear(), today.getMonth(), 0); startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1); break;
            }
        }
        
        _nfeTableState.currentDateFilterValue = value;
        _dom.startDateInput.value = startDate ? formatDate(startDate) : '';
        _dom.endDateInput.value = endDate ? formatDate(endDate) : '';
        
        _applyNFeFilters();
    }


    function _bindEvents() {
        _dom.startDateInput.addEventListener('change', () => {
            document.querySelectorAll('[name="nfe-date-range"]').forEach(radio => radio.checked = false);
            _nfeTableState.currentDateFilterValue = 'custom';
            _applyNFeFilters();
        });

        _dom.endDateInput.addEventListener('change', () => {
            document.querySelectorAll('[name="nfe-date-range"]').forEach(radio => radio.checked = false);
            _nfeTableState.currentDateFilterValue = 'custom';
            _applyNFeFilters();
        });

        document.querySelectorAll('[name="nfe-date-range"]').forEach(radio => {
            radio.addEventListener('change', (event) => {
                if (event.target.checked) {
                    _setDateRange(event.target.value);
                }
            });
        });

        _dom.clearFiltersBtn.addEventListener('click', () => {
            const defaultRadio = document.querySelector('[name="nfe-date-range"][value="all"]');
            if (defaultRadio) defaultRadio.checked = true;
            _setDateRange('all');
        });

        _dom.overviewCardsContainer.addEventListener('click', (event) => {
            const card = event.target.closest('[data-id]');
            if (!card) return;

            _nfeTableState.isInitialView = false;
            const cardId = card.dataset.id;

            if (cardId === 'conferidas' || cardId === 'nao_conferidas') {
                _nfeTableState.conferenceStatusFilter = cardId;
            } else if (cardId === 'total') {
                _nfeTableState.currentStoreFilter = 'todos';
                _nfeTableState.conferenceStatusFilter = 'todos';
            } else {
                _nfeTableState.currentStoreFilter = cardId;
                _nfeTableState.conferenceStatusFilter = 'todos';
            }
            
            render();
        });
    }

    // --- Funções Públicas ---
    function render() {
        let filteredNFeByDate = _allNFeData;
        const { startDate, endDate } = _nfeTableState.filters;

        if (startDate || endDate) {
            filteredNFeByDate = _allNFeData.filter(nfe => {
                const nfeDate = _parsePtBrDate(nfe.data_de_emissao);
                if (!nfeDate) return false;
                const startMatch = startDate ? nfeDate >= startDate : true;
                const endMatch = endDate ? nfeDate <= endDate : true;
                return startMatch && endMatch;
            });
        }

        if (!filteredNFeByDate || filteredNFeByDate.length === 0) {
            if (_dom.noNFeMessageOverview) _dom.noNFeMessageOverview.classList.remove('hidden');
            if (_dom.overviewCardsContainer) _dom.overviewCardsContainer.innerHTML = '';
            if (_dom.diagnosticTableContainer) _dom.diagnosticTableContainer.innerHTML = '';
            return;
        }
        
        if (_dom.noNFeMessageOverview) _dom.noNFeMessageOverview.classList.add('hidden');

        const stores = ['Bling', 'Mercado Livre', 'Loja Integrada'];
        const storeMap = { 'bling': 'Bling', 'mercado_livre': 'Mercado Livre', 'loja_integrada': 'Loja Integrada' };
        const currentStoreName = storeMap[_nfeTableState.currentStoreFilter] || null;

        const channelFilteredNFe = currentStoreName 
            ? filteredNFeByDate.filter(nfe => nfe.origem_loja === currentStoreName)
            : filteredNFeByDate;

        const storeData = stores.map(store => {
            const notes = filteredNFeByDate.filter(nfe => nfe.origem_loja === store);
            const total = notes.reduce((sum, nfe) => sum + (parseFloat(nfe.valor_da_nota) || 0), 0);
            return { name: store, count: notes.length, total: total };
        });

        const grandTotal = storeData.reduce((sum, store) => sum + store.total, 0);
        const grandTotalCount = storeData.reduce((sum, store) => sum + store.count, 0);
        
        const conferidas = channelFilteredNFe.filter(nfe => nfe.conferido === 'Sim');
        const naoConferidas = channelFilteredNFe.filter(nfe => nfe.conferido !== 'Sim');
        const totalConferidasValue = conferidas.reduce((sum, nfe) => sum + (parseFloat(nfe.valor_da_nota) || 0), 0);
        const totalNaoConferidasValue = naoConferidas.reduce((sum, nfe) => sum + (parseFloat(nfe.valor_da_nota) || 0), 0);

        const colors = { 'Bling': 'bg-green-500', 'Mercado Livre': 'bg-yellow-500', 'Loja Integrada': 'bg-red-500' };

        let cardsHtml = storeData.map(store => 
            createNFeCard(store.name.toLowerCase().replace(/ /g, '_'), store.name, store.count, store.total, colors[store.name])
        ).join('');
        
        cardsHtml += createNFeCard('conferidas', 'Total Conferidas', conferidas.length, totalConferidasValue, 'bg-teal-500', _nfeTableState.conferenceStatusFilter === 'conferidas');
        cardsHtml += createNFeCard('nao_conferidas', 'Total Não Conferidas', naoConferidas.length, totalNaoConferidasValue, 'bg-rose-500', _nfeTableState.conferenceStatusFilter === 'nao_conferidas');
        cardsHtml += createNFeCard('total', 'Total Geral', grandTotalCount, grandTotal, 'bg-gray-700', _nfeTableState.currentStoreFilter === 'todos');
        
        if (_dom.overviewCardsContainer) _dom.overviewCardsContainer.innerHTML = cardsHtml;
        
        if (!_nfeTableState.isInitialView) {
            _renderNFeDiagnosticTable(_nfeTableState.currentStoreFilter);
        } else {
             if (_dom.diagnosticTableContainer) _dom.diagnosticTableContainer.innerHTML = '';
        }
    }

    function init(config) {
        _allNFeData = config.allNFeData || [];
        _dom = {
            overviewCardsContainer: config.domElements.nfeOverviewCardsContainer,
            diagnosticTableContainer: config.domElements.nfeDiagnosticTableContainer,
            noNFeMessageOverview: config.domElements.noNFeMessageOverview,
            startDateInput: config.domElements.nfeStartDateInput,
            endDateInput: config.domElements.nfeEndDateInput,
            clearFiltersBtn: config.domElements.nfeClearFiltersBtn
        };
        _utils = {
            showMessageModal: config.utilities.showMessageModal,
            showConfirmationModal: config.utilities.showConfirmationModal,
            showLoading: config.utilities.showLoading,
            hideLoading: config.utilities.hideLoading,
            urls: {
                nfeConferenciaApi: config.urls.nfeConferenciaApi
            }
        };

        const defaultRadio = document.querySelector('[name="nfe-date-range"][value="all"]');
        if (defaultRadio) defaultRadio.checked = true;
        _setDateRange('all');

        _bindEvents();
        render();
    }

    return {
        init,
        render
    };
})();
