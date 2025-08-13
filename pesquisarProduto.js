// pesquisarProduto.js
// Este módulo gerencia a lógica e a renderização da tela de pesquisa de produtos.

const PesquisarProduto = (function() {
    // Variáveis de estado e referências a elementos DOM, que serão injetadas via `init`.
    let _allProducts = [];
    let _product_list_container;
    let _product_details_container;
    let _details_placeholder;
    let _product_details;
    let _createDetailItem; // Função utilitária injetada
    let _customProductTooltip; // Elemento DOM do tooltip, injetado
    let _tooltipHideTimeout = null; // Timeout para esconder o tooltip

    /**
     * Exibe a lista de produtos no container `_product_list_container`.
     * Cria os elementos de lista e anexa os event listeners para exibir os detalhes.
     * @param {Array<Object>} products Os produtos a serem exibidos.
     */
    function _displayProductList(products) {
        if (!_product_list_container) return; // Garante que o container existe

        _product_list_container.innerHTML = ''; // Limpa o conteúdo anterior

        if (products.length === 0) {
            _product_list_container.innerHTML = '<p class="text-center p-4 text-gray-500">Nenhum produto encontrado.</p>';
            return;
        }

        // Para cada produto, cria um item na lista
        products.forEach(product => {
            const item = document.createElement('div');
            item.className = 'product-item p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors';
            item.dataset.productId = product.id; // Armazena o ID do produto no dataset do elemento

            // Conteúdo HTML do item da lista
            item.innerHTML = `
                <div class="text-xs text-gray-500">${product.codigo || 'Sem código'}</div>
                <div class="font-medium text-gray-800">${product.descricao || 'Sem descrição'}</div>
            `;

            // Adiciona o event listener para exibir os detalhes do produto ao clicar
            item.addEventListener('click', () => {
                _displayProductDetails(product.id);
                // Remove a classe 'active' de todos os outros itens e adiciona ao item clicado
                document.querySelectorAll('.product-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
            });

            _product_list_container.appendChild(item); // Adiciona o item ao container da lista
        });
    }

    /**
     * Exibe os detalhes de um produto específico no container `_product_details`.
     * @param {string} productId O ID do produto.
     */
    function _displayProductDetails(productId) {
        const product = _allProducts.find(p => p.id === productId); // Encontra o produto pelo ID
        if (!product) return; // Se o produto não for encontrado, sai da função

        // Esconde o placeholder e mostra o container de detalhes
        if (_details_placeholder) _details_placeholder.classList.add('hidden');
        if (_product_details) _product_details.classList.remove('hidden');

        // Constrói o HTML dos detalhes do produto
        let detailsHTML = `
            <h1 class="text-3xl font-bold text-gray-800 mb-2">${product.descricao}</h1>
            <p class="text-md text-gray-500 mb-6">Código: ${product.codigo}</p>
        `;

        // Seções de detalhes gerais
        detailsHTML += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">';
        detailsHTML += _createDetailItem('Situação', product.situacao ? '<span class="text-green-600 font-semibold">Ativo</span>' : '<span class="text-red-600 font-semibold">Inativo</span>');
        detailsHTML += _createDetailItem('Marca', product.marca || 'Não informado');
        detailsHTML += _createDetailItem('Preço', (product.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        detailsHTML += _createDetailItem('Localização', product.localizacao || 'Não informado');
        detailsHTML += _createDetailItem('Estoque Atual', product.estoque ?? '0');
        detailsHTML += _createDetailItem('Aguardando Chegar', product.aguardandoChegar ?? '0');
        detailsHTML += _createDetailItem('Estoque Mín / Máx', `${product.estoque_minimo ?? 0} / ${product.estoque_maximo ?? 0}`);
        detailsHTML += _createDetailItem('Vendas (90 dias)', product.vendas_ultimos_90_dias ?? '0');
        detailsHTML += '</div>';

        // Seção de métricas (se existirem)
        if (product.metricas && Object.values(product.metricas).some(v => v !== null)) {
            detailsHTML += '<h2 class="text-xl font-semibold border-b pb-2 mb-4">Métricas</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">';
            detailsHTML += _createDetailItem('Largura', product.metricas.largura);
            detailsHTML += _createDetailItem('Altura', product.metricas.altura);
            detailsHTML += _createDetailItem('Profundidade', product.metricas.profundidade);
            detailsHTML += _createDetailItem('Peso Bruto', product.metricas.peso_bruto);
            detailsHTML += _createDetailItem('Peso Líquido', product.metricas.peso_liquido);
            detailsHTML += '</div>';
        }

        // Seção de imagens (se existirem)
        if (product.url_imagens_externas && product.url_imagens_externas.length > 0 && product.url_imagens_externas[0]) {
            detailsHTML += '<h2 class="text-xl font-semibold border-b pb-2 mb-4">Imagens</h2><div class="flex flex-wrap gap-4 mb-6">';
            product.url_imagens_externas.forEach(url => {
                detailsHTML += `<img src="${url}" onerror="this.onerror=null;this.src='https://placehold.co/128x128/e0e0e0/555555?text=Sem+Imagem';" alt="Imagem do produto" class="w-32 h-32 object-cover rounded-lg border border-gray-200 shadow-sm">`;
            });
            detailsHTML += '</div>';
        }

        // Seção de descrição complementar (se existir)
        if (product.descricao_complementar) {
            detailsHTML += `<h2 class="text-xl font-semibold border-b pb-2 mb-4">Descrição Complementar</h2><div class="prose max-w-none bg-white p-4 rounded-lg border">${product.descricao_complementar}</div>`;
        }

        // Insere o HTML gerado no container de detalhes
        if (_product_details) _product_details.innerHTML = detailsHTML;
    }

    /**
     * Exibe o tooltip personalizado do produto.
     * @param {Event} event O evento de mouseenter.
     */
    function _showProductTooltip(event) {
        clearTimeout(_tooltipHideTimeout); // Limpa qualquer timeout anterior para esconder o tooltip
        const cell = event.currentTarget;
        const fullDescription = cell.dataset.fullDescription;
        const imageUrl = cell.dataset.imageUrl;

        let tooltipContent = `<p class="text-sm text-gray-800 mb-2">${fullDescription}</p>`;

        // Adiciona a imagem ao tooltip se a URL for válida
        if (imageUrl && imageUrl !== 'N/A') {
            tooltipContent += `<img src="${imageUrl}" onerror="this.onerror=null;this.src='https://placehold.co/128x128/e0e0e0/555555?text=Sem+Imagem';" alt="Imagem do Produto" class="w-32 h-32 object-cover rounded-md mx-auto mt-2">`;
        } else {
            // Imagem placeholder se não houver URL
            tooltipContent += `<img src="https://placehold.co/128x128/e0e0e0/555555?text=Sem+Imagem" alt="Sem Imagem" class="w-32 h-32 object-cover rounded-md mx-auto mt-2">`;
        }

        if (_customProductTooltip) {
            _customProductTooltip.innerHTML = tooltipContent; // Define o conteúdo do tooltip

            _customProductTooltip.classList.remove('hidden'); // Torna o tooltip visível
            _customProductTooltip.style.opacity = '0'; // Define opacidade inicial para transição

            const offsetX = 15; // Deslocamento horizontal
            const offsetY = 15; // Deslocamento vertical

            let top = event.pageY + offsetY;
            let left = event.pageX + offsetX;

            // Ajusta a posição do tooltip se ele sair da tela
            if (left + _customProductTooltip.offsetWidth > window.innerWidth + window.scrollX) {
                left = event.pageX - _customProductTooltip.offsetWidth - offsetX;
            }
            if (top + _customProductTooltip.offsetHeight > window.innerHeight + window.scrollY) {
                top = event.pageY - _customProductTooltip.offsetHeight - offsetY;
            }

            _customProductTooltip.style.top = `${top}px`;
            _customProductTooltip.style.left = `${left}px`;

            // Inicia a transição de opacidade
            setTimeout(() => { _customProductTooltip.style.opacity = '1'; }, 10);
        }
    }

    /**
     * Esconde o tooltip personalizado do produto.
     * @param {Event} event O evento de mouseleave (pode ser nulo se 'immediate' for true).
     * @param {HTMLElement} cell O elemento da célula do produto (pode ser nulo se 'immediate' for true).
     * @param {boolean} immediate Se verdadeiro, esconde imediatamente sem delay.
     */
    function _hideProductTooltip(event, cell, immediate = false) {
        if (!_customProductTooltip) return;

        if (immediate) {
            _customProductTooltip.style.opacity = '0';
            setTimeout(() => { _customProductTooltip.classList.add('hidden'); }, 200); // Esconde após a transição
            return;
        }

        // Define um timeout para esconder o tooltip, permitindo que o mouse entre no tooltip
        _tooltipHideTimeout = setTimeout(() => {
            _customProductTooltip.style.opacity = '0';
            setTimeout(() => { _customProductTooltip.classList.add('hidden'); }, 200);
        }, 100);
    }

    // Interface pública do módulo
    return {
        /**
         * Inicializa o módulo PesquisarProduto com as dependências necessárias.
         * @param {Object} dependencies Objeto contendo:
         * - allProducts: Array de todos os produtos.
         * - domElements: Objeto com referências aos elementos DOM específicos da página.
         * - utilities: Objeto com funções utilitárias (ex: createDetailItem).
         */
        init: function(dependencies) {
            _allProducts = dependencies.allProducts;
            _product_list_container = dependencies.domElements.product_list_container;
            _product_details_container = dependencies.domElements.product_details_container;
            _details_placeholder = dependencies.domElements.details_placeholder;
            _product_details = dependencies.domElements.product_details;
            _createDetailItem = dependencies.utilities.createDetailItem;
            _customProductTooltip = dependencies.domElements.customProductTooltip;

            // Adiciona event listeners para o tooltip em si, para que ele não suma se o mouse entrar nele
            if (_customProductTooltip) {
                _customProductTooltip.addEventListener('mouseenter', () => {
                    clearTimeout(_tooltipHideTimeout); // Cancela o timeout de esconder
                    _customProductTooltip.style.opacity = '1';
                    _customProductTooltip.classList.remove('hidden');
                });

                _customProductTooltip.addEventListener('mouseleave', () => {
                    _hideProductTooltip(null, null, true); // Esconde imediatamente ao sair do tooltip
                });
            }
        },

        /**
         * Renderiza a tela de pesquisa de produtos com os produtos filtrados.
         * @param {Array<Object>} filteredProducts Os produtos a serem exibidos.
         */
        render: function(filteredProducts) {
            _displayProductList(filteredProducts);
            // Garante que a seção de detalhes esteja no estado inicial (placeholder visível)
            if (_details_placeholder) _details_placeholder.classList.remove('hidden');
            if (_product_details) _product_details.classList.add('hidden');
        },

        // Exporta as funções de tooltip para serem usadas por outros módulos (ex: Relatório)
        showProductTooltip: _showProductTooltip,
        hideProductTooltip: _hideProductTooltip
    };
})();
