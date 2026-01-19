import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, ProductCategory } from '../types';
import { ImageCropper } from './shared/ImageCropper';

const PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: '1', name: 'Cabelo' },
  { id: '2', name: 'Barba' },
  { id: '3', name: 'Acessórios' },
  { id: '4', name: 'Pós-Barba' },
];
import {
  Plus,
  Trash2,
  Search,
  Sparkles,
  Filter,
  ChevronDown,
  Check,
  Image as ImageIcon,
  X,
  FolderPlus,
  Pencil,
  AlertTriangle,
} from 'lucide-react';

interface MarketplaceViewProps {
  user: User;
}

const MarketplaceView: React.FC<MarketplaceViewProps> = ({ user }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [priceDisplay, setPriceDisplay] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Currency Helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const parseCurrency = (value: string) => {
    return Number(value.replace(/\D/g, '')) / 100;
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeCategoryName =
    activeCategory === 'all'
      ? 'Todos os Produtos'
      : categories.find((c) => c.id === activeCategory)?.name ||
        'Todos os Produtos';

  const fetchProducts = async () => {
    const { getProducts } =
      await import('../actions/marketplace/marketplace.actions');
    const res = await getProducts();
    if (res.success) {
      setProducts(res.products || []);
    }
  };

  const fetchCategories = async () => {
    const { getCategories } =
      await import('../actions/marketplace/marketplace.actions');
    const res = await getCategories();
    if (res.success) {
      setCategories(res.categories || []);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleDeleteProduct = (id: string) => {
    setProductToDelete(id);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      const { deleteProduct } =
        await import('../actions/marketplace/marketplace.actions');
      const res = await deleteProduct(productToDelete);
      if (res.success) {
        fetchProducts();
        setProductToDelete(null);
      } else {
        alert('Erro ao excluir produto');
      }
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setSelectedImage(product.image);
    setPriceDisplay(formatCurrency(product.price));
    setIsAddingProduct(true);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to JPEG 70% quality
        };
      };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setSelectedImage(croppedImage);
    setImageToCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Fallback image if none selected
    const imageToSave =
      selectedImage ||
      'https://images.unsplash.com/photo-1585751119414-ef2636f8aede?q=80&w=400&h=400&auto=format&fit=crop';

    const productData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseCurrency(priceDisplay),
      category: formData.get('category') as string,
      stock: Number(formData.get('stock')),
      image: imageToSave,
    };

    let res;
    if (editingProduct) {
      const { updateProduct } =
        await import('../actions/marketplace/marketplace.actions');
      res = await updateProduct(editingProduct.id, productData);
    } else {
      const { createProduct } =
        await import('../actions/marketplace/marketplace.actions');
      res = await createProduct(productData);
    }

    if (res.success) {
      fetchProducts();
      setIsAddingProduct(false);
      setSelectedImage(null);
      setEditingProduct(null);
      setPriceDisplay('');
    } else {
      alert('Erro ao salvar produto');
    }
  };

  const handleBuyProduct = async (product: any) => {
    if (product.stock <= 0) {
      alert('Produto esgotado!');
      return;
    }

    setIsPurchasing(true);
    try {
      const { createMarketplaceCheckout } =
        await import('../actions/payment/infinitepay.actions');
      const res = await createMarketplaceCheckout({
        productId: product.id,
        productName: product.name,
        price: product.price,
        userId: user.id,
        customer: {
          name: user.name,
          email: user.email || '',
          phone: user.whatsapp || '',
        },
      });

      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        alert(res.message || 'Erro ao processar compra');
      }
    } catch (error) {
      console.error('Purchase Error:', error);
      alert('Erro ao iniciar processo de pagamento');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('catName') as string;
    if (name) {
      const { createCategory } =
        await import('../actions/marketplace/marketplace.actions');
      const res = await createCategory(name);
      if (res.success) {
        fetchCategories();
        setIsAddingCategory(false);
      } else {
        alert('Erro ao criar categoria');
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = user.role === UserRole.ADMIN;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-2 md:px-0">
      {/* Header */}
      <header className="flex flex-col items-center text-center gap-6 border-b border-neutral-800/40 pt-4 pb-12">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-amber-500/80 mb-1">
            <Sparkles size={14} className="animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-[0.4em]">
              Stayler Exclusive
            </span>
          </div>
          <h2 className="text-4xl md:text-7xl font-display font-bold tracking-tighter bg-gradient-to-b from-white via-white to-neutral-600 bg-clip-text text-transparent">
            Marketplace
          </h2>
        </div>

        {isAdmin && (
          <div className="flex gap-3 md:gap-4 w-full md:w-auto px-4 md:px-0">
            <button
              onClick={() => {
                setEditingProduct(null);
                setSelectedImage(null);
                setPriceDisplay('');
                setIsAddingProduct(true);
              }}
              className="flex-1 md:flex-none bg-amber-500 hover:bg-amber-400 text-black px-4 md:px-8 py-3.5 md:py-4 rounded-2xl font-bold flex items-center justify-center gap-2 md:gap-3 shadow-xl transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus size={18} />
              <span className="text-xs md:text-sm md:hidden">produto</span>
              <span className="text-sm hidden md:inline">Novo Produto</span>
            </button>
            <button
              onClick={() => setIsAddingCategory(true)}
              className="flex-1 md:flex-none bg-neutral-800 hover:bg-neutral-700 text-white px-4 md:px-8 py-3.5 md:py-4 rounded-2xl font-bold flex items-center justify-center gap-2 md:gap-3 shadow-xl border border-neutral-700 transition-all hover:scale-[1.02] active:scale-95"
            >
              <FolderPlus size={18} />{' '}
              <span className="text-xs md:text-sm md:hidden">categoria</span>
              <span className="text-sm hidden md:inline">Nova Categoria</span>
            </button>
          </div>
        )}
      </header>

      {/* Navigation & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center max-w-5xl mx-auto w-full">
        <div className="md:col-span-7 relative group">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-amber-500 transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="O que você procura?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900/40 border border-neutral-800/60 rounded-2xl pl-14 pr-6 py-4 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500/30 transition-all backdrop-blur-md text-sm md:text-base"
          />
        </div>

        <div className="md:col-span-5 relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`w-full flex items-center justify-between bg-neutral-900/40 border border-neutral-800/60 rounded-2xl px-6 py-4 text-white transition-all backdrop-blur-md group hover:border-amber-500/30 ${
              isDropdownOpen
                ? 'ring-1 ring-amber-500/20 border-amber-500/30'
                : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <Filter
                size={18}
                className={
                  isDropdownOpen ? 'text-amber-500' : 'text-neutral-600'
                }
              />
              <span
                className={`text-[11px] font-bold uppercase tracking-widest ${
                  activeCategory !== 'all'
                    ? 'text-amber-500'
                    : 'text-neutral-400'
                }`}
              >
                {activeCategoryName}
              </span>
            </div>
            <ChevronDown
              size={18}
              className={`text-neutral-600 transition-transform duration-300 ${
                isDropdownOpen ? 'rotate-180 text-amber-500' : ''
              }`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-[calc(100%+10px)] left-0 w-full bg-neutral-900 border border-neutral-800 rounded-[1.5rem] py-3 shadow-2xl z-[60] animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setIsDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-6 py-3.5 hover:bg-white/5 transition-colors text-left ${
                  activeCategory === 'all'
                    ? 'text-amber-500'
                    : 'text-neutral-400'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-widest">
                  Todos os Produtos
                </span>
                {activeCategory === 'all' && <Check size={14} />}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-6 py-3.5 hover:bg-white/5 transition-colors text-left ${
                    activeCategory === cat.id
                      ? 'text-amber-500'
                      : 'text-neutral-400'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {cat.name}
                  </span>
                  {activeCategory === cat.id && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="group relative bg-neutral-900/30 border border-neutral-800/40 rounded-2xl md:rounded-[2.5rem] overflow-hidden hover:border-amber-500/30 transition-all duration-500 flex flex-col h-full hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            <div className="aspect-square md:aspect-[4/5] relative overflow-hidden bg-neutral-800/50">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
              />
            </div>

            <div className="p-4 md:p-6 flex flex-col flex-1">
              <div className="mb-3 w-full text-center">
                <h4 className="font-bold text-sm md:text-lg text-white group-hover:text-amber-500 transition-colors line-clamp-1">
                  {product.name}
                </h4>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-[8px] md:text-[9px] text-amber-500/80 bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10 uppercase tracking-widest font-bold">
                    {categories.find((c) => c.id === product.category)?.name}
                  </span>
                </div>
              </div>

              {product.description && (
                <p className="text-[10px] md:text-xs text-neutral-500 text-center line-clamp-2 mb-4 italic leading-relaxed px-2">
                  "{product.description}"
                </p>
              )}

              <div className="mt-auto flex flex-col items-center gap-4 w-full pt-4 border-t border-neutral-800/40">
                <div className="flex flex-col items-center">
                  <p className="text-lg md:text-2xl font-display font-bold text-white leading-tight">
                    <span className="text-[10px] md:text-xs text-amber-500/70 mr-0.5">
                      R$
                    </span>
                    {product.price.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div
                      className={`w-1 h-1 rounded-full ${product.stock > 0 ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}
                    ></div>
                    <p
                      className={`text-[8px] md:text-[9px] font-bold uppercase tracking-widest ${product.stock > 0 ? 'text-neutral-500' : 'text-red-500'}`}
                    >
                      {product.stock > 0
                        ? `${product.stock} unidades`
                        : 'Esgotado'}
                    </p>
                  </div>
                </div>

                {!isAdmin && (
                  <button
                    disabled={product.stock <= 0 || isPurchasing}
                    onClick={() => handleBuyProduct(product)}
                    className={`w-full py-2.5 rounded-xl text-[10px] font-bold transition-all shadow-lg active:scale-95 ${
                      product.stock > 0
                        ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    {isPurchasing ? 'Processando...' : 'Comprar Agora'}
                  </button>
                )}
                <button className="hidden opacity-0 cursor-default">
                  {/* Shopping cart hidden per request */}
                </button>
                {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProduct(product);
                      }}
                      className="bg-black/50 backdrop-blur-md text-white p-2 rounded-xl hover:bg-amber-500 hover:text-black transition-all shadow-xl active:scale-90"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProduct(product.id);
                      }}
                      className="bg-black/50 backdrop-blur-md text-white p-2 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-90"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Creation Product Modal */}
      {isAddingProduct && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-6">
          <div className="bg-neutral-950 border border-neutral-800/60 w-full max-w-xl rounded-[3rem] p-12 shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="mb-8 text-center">
              <h3 className="text-4xl font-display font-bold text-white mb-3">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <p className="text-neutral-500 text-sm font-medium">
                Cadastre itens no Marketplace
              </p>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video bg-neutral-900 border-2 border-dashed border-neutral-800 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer group hover:border-amber-500/50 transition-all relative overflow-hidden"
              >
                {selectedImage ? (
                  <>
                    <img
                      src={selectedImage}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-neutral-800 rounded-2xl text-neutral-500 group-hover:text-amber-500 transition-colors mb-3">
                      <ImageIcon size={32} />
                    </div>
                    <p className="text-xs font-bold text-neutral-600 uppercase tracking-widest">
                      Enviar Imagem
                    </p>
                  </>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.3em] ml-2">
                  Nome
                </label>
                <input
                  required
                  name="name"
                  defaultValue={editingProduct?.name}
                  className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl px-6 py-5 outline-none text-white focus:border-amber-500/40"
                  placeholder="Nome do produto"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.3em] ml-2">
                  Descrição
                </label>
                <textarea
                  required
                  name="description"
                  defaultValue={editingProduct?.description}
                  rows={3}
                  className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl px-6 py-4 outline-none text-white focus:border-amber-500/40 resize-none text-sm"
                  placeholder="Descreva o produto..."
                />
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.3em] ml-2">
                  Quantidade em Estoque
                </label>
                <input
                  required
                  name="stock"
                  type="number"
                  min="0"
                  defaultValue={editingProduct?.stock || 0}
                  className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl px-6 py-5 outline-none text-white focus:border-amber-500/40"
                  placeholder="Ex: 50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.3em] ml-2">
                    Preço (R$)
                  </label>
                  <input
                    required
                    name="price"
                    type="text"
                    value={priceDisplay}
                    onChange={(e) =>
                      setPriceDisplay(
                        formatCurrency(parseCurrency(e.target.value)),
                      )
                    }
                    className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl px-6 py-5 outline-none text-white focus:border-amber-500/40"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.3em] ml-2">
                    Categoria
                  </label>
                  <div className="relative">
                    <select
                      name="category"
                      defaultValue={editingProduct?.category}
                      className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl px-6 py-5 outline-none text-white focus:border-amber-500/40 appearance-none"
                    >
                      {categories.length === 0 ? (
                        <option value="" disabled>
                          Nenhuma categoria cadastrada
                        </option>
                      ) : (
                        categories.map((c) => (
                          <option
                            key={c.id}
                            value={c.id}
                            className="bg-neutral-900"
                          >
                            {c.name}
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown
                      size={18}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-600 pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsAddingProduct(false)}
                  className="flex-1 py-5 border border-neutral-800 rounded-2xl font-bold text-neutral-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-5 bg-amber-500 text-black rounded-2xl font-bold"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Creation Category Modal */}
      {isAddingCategory && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-6">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-md rounded-[2.5rem] p-10 animate-in zoom-in-95 duration-300">
            <div className="mb-8 text-center">
              <h3 className="text-3xl font-display font-bold text-white mb-2">
                Nova Categoria
              </h3>
              <p className="text-neutral-500 text-sm">
                Organize seu Marketplace
              </p>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.3em] ml-2">
                  Nome da Categoria
                </label>
                <input
                  required
                  name="catName"
                  className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl px-6 py-5 outline-none text-white focus:border-amber-500/40"
                  placeholder="Ex: Higiene Facial"
                />
              </div>
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="flex-1 py-5 border border-neutral-800 rounded-2xl font-bold text-neutral-600 text-xs uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-5 bg-amber-500 text-black rounded-2xl font-bold text-xs uppercase tracking-widest"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                <AlertTriangle size={32} className="text-red-500" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">
                  Excluir Produto
                </h3>
                <p className="text-sm text-neutral-400">
                  Tem certeza que deseja remover este item? Essa ação não pode
                  ser desfeita.
                </p>
              </div>

              <div className="flex w-full gap-3 mt-4">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-3 px-4 border border-neutral-800 rounded-xl font-bold text-neutral-400 hover:bg-neutral-800 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 px-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all text-sm"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => setImageToCrop(null)}
          aspect={1}
        />
      )}
    </div>
  );
};

export default MarketplaceView;
