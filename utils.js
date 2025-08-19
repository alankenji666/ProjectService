// utils.js

/**
 * Implementa a técnica de debounce para otimizar o desempenho de funções que são chamadas repetidamente.
 * @param {Function} func A função a ser "debouced".
 * @param {number} delay O tempo de atraso em milissegundos.
 * @returns {Function} A função debounced.
 */
export function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

/**
 * Verifica se uma data é um fim de semana (sábado ou domingo).
 * @param {Date} date Objeto Date.
 * @returns {boolean} True se for fim de semana, false caso contrário.
 */
export function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
}

/**
 * Adiciona um número de dias úteis a uma data.
 * @param {Date} startDate A data inicial.
 * @param {number} days O número de dias úteis a adicionar.
 * @returns {Date} A nova data após adicionar os dias úteis.
 */
export function addBusinessDays(startDate, days) {
    const date = new Date(startDate.getTime()); 
    let addedDays = 0;
    while (addedDays < days) {
        date.setDate(date.getDate() + 1); 
        if (!isWeekend(date)) { // Usa a função isWeekend exportada
            addedDays++; 
        }
    }
    return date;
}

/**
 * Calcula a diferença em dias úteis entre duas datas.
 * Retorna um número positivo se endDate for depois de startDate, negativo se antes.
 * @param {Date} startDate A data de início.
 * @param {Date} endDate A data de fim.
 * @returns {number} A diferença em dias úteis.
 */
export function getBusinessDaysDifference(startDate, endDate) {
    let count = 0;
    const current = new Date(startDate.getTime());
    const end = new Date(endDate.getTime());

    current.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (current > end) {
        return -getBusinessDaysDifference(endDate, startDate); // Usa a função getBusinessDaysDifference recursivamente
    }

    if (current.getTime() === end.getTime()) {
        return 0;
    }

    while (current < end) { 
        if (!isWeekend(current)) { // Usa a função isWeekend exportada
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
}

/**
 * Formata um número de CNPJ/CPF.
 * @param {number|string} value O número do CNPJ/CPF.
 * @returns {string} O CNPJ/CPF formatado.
 */
export function formatCnpjCpf(value) {
    if (!value) return 'N/A';
    const cleanedValue = String(value).replace(/\D/g, ''); 

    if (cleanedValue.length === 11) { 
        return cleanedValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cleanedValue.length === 14) { 
        return cleanedValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value; 
}

/**
 * Cria um item de detalhe para exibição.
 * @param {string} label O rótulo do detalhe.
 * @param {string|number} value O valor do detalhe.
 * @returns {string} O HTML do item de detalhe.
 */
export function createDetailItem(label, value) {
    if (!value && typeof value !== 'boolean' && value !== 0) return '';
    return `<div class="bg-gray-50 p-3 rounded-lg"><p class="text-sm font-medium text-gray-500">${label}</p><p class="text-lg text-gray-800">${value}</p></div>`;
}

/**
 * Cria uma pílula de status para exibição.
 * @param {string} status O status (ok, baixo, excesso, indefinido).
 * @returns {string} O HTML da pílula de status.
 */
export function createStatusPill(status) {
    const styles = { ok: 'bg-green-100 text-green-800', baixo: 'bg-yellow-100 text-yellow-800', excesso: 'bg-red-100 text-red-800', indefinido: 'bg-gray-100 text-gray-800' };
    const text = { ok: 'OK', baixo: 'Baixo', excesso: 'Excesso', indefinido: 'N/A' };
    return `<span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}">${text[status]}</span>`;
}

/**
 * NOVO: Cria um card de resumo para as telas de NFe e Dashboard.
 * @param {string} id - O identificador para o card (usado em data-id).
 * @param {string} title - O título do card.
 * @param {number} count - A contagem de notas.
 * @param {number} totalValue - O valor monetário total.
 * @param {string} color - A classe de cor de fundo do Tailwind CSS (ex: 'bg-green-500').
 * @param {boolean} [isActive=false] - Se o card deve ter o estilo de 'ativo'.
 * @returns {string} O HTML do card.
 */
export function createNFeCard(id, title, count, totalValue, color, isActive = false) {
    const valueFormatted = (totalValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const activeClass = isActive ? 'active ring-4 ring-offset-2 ring-blue-400' : '';
    return `<div data-id="${id}" class="${color} text-white p-4 rounded-lg shadow-lg flex flex-col justify-between ${activeClass}">
                <div>
                    <h3 class="text-md font-semibold">${title}</h3>
                    <p class="text-sm">Total de Notas: ${count}</p>
                </div>
                <p class="text-2xl font-bold mt-2 self-end">${valueFormatted}</p>
            </div>`;
}
