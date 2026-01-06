import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, ProductCategory } from '../types';
import { PRODUCT_CATEGORIES } from '../constants';
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
  const [categories, setCategories] =
    useState<ProductCategory[]>(PRODUCT_CATEGORIES);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const { getProducts } = await import('../actions/marketplace.actions');
    const res = await getProducts();
    if (res.success) {
      setProducts(res.products || []);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDeleteProduct = (id: string) => {
    setProductToDelete(id);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      const { deleteProduct } = await import('../actions/marketplace.actions');
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
      try {
        const compressed = await compressImage(file);
        setSelectedImage(compressed);
      } catch (err) {
        console.error('Error compressing image:', err);
        alert('Erro ao processar imagem. Tente uma imagem menor.');
      }
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
      price: Number(formData.get('price')),
      category: formData.get('category') as string,
      image: imageToSave,
    };

    let res;
    if (editingProduct) {
      const { updateProduct } = await import('../actions/marketplace.actions');
      res = await updateProduct(editingProduct.id, productData);
    } else {
      const { createProduct } = await import('../actions/marketplace.actions');
      res = await createProduct(productData);
    }

    if (res.success) {
      fetchProducts();
      setIsAddingProduct(false);
      setSelectedImage(null);
      setEditingProduct(null);
    } else {
      alert('Erro ao salvar produto');
    }
  };

  const handleAddCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('catName') as string;
    if (name) {
      setCategories([
        ...categories,
        { id: Math.random().toString(36).substr(2, 9), name },
      ]);
      setIsAddingCategory(false);
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
          <h2 className="text-6xl md:text-7xl font-display font-bold tracking-tighter bg-gradient-to-b from-white via-white to-neutral-600 bg-clip-text text-transparent">
            Marketplace
          </h2>
        </div>

        {isAdmin && (
          <div className="flex gap-4">
            <button
              onClick={() => {
                setEditingProduct(null);
                setSelectedImage(null);
                setIsAddingProduct(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-black px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus size={20} /> <span className="text-sm">Novo Produto</span>
            </button>
            <button
              onClick={() => setIsAddingCategory(true)}
              className="bg-neutral-800 hover:bg-neutral-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl border border-neutral-700 transition-all hover:scale-[1.02] active:scale-95"
            >
              <FolderPlus size={20} />{' '}
              <span className="text-sm">Nova Categoria</span>
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
            className="w-full bg-neutral-900/40 border border-neutral-800/60 rounded-[1.5rem] pl-16 pr-6 py-5 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500/30 transition-all backdrop-blur-md text-sm md:text-base"
          />
        </div>

        <div className="md:col-span-5 relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`w-full flex items-center justify-between bg-neutral-900/40 border border-neutral-800/60 rounded-[1.5rem] px-8 py-5 text-white transition-all backdrop-blur-md group hover:border-amber-500/30 ${
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
              <div className="mb-2">
                <h4 className="font-bold text-base md:text-lg text-white/90 group-hover:text-amber-500 transition-colors">
                  {product.name}
                </h4>
                <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold mt-1">
                  {categories.find((c) => c.id === product.category)?.name}
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-800/40">
                <p className="text-lg md:text-2xl font-display font-bold text-white">
                  <span className="text-xs text-amber-500/70 mr-0.5">R$</span>
                  {product.price}
                </p>
                <button className="bg-white text-black p-2 md:p-3 rounded-xl md:rounded-2xl hover:bg-amber-500 transition-all shadow-xl active:scale-90 opacity-0 cursor-default">
                  {/* Shopping cart hidden per request */}
                </button>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="bg-neutral-800 text-white p-2 md:p-3 rounded-xl md:rounded-2xl hover:bg-amber-500 hover:text-black transition-all shadow-xl active:scale-90"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="bg-neutral-800 text-white p-2 md:p-3 rounded-xl md:rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-90"
                    >
                      <Trash2 size={18} />
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
                    type="number"
                    step="0.01"
                    defaultValue={editingProduct?.price}
                    className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl px-6 py-5 outline-none text-white focus:border-amber-500/40"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.3em] ml-2">
                    Categoria
                  </label>
                  <select
                    name="category"
                    defaultValue={editingProduct?.category}
                    className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl px-6 py-5 outline-none text-white focus:border-amber-500/40 appearance-none"
                  >
                    {categories.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        className="bg-neutral-900"
                      >
                        {c.name}
                      </option>
                    ))}
                  </select>
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
    </div>
  );
};

export default MarketplaceView;
