const PesquisarProduto = (function() {
    // --- Variáveis de estado e configuração ---
    let _allProducts = [];
    let _dom = {};
    let _utils = {};
    let _activeProductId = null;

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
                    ${(product.url_imagens_externas && product.url_imagens_externas.length > 0) ? 
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
     * Manipula o clique em um item da lista de produtos.
     * @param {MouseEvent} event - O evento de clique.
     */
    function _handleProductClick(event) {
        const productItem = event.target.closest('.product-item');
        if (!productItem) return;

        const productId = productItem.dataset.productId;
        _activeProductId = productId;

        // Remove a classe 'active' de todos os itens e a adiciona ao item clicado
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
            // Listener para cliques nos itens da lista
            _dom.product_list_container.addEventListener('click', _handleProductClick);

            // Listener para pré-visualização de imagem (usando delegação de eventos)
            _dom.product_list_container.addEventListener('mouseover', (event) => {
                if (event.target.classList.contains('product-list-item-img')) {
                    _utils.showImagePreview(event);
                }
            });
            _dom.product_list_container.addEventListener('mouseout', (event) => {
                if (event.target.classList.contains('product-list-item-img')) {
                    _utils.hideImagePreview();
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
