// dashboards.js

// Importa as funções de utilidade necessárias.
// O caminho pode precisar de ajuste dependendo da estrutura final do seu projeto no GitHub.
import { createNFeCard } from './utils.js'; 

export const Dashboards = (function() {
    // --- Variáveis de estado e configuração privadas do módulo ---
    let _allNFeData = [];
    let _dom = {};
    let _salesChartInstance = null;
    let _dashboardState = {
        selectedChannel: 'total',
        currentDateFilterValue: 'all'
    };

    // --- Funções de utilidade privadas do módulo ---

    /**
     * Converte uma string de data no formato dd/mm/yyyy para um objeto Date.
     * @param {string} dateString A data no formato "dd/mm/yyyy".
     * @returns {Date|null} O objeto Date ou null se o formato for inválido.
     */
    function _parsePtBrDate(dateString) {
        if (!dateString || typeof dateString !== 'string') return null;
        const parts = dateString.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Mês é base 0 em JS
            const year = parseInt(parts[2], 10);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                const fullYear = year < 100 ? 2000 + year : year;
                return new Date(fullYear, month, day);
            }
        }
        return null;
    }

    /**
     * Renderiza a tabela de vendas mensais detalhadas.
     * @param {Array<string>} sortedMonths - Array de meses/anos ordenados (ex: "2023-01").
     * @param {object} salesData - Objeto com os dados de vendas agregados por mês.
     * @param {string} selectedChannel - O canal de venda atualmente selecionado.
     */
    function _renderSalesTable(sortedMonths, salesData, selectedChannel) {
        if (!_dom.salesTableContainer) return;

        const channelMap = {
            'bling': 'Bling',
            'mercado_livre': 'Mercado Livre',
            'loja_integrada': 'Loja Integrada'
        };
        const selectedChannelName = channelMap[selectedChannel];
        const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        let tableHtml = `
            <div class="bg-white p-4 rounded-lg shadow-md">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Vendas Mensais Detalhadas</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mês/Ano</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider ${selectedChannelName === 'Bling' ? 'bg-green-100' : ''}">Bling</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider ${selectedChannelName === 'Mercado Livre' ? 'bg-yellow-100' : ''}">Mercado Livre</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider ${selectedChannelName === 'Loja Integrada' ? 'bg-red-100' : ''}">Loja Integrada</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Mês</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
        `;

        let totalBling = 0, totalML = 0, totalLI = 0, grandTotal = 0;

        if (sortedMonths.length === 0) {
            tableHtml += `<tr><td colspan="5" class="text-center py-4 text-gray-500">Nenhum dado de venda para o período.</td></tr>`;
        } else {
            sortedMonths.forEach(monthKey => {
                const monthData = salesData[monthKey];
                const monthTotal = (monthData['Bling'] || 0) + (monthData['Mercado Livre'] || 0) + (monthData['Loja Integrada'] || 0);
                totalBling += (monthData['Bling'] || 0);
                totalML += (monthData['Mercado Livre'] || 0);
                totalLI += (monthData['Loja Integrada'] || 0);
                grandTotal += monthTotal;
                const [year, month] = monthKey.split('-');
                const monthLabel = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
                tableHtml += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right ${selectedChannelName === 'Bling' ? 'bg-green-50 font-bold' : ''}">${formatCurrency(monthData['Bling'])}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right ${selectedChannelName === 'Mercado Livre' ? 'bg-yellow-50 font-bold' : ''}">${formatCurrency(monthData['Mercado Livre'])}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right ${selectedChannelName === 'Loja Integrada' ? 'bg-red-50 font-bold' : ''}">${formatCurrency(monthData['Loja Integrada'])}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold text-right">${formatCurrency(monthTotal)}</td>
                    </tr>
                `;
            });
        }

        tableHtml += `
                        </tbody>
                        <tfoot class="bg-gray-100">
                            <tr>
                                <th class="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase">Total Período</th>
                                <th class="px-6 py-3 text-right text-sm font-bold text-gray-700 ${selectedChannelName === 'Bling' ? 'bg-green-100' : ''}">${formatCurrency(totalBling)}</th>
                                <th class="px-6 py-3 text-right text-sm font-bold text-gray-700 ${selectedChannelName === 'Mercado Livre' ? 'bg-yellow-100' : ''}">${formatCurrency(totalML)}</th>
                                <th class="px-6 py-3 text-right text-sm font-bold text-gray-700 ${selectedChannelName === 'Loja Integrada' ? 'bg-red-100' : ''}">${formatCurrency(totalLI)}</th>
                                <th class="px-6 py-3 text-right text-sm font-extrabold text-gray-900">${formatCurrency(grandTotal)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
        _dom.salesTableContainer.innerHTML = tableHtml;
    }

    /**
     * Atualiza o gráfico de vendas com base nos filtros e no canal selecionado.
     * @param {string} selectedChannel - O canal de vendas a ser destacado ou 'total' para todos.
     */
    function _updateDashboardChart(selectedChannel) {
        _dashboardState.selectedChannel = selectedChannel;

        if (!_dom.salesChartCanvas || !_allNFeData) return;

        const startDate = _dom.startDateInput.value ? new Date(_dom.startDateInput.value + 'T00:00:00') : null;
        const endDate = _dom.endDateInput.value ? new Date(_dom.endDateInput.value + 'T23:59:59') : null;

        let filteredNFe = _allNFeData.filter(nfe => {
            const nfeDate = _parsePtBrDate(nfe.data_de_emissao);
            if (!nfeDate) return false;
            const startMatch = startDate ? nfeDate >= startDate : true;
            const endMatch = endDate ? nfeDate <= endDate : true;
            return startMatch && endMatch;
        });

        const aggregationLevel = (_dashboardState.currentDateFilterValue === 'current_month' || _dashboardState.currentDateFilterValue === '30') ? 'day' : 'month';
        
        let salesData = {};
        let chartLabels = [];
        let sortedKeys = [];

        const salesByMonthForTable = {};
        filteredNFe.forEach(nfe => {
            const date = _parsePtBrDate(nfe.data_de_emissao);
            if (!date) return;
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const store = nfe.origem_loja;
            const value = parseFloat(nfe.valor_da_nota) || 0;
            if (!salesByMonthForTable[monthKey]) salesByMonthForTable[monthKey] = { 'Bling': 0, 'Mercado Livre': 0, 'Loja Integrada': 0 };
            if (salesByMonthForTable[monthKey][store] !== undefined) salesByMonthForTable[monthKey][store] += value;
        });
        const sortedMonthsForTable = Object.keys(salesByMonthForTable).sort();

        if (aggregationLevel === 'day') {
            filteredNFe.forEach(nfe => {
                const date = _parsePtBrDate(nfe.data_de_emissao);
                if (!date) return;
                const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const store = nfe.origem_loja;
                const value = parseFloat(nfe.valor_da_nota) || 0;
                if (!salesData[dayKey]) salesData[dayKey] = { 'Bling': 0, 'Mercado Livre': 0, 'Loja Integrada': 0 };
                if (salesData[dayKey][store] !== undefined) salesData[dayKey][store] += value;
            });
            sortedKeys = Object.keys(salesData).sort();
            chartLabels = sortedKeys.map(key => {
                const [year, month, day] = key.split('-');
                return `${day}/${month}`;
            });
        } else {
            salesData = salesByMonthForTable;
            sortedKeys = sortedMonthsForTable;
            chartLabels = sortedKeys.map(key => {
                const [year, month] = key.split('-');
                return new Date(year, month - 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
            });
        }

        const aggregatedData = sortedKeys.map(key => salesData[key]);
        
        const allDatasets = [
            { label: 'Bling', data: aggregatedData.map(d => d['Bling']), borderColor: 'rgba(34, 197, 94, 1)', backgroundColor: 'rgba(34, 197, 94, 0.2)', fill: true, tension: 0.1, channel: 'bling' },
            { label: 'Mercado Livre', data: aggregatedData.map(d => d['Mercado Livre']), borderColor: 'rgba(234, 179, 8, 1)', backgroundColor: 'rgba(234, 179, 8, 0.2)', fill: true, tension: 0.1, channel: 'mercado_livre' },
            { label: 'Loja Integrada', data: aggregatedData.map(d => d['Loja Integrada']), borderColor: 'rgba(239, 68, 68, 1)', backgroundColor: 'rgba(239, 68, 68, 0.2)', fill: true, tension: 0.1, channel: 'loja_integrada' }
        ];

        const chartDatasets = allDatasets.map(ds => {
            ds.hidden = selectedChannel !== 'total' && ds.channel !== selectedChannel;
            return ds;
        });

        if (_salesChartInstance) _salesChartInstance.destroy();
        
        const ctx = _dom.salesChartCanvas.getContext('2d');
        _salesChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: chartLabels, datasets: chartDatasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top' }, title: { display: true, text: 'Evolução de Vendas por Canal' } },
                scales: { y: { beginAtZero: true, ticks: { callback: (value) => 'R$ ' + value.toLocaleString('pt-BR') } } }
            }
        });

        _renderSalesTable(sortedMonthsForTable, salesByMonthForTable, selectedChannel);
    }

    /**
     * Define o intervalo de datas com base em um valor predefinido ou dias.
     * @param {string} value - O valor do filtro ('all', 'current_month', '30', etc.).
     */
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
        
        _dashboardState.currentDateFilterValue = value;
        _dom.startDateInput.value = startDate ? formatDate(startDate) : '';
        _dom.endDateInput.value = endDate ? formatDate(endDate) : '';
        
        render(); // Re-renderiza a página do dashboard com as novas datas
    }

    /**
     * Vincula todos os eventos de DOM necessários para a página de dashboards.
     */
    function _bindEvents() {
        const dateInputs = [_dom.startDateInput, _dom.endDateInput];
        dateInputs.forEach(input => {
            if (input) {
                input.addEventListener('change', () => {
                    document.querySelectorAll('[name="date-range"]').forEach(radio => radio.checked = false);
                    _dashboardState.currentDateFilterValue = 'custom';
                    render();
                });
            }
        });

        document.querySelectorAll('[name="date-range"]').forEach(radio => {
            radio.addEventListener('change', (event) => {
                if (event.target.checked) {
                    _setDateRange(event.target.value);
                }
            });
        });

        if (_dom.clearFiltersBtn) {
            _dom.clearFiltersBtn.addEventListener('click', () => {
                const defaultRadio = document.querySelector('[name="date-range"][value="all"]');
                if (defaultRadio) defaultRadio.checked = true;
                _setDateRange('all');
            });
        }

        if (_dom.summaryCards) {
            _dom.summaryCards.addEventListener('click', (event) => {
                const card = event.target.closest('[data-id]');
                if (card) {
                    _updateDashboardChart(card.dataset.id);
                }
            });
        }
    }

    // --- Funções Públicas do Módulo ---

    /**
     * Renderiza a página de dashboards, incluindo cards de resumo e o gráfico.
     */
    function render() {
        if (!_dom.salesChartCanvas) return;

        const startDate = _dom.startDateInput.value ? new Date(_dom.startDateInput.value + 'T00:00:00') : null;
        const endDate = _dom.endDateInput.value ? new Date(_dom.endDateInput.value + 'T23:59:59') : null;

        let filteredNFe = _allNFeData.filter(nfe => {
            const nfeDate = _parsePtBrDate(nfe.data_de_emissao);
            if (!nfeDate) return false;
            const startMatch = startDate ? nfeDate >= startDate : true;
            const endMatch = endDate ? nfeDate <= endDate : true;
            return startMatch && endMatch;
        });

        const stores = ['Bling', 'Mercado Livre', 'Loja Integrada'];
        const storeData = stores.map(store => {
            const notes = filteredNFe.filter(nfe => nfe.origem_loja === store);
            const total = notes.reduce((sum, nfe) => sum + (parseFloat(nfe.valor_da_nota) || 0), 0);
            return { name: store, count: notes.length, total: total };
        });

        const grandTotal = storeData.reduce((sum, store) => sum + store.total, 0);
        const grandTotalCount = storeData.reduce((sum, store) => sum + store.count, 0);
        const colors = { 'Bling': 'bg-green-500', 'Mercado Livre': 'bg-yellow-500', 'Loja Integrada': 'bg-red-500' };

        // A função createNFeCard é importada de utils.js
        let cardsHtml = storeData.map(store =>
            createNFeCard(store.name.toLowerCase().replace(/ /g, '_'), store.name, store.count, store.total, colors[store.name])
        ).join('');
        cardsHtml += createNFeCard('total', 'Total Geral', grandTotalCount, grandTotal, 'bg-gray-700');

        if (_dom.summaryCards) _dom.summaryCards.innerHTML = cardsHtml;

        _updateDashboardChart(_dashboardState.selectedChannel);
    }

    /**
     * Inicializa o módulo Dashboards.
     * @param {object} config - Objeto de configuração com dados, elementos do DOM e utilitários.
     */
    function init(config) {
        _allNFeData = config.allNFeData || [];
        _dom = {
            summaryCards: config.domElements.dashboardSummaryCards,
            salesChartCanvas: config.domElements.salesChartCanvas,
            salesTableContainer: config.domElements.salesTableContainer,
            startDateInput: config.domElements.dashboardStartDateInput,
            endDateInput: config.domElements.dashboardEndDateInput,
            clearFiltersBtn: config.domElements.dashboardClearFiltersBtn
        };

        // Define a data padrão inicial
        const defaultRadio = document.querySelector('[name="date-range"][value="all"]');
        if (defaultRadio) defaultRadio.checked = true;
        _setDateRange('all');
        
        _bindEvents();
        render(); // Renderiza pela primeira vez
    }

    // Expõe as funções públicas que o App principal precisa chamar
    return {
        init,
        render
    };
})();
