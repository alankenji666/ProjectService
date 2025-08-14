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
        },// pesquisarProduto.js
// Este módulo gerencia a lógica e a renderização da tela de pesquisa de produtos.

const PesquisarProduto = (function() {
    // --- Variáveis de estado e configuração ---
    let _allProducts = [];
    let _dom = {};
    let _utils = {};
    let _activeProductId = null;
    let _tooltipHideTimeout = null;

    /**
     * Renderiza os detalhes de um produto específico no painel direito.
     * @param {object} product - O objeto do produto a ser exibido.
     */
    function _renderProductDetails(product) {
        if (!_dom.product_details || !_utils.createDetailItem) return;

        _dom.product_details.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800 mb-2">${product.descricao}</h2>
            <p class="text-sm text-gray-500 mb-6">Código: ${product.codigo}</p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                ${_utils.createDetailItem('Preço', (product.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))}
                ${_utils.createDetailItem('Unidade', product.unidade || 'N/A')}
                ${_utils.createDetailItem('Estoque Atual', product.estoque, 'font-bold')}
                ${_utils.createDetailItem('Estoque Mínimo', product.estoque_minimo)}
                ${_utils.createDetailItem('Estoque Máximo', product.estoque_maximo)}
                ${_utils.createDetailItem('Localização', product.localizacao || 'N/A')}
                ${_utils.createDetailItem('Grupo de Tags', product.grupo_de_tags_tags?.join(', ') || 'N/A')}
                ${_utils.createDetailItem('Vendas (90d)', product.vendas_ultimos_90_dias || '0')}
            </div>
            
            <div class="mt-8">
                <h3 class="text-lg font-semibold text-gray-700 mb-4">Imagens do Produto</h3>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    ${(product.url_imagens_externas && product.url_imagens_externas.length > 0 && product.url_imagens_externas[0]) ? 
                        product.url_imagens_externas.map(url => `
                            <a href="${url}" target="_blank" rel="noopener noreferrer">
                                <img src="${url}" alt="Imagem do produto" class="w-full h-32 object-cover rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300" 
                                     onerror="this.onerror=null;this.src='https://placehold.co/150x150/e2e8f0/64748b?text=?';">
                            </a>
                        `).join('') :
                        '<p class="text-gray-500 col-span-full">Nenhuma imagem disponível.</p>'
                    }
                </div>
            </div>
        `;
        _dom.details_placeholder.classList.add('hidden');
        _dom.product_details.classList.remove('hidden');
    }

    /**
     * Limpa o painel de detalhes e mostra o placeholder.
     */
    function _clearDetails() {
        if (!_dom.product_details || !_dom.details_placeholder) return;
        _dom.product_details.classList.add('hidden');
        _dom.details_placeholder.classList.remove('hidden');
    }

    /**
     * Mostra uma pré-visualização ampliada da imagem, ajustando sua posição para caber na tela.
     * @param {MouseEvent} event - O evento do mouse (mouseover).
     */
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

    /**
     * Esconde a pré-visualização da imagem.
     */
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
    
    /**
     * Manipula o clique em um item da lista de produtos.
     * @param {MouseEvent} event - O evento de clique.
     */
    function _handleProductClick(event) {
        const productItem = event.target.closest('.product-item');
        if (!productItem) return;

        const productId = productItem.dataset.productId;
        _activeProductId = productId;

        document.querySelectorAll('.product-item').forEach(item => item.classList.remove('active'));
        productItem.classList.add('active');

        const product = _allProducts.find(p => String(p.id) === String(productId));
        if (product) {
            _renderProductDetails(product);
        }
    }

    // --- Funções Públicas ---
    
    /**
     * Renderiza a lista de produtos no painel esquerdo.
     * @param {Array<object>} products - A lista de produtos a ser renderizada.
     */
    function render(products) {
        if (!_dom.product_list_container) return;
        if (!products || products.length === 0) {
            _dom.product_list_container.innerHTML = `<div class="p-4 text-center text-gray-500">Nenhum produto encontrado.</div>`;
            _clearDetails();
            return;
        }

        let listHtml = products.map(product => {
            const imageUrl = product.url_imagens_externas && product.url_imagens_externas[0] 
                ? product.url_imagens_externas[0] 
                : 'https://placehold.co/50x50/e2e8f0/64748b?text=?';
            const isActive = String(product.id) === String(_activeProductId) ? 'active' : '';

            return `
                <div class="product-item flex items-center p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${isActive}" data-product-id="${product.id}">
                    <img src="${imageUrl}" 
                         alt="${product.descricao || 'Imagem do produto'}" 
                         class="product-list-item-img" 
                         data-image-url="${imageUrl}"
                         onerror="this.onerror=null;this.src='https://placehold.co/50x50/e2e8f0/64748b?text=?';">
                    <div class="flex-grow overflow-hidden">
                        <h3 class="font-semibold text-gray-800 text-sm truncate" title="${product.descricao || ''}">${product.descricao || 'Sem descrição'}</h3>
                        <p class="text-xs text-gray-500">${product.codigo || 'Sem código'}</p>
                    </div>
                </div>
            `;
        }).join('');
        _dom.product_list_container.innerHTML = listHtml;
    }

    /**
     * Inicializa o módulo, cacheando elementos do DOM e configurando listeners.
     * @param {object} config - Objeto de configuração.
     */
    function init(config) {
        _allProducts = config.allProducts;
        _dom = config.domElements;
        _utils = config.utilities;

        if (_dom.product_list_container) {
            _dom.product_list_container.addEventListener('click', _handleProductClick);

            _dom.product_list_container.addEventListener('mouseover', (event) => {
                if (event.target.classList.contains('product-list-item-img')) {
                    _showImagePreview(event);
                }
            });
            _dom.product_list_container.addEventListener('mouseout', (event) => {
                if (event.target.classList.contains('product-list-item-img')) {
                    _hideImagePreview();
                }
            });
        }
    }

    // Expõe as funções públicas
    return {
        init,
        render
    };
})();


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

