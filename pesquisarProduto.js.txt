/**
 * Módulo PesquisarProdutoModule
 * * Este módulo é responsável por toda a funcionalidade da página "Pesquisar Produto".
 * Ele encapsula a lógica de renderização da lista de produtos e a exibição de seus detalhes.
 * * Padrão de Projeto: Revealing Module Pattern.
 */
const PesquisarProdutoModule = (function() {

    // --- VARIÁVEIS PRIVADAS ---
    // Armazena a referência para a lista completa de produtos passada na inicialização.
    let _allProducts = [];

    // Referências cacheadas para os elementos do DOM que este módulo controla.
    let _productListContainer;
    let _productDetailsContainer;
    let _detailsPlaceholder;
    let _productDetailsContent;

    // --- FUNÇÕES PRIVADAS ---

    /**
     * Cria o HTML para um item de detalhe (ex: Label: Valor).
     * @param {string} label - O rótulo do campo.
     * @param {string|number} value - O valor do campo.
     * @returns {string} - O HTML do item de detalhe.
     */
    function _createDetailItem(label, value) {
        if (!value && typeof value !== 'boolean' && value !== 0) return '';
        return `<div class="bg-gray-50 p-3 rounded-lg"><p class="text-sm font-medium text-gray-500">${label}</p><p class="text-lg text-gray-800">${value}</p></div>`;
    }

    /**
     * Exibe os detalhes de um produto específico na área de conteúdo.
     * @param {string} productId - O ID do produto a ser exibido.
     */
    function _displayProductDetails(productId) {
        // Encontra o produto na lista completa usando o ID.
        const product = _allProducts.find(p => p.id === productId);
        if (!product) return;

        // Esconde o placeholder e mostra a área de detalhes.
        if (_detailsPlaceholder) _detailsPlaceholder.classList.add('hidden');
        if (_productDetailsContent) _productDetailsContent.classList.remove('hidden');

        // Constrói o HTML com todos os detalhes do produto.
        let detailsHTML = `<h1 class="text-3xl font-bold text-gray-800 mb-2">${product.descricao}</h1><p class="text-md text-gray-500 mb-6">Código: ${product.codigo}</p>`;
        detailsHTML += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">';
        detailsHTML += _createDetailItem('Preço', (product.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        detailsHTML += _createDetailItem('Estoque', product.estoque || '0');
        detailsHTML += _createDetailItem('Situação', product.situacao ? '<span class="text-green-600 font-semibold">Ativo</span>' : '<span class="text-red-600 font-semibold">Inativo</span>');
        detailsHTML += _createDetailItem('Marca', product.marca);
        detailsHTML += _createDetailItem('Localização', product.localizacao);
        detailsHTML += '</div>';
        if (product.metricas && Object.values(product.metricas).some(v => v !== null)) {
            detailsHTML += '<h2 class="text-xl font-semibold border-b pb-2 mb-4">Métricas</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">';
            detailsHTML += _createDetailItem('Largura', product.metricas.largura);
            detailsHTML += _createDetailItem('Altura', product.metricas.altura);
            detailsHTML += _createDetailItem('Profundidade', product.metricas.profundidade);
            detailsHTML += _createDetailItem('Peso Bruto', product.metricas.peso_bruto);
            detailsHTML += _createDetailItem('Peso Líquido', product.metricas.peso_liquido);
            detailsHTML += '</div>';
        }
        if (product.url_imagens_externas && product.url_imagens_externas.length > 0 && product.url_imagens_externas[0]) {
            detailsHTML += '<h2 class="text-xl font-semibold border-b pb-2 mb-4">Imagens</h2><div class="flex flex-wrap gap-4 mb-6">';
            product.url_imagens_externas.forEach(url => { detailsHTML += `<img src="${url}" onerror="this.onerror=null;this.src='https://placehold.co/128x128/e0e0e0/555555?text=Sem+Imagem';" alt="Imagem do produto" class="w-32 h-32 object-cover rounded-lg border border-gray-200 shadow-sm">`; });
            detailsHTML += '</div>';
        }
        if (product.descricao_complementar) {
            detailsHTML += `<h2 class="text-xl font-semibold border-b pb-2 mb-4">Descrição Complementar</h2><div class="prose max-w-none bg-white p-4 rounded-lg border">${product.descricao_complementar}</div>`;
        }
        
        // Insere o HTML gerado no container de detalhes.
        if (_productDetailsContent) _productDetailsContent.innerHTML = detailsHTML;
    }

    // --- FUNÇÕES PÚBLICAS (REVELADAS) ---

    /**
     * Inicializa o módulo.
     * Cacheia os elementos do DOM e armazena os dados dos produtos.
     * @param {Array<Object>} productsData - O array completo de produtos vindo da API.
     */
    function init(productsData) {
        _allProducts = productsData;

        // Cacheia os elementos do DOM para evitar buscas repetidas.
        _productListContainer = document.getElementById('product-list-container');
        _productDetailsContainer = document.getElementById('product-details-container');
        _detailsPlaceholder = document.getElementById('details-placeholder');
        _productDetailsContent = document.getElementById('product-details');
    }

    /**
     * Renderiza a lista de produtos na barra lateral.
     * @param {Array<Object>} filteredProducts - Os produtos que passaram pelo filtro global.
     */
    function render(filteredProducts) {
        if (!_productListContainer) return;

        // Limpa a lista atual.
        _productListContainer.innerHTML = '';

        // Se não houver produtos, exibe uma mensagem.
        if (filteredProducts.length === 0) {
            _productListContainer.innerHTML = '<p class="text-center p-4 text-gray-500">Nenhum produto encontrado.</p>';
            return;
        }

        // Cria um item de lista para cada produto filtrado.
        filteredProducts.forEach(product => {
            const item = document.createElement('div');
            item.className = 'product-item p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors';
            item.dataset.productId = product.id;
            item.innerHTML = `<div class="text-xs text-gray-500">${product.codigo || 'Sem código'}</div><div class="font-medium text-gray-800">${product.descricao || 'Sem descrição'}</div>`;
            
            // Adiciona um evento de clique para exibir os detalhes do produto.
            item.addEventListener('click', () => {
                _displayProductDetails(product.id);
                // Gerencia a classe 'active' para destacar o item selecionado.
                document.querySelectorAll('.product-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
            });

            _productListContainer.appendChild(item);
        });
    }

    // "Revela" as funções públicas, tornando-as acessíveis de fora do módulo.
    return {
        init: init,
        render: render
    };
})();
