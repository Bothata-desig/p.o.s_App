
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, SaleRecord, OrderItem, ViewState, AuthSession } from './types';
import { INITIAL_PRODUCTS, CATEGORIES } from './constants';
import { 
  IconShoppingBag, 
  IconInventory, 
  IconChart, 
  IconPlus, 
  IconMinus, 
  IconTrash, 
  IconZap, 
  IconSearch,
  IconSettings,
  IconX
} from './components/Icons';
import Login from './components/Login';
import { logoutUser, getCurrentSession } from './services/authService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const App: React.FC = () => {
  // Authentication state
  const [session, setSession] = useState<AuthSession | null>(getCurrentSession());
  const [isInitialized, setIsInitialized] = useState(false);

  // State initialization: Load from LocalStorage (like a notes app)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('pos_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });
  
  const [sales, setSales] = useState<SaleRecord[]>(() => {
    try {
      const saved = localStorage.getItem('pos_sales');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentView, setCurrentView] = useState<ViewState>('pos');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // Validate session on mount
  useEffect(() => {
    const currentSession = getCurrentSession();
    if (currentSession) {
      setSession(currentSession);
    } else {
      setSession(null);
    }
    setIsInitialized(true);
  }, []);

  // Clear selections when switching views
  useEffect(() => {
    setSelectedProductIds(new Set());
  }, [currentView]);

  // Handle login
  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
  };

  // Handle logout
  const handleLogout = () => {
    logoutUser();
    setSession(null);
  };

  // Persistence: Save to LocalStorage whenever state changes
  useEffect(() => { 
    if (isInitialized) {
      try {
        localStorage.setItem('pos_products', JSON.stringify(products)); 
      } catch (error) {
        console.error('Failed to save products:', error);
      }
    }
  }, [products, isInitialized]);

  useEffect(() => { 
    if (isInitialized) {
      try {
        localStorage.setItem('pos_sales', JSON.stringify(sales)); 
      } catch (error) {
        console.error('Failed to save sales:', error);
      }
    }
  }, [sales, isInitialized]);

  // Re-check session if it becomes null but we should still be logged in
  // Only check once after initialization, not on every session change
  useEffect(() => {
    if (isInitialized && !session) {
      // Small delay to ensure localStorage is ready
      const timer = setTimeout(() => {
        const currentSession = getCurrentSession();
        if (currentSession) {
          setSession(currentSession);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isInitialized]); // Only depend on isInitialized, not session

  // Data Filtering
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      (selectedCategory === 'All' || p.category === selectedCategory) &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [products, selectedCategory, searchQuery]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalOrders = sales.length;
    return {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
    };
  }, [sales]);

  const salesTrendData = useMemo(() => {
    const days: Record<string, number> = {};
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString();
    });
    
    last7Days.forEach(day => days[day] = 0);
    sales.forEach(s => {
      const day = new Date(s.timestamp).toLocaleDateString();
      if (days[day] !== undefined) days[day] += s.total;
    });
    
    return Object.entries(days).map(([name, total]) => ({ name, total }));
  }, [sales]);

  // Core POS Actions
  const addToCart = useCallback((product: Product, quantity = 1) => {
    if (product.stock <= 0) {
      alert(`"${product.name}" is out of stock!`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        // Check if we have enough stock for the increment
        if (existing.quantity + quantity > product.stock) {
          alert(`Insufficient stock for ${product.name}`);
          return prev;
        }
        return prev.map(item => 
          item.productId === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity }];
    });
  }, [products]);

  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find(p => p.id === productId);
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        if (product && newQty > product.stock) {
          alert("Maximum stock reached for this item");
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const completeSale = (paymentMethod: SaleRecord['paymentMethod']) => {
    const newSale: SaleRecord = {
      id: `TX-${Date.now().toString().slice(-6)}`,
      timestamp: Date.now(),
      items: [...cart],
      total: cartTotal,
      paymentMethod
    };

    setSales(prev => [...prev, newSale]);
    setProducts(prev => prev.map(p => {
      const cartItem = cart.find(ci => ci.productId === p.id);
      return cartItem ? { ...p, stock: Math.max(0, p.stock - cartItem.quantity) } : p;
    }));
    setCart([]);
    setIsCheckoutModalOpen(false);
  };

  // Inventory Management Actions
  const adjustStock = (productId: string, amount: number) => {
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, stock: Math.max(0, p.stock + amount) } : p
    ));
  };

  const deleteProduct = (productId: string) => {
    if (confirm("Permanently remove this item from your catalog?")) {
      setProducts(prev => prev.filter(p => p.id !== productId));
      setSelectedProductIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.size === products.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(products.map(p => p.id)));
    }
  };

  const deleteSelectedProducts = () => {
    if (selectedProductIds.size === 0) return;
    
    const count = selectedProductIds.size;
    if (confirm(`Permanently remove ${count} selected item${count > 1 ? 's' : ''} from your catalog? This cannot be undone.`)) {
      setProducts(prev => prev.filter(p => !selectedProductIds.has(p.id)));
      // Remove deleted items from cart if they're there
      setCart(prev => prev.filter(item => !selectedProductIds.has(item.productId)));
      setSelectedProductIds(new Set());
    }
  };

  const addNewProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const colors = ['bg-blue-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600', 'bg-violet-600', 'bg-stone-800'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newProd: Product = {
      id: `PR-${Date.now().toString().slice(-6)}`,
      name: formData.get('name') as string,
      price: parseFloat(formData.get('price') as string),
      category: formData.get('category') as string,
      stock: parseInt(formData.get('stock') as string),
      color: randomColor
    };
    
    setProducts(prev => [...prev, newProd]);
    setIsAddProductModalOpen(false);
    // Switch to POS if they were in inventory
    if (currentView === 'inventory') setCurrentView('pos');
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to wipe all transaction records? This cannot be undone.")) {
      setSales([]);
    }
  };

  const deleteAllProducts = () => {
    if (confirm("Delete all products from your catalog? This cannot be undone.")) {
      if (confirm("This will also empty your cart. Continue?")) {
        setProducts([]);
        setCart([]);
      }
    }
  };

  const clearAllData = () => {
    if (confirm("This will permanently delete ALL your data:\n- All products\n- All sales records\n- Your cart\n\nThis action CANNOT be undone. Are you absolutely sure?")) {
      if (confirm("Type 'DELETE' in your mind and click OK to confirm permanent deletion of all data.")) {
        setProducts([]);
        setSales([]);
        setCart([]);
        setIsDataManagementOpen(false);
      }
    }
  };

  const deleteUserAccount = () => {
    if (confirm("This will delete your user account and all associated data. You will need to register again. Continue?")) {
      if (confirm("Are you absolutely sure? This action cannot be undone!")) {
        // Delete user account
        const users = localStorage.getItem('pos_users');
        if (users) {
          const userList = JSON.parse(users);
          const filtered = userList.filter((u: any) => u.id !== session.userId);
          localStorage.setItem('pos_users', JSON.stringify(filtered));
        }
        // Clear all data and logout
        setProducts([]);
        setSales([]);
        setCart([]);
        handleLogout();
      }
    }
  };

  // Show login screen if not authenticated (after all hooks)
  if (!isInitialized) {
    return (
      <div className="flex h-screen w-full bg-[#f8fafc] items-center justify-center">
        <div className="text-slate-400 font-bold">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#1e293b] overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-24 bg-[#0f172a] text-white shadow-2xl py-8 items-center border-r border-slate-800 shrink-0">
        <div className="mb-12">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">CP</div>
        </div>
        <nav className="flex-1 flex flex-col gap-6">
          <SideNavItem active={currentView === 'pos'} onClick={() => setCurrentView('pos')} icon={<IconShoppingBag />} label="POS" />
          <SideNavItem active={currentView === 'inventory'} onClick={() => setCurrentView('inventory')} icon={<IconInventory />} label="Stock" />
          <SideNavItem active={currentView === 'reports'} onClick={() => setCurrentView('reports')} icon={<IconChart />} label="Stats" />
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 glass z-10">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {currentView === 'pos' && 'Terminal'}
              {currentView === 'inventory' && 'Stock Control'}
              {currentView === 'reports' && 'Business Overview'}
            </h1>
            {currentView === 'pos' && products.length > 0 && (
              <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl w-80 border border-slate-200 focus-within:border-blue-400 transition-all">
                <IconSearch />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  className="bg-transparent border-none outline-none text-sm w-full font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{session.role}</p>
              <p className="font-semibold text-sm">{session.username}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center font-bold text-white border border-white shadow-sm">
              {session.username.substring(0, 2).toUpperCase()}
            </div>
            <button
              onClick={() => setIsDataManagementOpen(true)}
              className="ml-2 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors p-2"
              title="Data Management"
            >
              <IconSettings />
            </button>
            <button
              onClick={handleLogout}
              className="ml-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {currentView === 'pos' && (
            <>
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                {products.length === 0 ? (
                  /* GUIDANCE FOR NEW USERS */
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                    <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
                      <IconPlus />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Setup Your Catalog</h2>
                    <p className="text-slate-500 font-medium leading-relaxed mb-10">
                      Welcome to CloudPOS Pro. To start making sales, you first need to add your products. Click the button below to register your first item.
                    </p>
                    <button 
                      onClick={() => setIsAddProductModalOpen(true)}
                      className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-bold shadow-2xl shadow-blue-600/30 hover:bg-blue-700 transition-all flex items-center gap-3 active:scale-95"
                    >
                      <IconPlus /> Register My First Product
                    </button>
                    <p className="mt-8 text-xs text-slate-400 font-bold uppercase tracking-widest">All data is saved locally on this device</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex gap-2 p-1 bg-slate-200 rounded-xl overflow-x-auto no-scrollbar">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                              selectedCategory === cat ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="product-grid">
                      {filteredProducts.map(product => (
                        <div 
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className="group bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center text-center relative overflow-hidden"
                        >
                          <div className={`w-14 h-14 rounded-2xl ${product.color} mb-4 flex items-center justify-center text-white font-bold text-xl opacity-90 group-hover:scale-110 transition-transform`}>
                            {product.name[0]}
                          </div>
                          <h3 className="font-bold text-slate-800 text-sm mb-1">{product.name}</h3>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-4">{product.category}</p>
                          <div className="mt-auto">
                            <p className="text-blue-600 font-extrabold text-lg">LSL {product.price.toFixed(2)}</p>
                            <p className={`text-[10px] mt-2 font-bold px-3 py-1 rounded-full ${product.stock < 10 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                              {product.stock} units
                            </p>
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg">
                               <IconPlus />
                             </div>
                          </div>
                        </div>
                      ))}
                      {filteredProducts.length === 0 && (
                        <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase tracking-widest">
                          No items found matching "{searchQuery}"
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Cart Panel */}
              <div className="w-full md:w-[420px] bg-white border-l border-slate-200 flex flex-col h-[60vh] md:h-full shadow-2xl relative z-10">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md shadow-blue-200">
                      <IconShoppingBag />
                    </div>
                    <h2 className="text-lg font-bold">Checkout Queue</h2>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center opacity-40">
                      <div className="scale-150 mb-6"><IconShoppingBag /></div>
                      <p className="text-lg font-medium">No items scanned</p>
                      <p className="text-sm">Click products to add to cart</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.productId} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 group">
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-slate-800">{item.name}</h4>
                          <p className="text-xs font-semibold text-blue-600">LSL {item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100">
                          <button onClick={() => updateQuantity(item.productId, -1)} className="text-slate-400 hover:text-blue-600 transition-colors p-1"><IconMinus /></button>
                          <span className="w-4 text-center text-sm font-bold">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.productId, 1)} 
                            className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                          >
                            <IconPlus />
                          </button>
                        </div>
                        <button onClick={() => removeFromCart(item.productId)} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><IconTrash /></button>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-8 bg-[#0f172a] text-white rounded-t-[3rem] shadow-[0_-15px_30px_-15px_rgba(0,0,0,0.3)] mt-auto">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Grand Total</span>
                    <span className="text-3xl font-black text-white">LSL {cartTotal.toFixed(2)}</span>
                  </div>
                  <button 
                    disabled={cart.length === 0}
                    onClick={() => setIsCheckoutModalOpen(true)}
                    className="w-full bg-blue-600 text-white h-16 rounded-2xl font-bold text-lg hover:bg-blue-500 active:scale-95 transition-all shadow-xl shadow-blue-600/20 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    Confirm & Settle
                  </button>
                </div>
              </div>
            </>
          )}

          {currentView === 'inventory' && (
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-50">
               <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-2xl text-slate-900">Product Catalog</h3>
                    <p className="text-slate-400 text-sm font-medium mt-1">Manage and track your available stock levels.</p>
                  </div>
                  <div className="flex gap-3">
                    {selectedProductIds.size > 0 && (
                      <button 
                        onClick={deleteSelectedProducts}
                        className="bg-rose-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-rose-700 transition-all flex items-center gap-2 shadow-lg shadow-rose-600/20 active:scale-95"
                      >
                        <IconTrash /> Delete Selected ({selectedProductIds.size})
                      </button>
                    )}
                    <button 
                      onClick={() => setIsAddProductModalOpen(true)}
                      className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                      <IconPlus /> Add New Product
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b">
                      <tr>
                        <th className="px-10 py-5">
                          <input
                            type="checkbox"
                            checked={products.length > 0 && selectedProductIds.size === products.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                        </th>
                        <th className="px-10 py-5">Product Name</th>
                        <th className="px-10 py-5">Category</th>
                        <th className="px-10 py-5 text-right">Unit Price</th>
                        <th className="px-10 py-5 text-center">Stock Control</th>
                        <th className="px-10 py-5 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-medium">
                      {products.map(p => (
                        <tr key={p.id} className={`hover:bg-blue-50/20 transition-colors group ${selectedProductIds.has(p.id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-10 py-6">
                            <input
                              type="checkbox"
                              checked={selectedProductIds.has(p.id)}
                              onChange={() => toggleProductSelection(p.id)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl ${p.color} flex items-center justify-center text-white font-bold text-xs`}>{p.name[0]}</div>
                              <span className="font-bold text-slate-800">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-10 py-6 text-slate-400">{p.category}</td>
                          <td className="px-10 py-6 text-right font-black">LSL {p.price.toFixed(2)}</td>
                          <td className="px-10 py-6 text-center">
                            <div className="flex items-center justify-center gap-4">
                              <button onClick={() => adjustStock(p.id, -1)} className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors"><IconMinus /></button>
                              <span className={`font-black w-10 text-lg ${p.stock < 10 ? 'text-rose-600' : 'text-blue-600'}`}>{p.stock}</span>
                              <button onClick={() => adjustStock(p.id, 1)} className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"><IconPlus /></button>
                            </div>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <button 
                              onClick={() => deleteProduct(p.id)}
                              className="text-slate-200 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all p-2"
                            >
                              <IconTrash />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {products.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-10 py-20 text-center text-slate-400 font-bold uppercase tracking-widest bg-white">
                            The catalog is empty. Start adding items above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
               </div>
            </div>
          )}

          {currentView === 'reports' && (
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Business Reports</h2>
                  <p className="text-sm text-slate-500 font-medium">Comprehensive summary of your retail activity.</p>
                </div>
                <button onClick={clearHistory} className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all text-sm uppercase tracking-widest">
                  Wipe Sales History
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <StatCard label="Total Revenue" value={`LSL ${stats.totalRevenue.toFixed(2)}`} icon={<IconChart />} color="bg-blue-600" />
                <StatCard label="Orders Filled" value={stats.totalOrders.toString()} icon={<IconShoppingBag />} color="bg-emerald-500" />
                <StatCard label="Avg Order Size" value={`LSL ${stats.averageOrderValue.toFixed(2)}`} icon={<IconChart />} color="bg-violet-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold mb-10">Revenue Trend (Last 7 Days)</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesTrendData}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                        <Tooltip 
                          contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                          itemStyle={{fontWeight: 'bold', fontSize: '12px'}}
                        />
                        <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-10 border-b border-slate-100">
                    <h3 className="text-lg font-bold">Transaction Ledger</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 max-h-[300px]">
                    {sales.slice().reverse().map(sale => (
                      <div key={sale.id} className="p-8 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><IconShoppingBag /></div>
                            <div>
                              <p className="font-bold text-slate-800">{sale.id}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(sale.timestamp).toLocaleTimeString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-slate-900 text-lg">LSL {sale.total.toFixed(2)}</p>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">{sale.paymentMethod}</p>
                          </div>
                        </div>
                        <div className="ml-14 space-y-2">
                          {sale.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-semibold">{item.name}</span>
                                <span className="text-slate-400 text-xs">×{item.quantity}</span>
                              </div>
                              <span className="text-slate-700 font-bold">LSL {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {sales.length === 0 && <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest">No historical data available.</div>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-xl p-12 overflow-hidden relative animate-in fade-in zoom-in duration-200">
            <header className="mb-12">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Final Settlement</h2>
              <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-[10px]">Verify payment to close order</p>
            </header>
            
            <div className="bg-slate-50 rounded-[2rem] p-10 mb-10 flex items-center justify-between border border-slate-100">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Due Amount</span>
              <span className="text-5xl font-black text-blue-600">LSL {cartTotal.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              <PaymentOption onClick={() => completeSale('cash')} label="Cash" sub="M-Net Payment" color="bg-emerald-500" />
              <PaymentOption onClick={() => completeSale('card')} label="Card" sub="POS Terminal" color="bg-blue-600" />
              <PaymentOption onClick={() => completeSale('digital')} label="Digital" sub="E-Wallet Transfer" color="bg-violet-600" />
            </div>

            <button 
              onClick={() => setIsCheckoutModalOpen(false)}
              className="w-full text-slate-400 font-black py-2 hover:text-rose-500 transition-colors text-xs uppercase tracking-[0.2em]"
            >
              Discard Checkout
            </button>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-lg p-12 animate-in fade-in zoom-in duration-200 border border-slate-100">
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">New Item Registration</h2>
            <p className="text-slate-400 text-sm font-medium mb-10">Define the details for your new stock item.</p>
            
            <form onSubmit={addNewProduct} className="space-y-8">
              <div className="group">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Display Name</label>
                <input required name="name" placeholder="e.g., Premium Leather Belt" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:border-blue-500 focus:bg-white outline-none font-bold text-slate-700 transition-all shadow-sm" />
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Unit Price (LSL)</label>
                  <input required name="price" type="number" step="0.01" placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:border-blue-500 focus:bg-white outline-none font-bold text-slate-700 transition-all shadow-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Initial Stock</label>
                  <input required name="stock" type="number" placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:border-blue-500 focus:bg-white outline-none font-bold text-slate-700 transition-all shadow-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Category Classification</label>
                <select name="category" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:border-blue-500 focus:bg-white outline-none font-bold text-slate-700 transition-all shadow-sm appearance-none cursor-pointer">
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-4 pt-6">
                <button type="submit" className="flex-2 bg-blue-600 text-white font-bold py-5 rounded-2xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-600/30 px-8 active:scale-95">Register Product</button>
                <button type="button" onClick={() => setIsAddProductModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-5 rounded-2xl hover:bg-slate-200 transition-all active:scale-95">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Data Management Modal */}
      {isDataManagementOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900">Data Management</h2>
              <button
                onClick={() => setIsDataManagementOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Clear Sales History */}
              <button
                onClick={clearHistory}
                className="w-full p-4 text-left border border-slate-200 rounded-xl hover:bg-amber-50 hover:border-amber-300 transition-all group"
              >
                <p className="font-bold text-slate-900 group-hover:text-amber-700">Clear Sales History</p>
                <p className="text-xs text-slate-500 mt-1">Delete all transaction records (cannot be undone)</p>
              </button>

              {/* Delete All Products */}
              <button
                onClick={deleteAllProducts}
                className="w-full p-4 text-left border border-slate-200 rounded-xl hover:bg-orange-50 hover:border-orange-300 transition-all group"
              >
                <p className="font-bold text-slate-900 group-hover:text-orange-700">Delete All Products</p>
                <p className="text-xs text-slate-500 mt-1">Remove all items from your catalog (cannot be undone)</p>
              </button>

              {/* Clear All Data */}
              <button
                onClick={clearAllData}
                className="w-full p-4 text-left border border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all group"
              >
                <p className="font-bold text-slate-900 group-hover:text-red-700">Clear All Data</p>
                <p className="text-xs text-slate-500 mt-1">Delete products, sales, and cart (cannot be undone)</p>
              </button>

              {/* Delete User Account */}
              <button
                onClick={deleteUserAccount}
                className="w-full p-4 text-left border border-red-300 rounded-xl hover:bg-red-50 transition-all group bg-red-50"
              >
                <p className="font-bold text-red-700">Delete User Account</p>
                <p className="text-xs text-red-600 mt-1">Permanently delete your account and all data (irreversible)</p>
              </button>
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-xs text-blue-700 font-semibold">💡 Tip: Data is stored locally on your device. Clearing your browser cache will also delete all data.</p>
            </div>

            <button
              onClick={() => setIsDataManagementOpen(false)}
              className="w-full mt-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SideNavItem = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 relative group ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white hover:bg-slate-800'
    }`}
  >
    {icon}
    <span className="text-[8px] font-black uppercase tracking-widest mt-1 opacity-60">{label}</span>
    {active && <div className="absolute -right-2 w-1 h-6 bg-blue-400 rounded-full"></div>}
  </button>
);

const StatCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-8 group hover:border-blue-200 transition-all">
    <div className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{label}</p>
      <h2 className="text-3xl font-black text-slate-900">{value}</h2>
    </div>
  </div>
);

const PaymentOption = ({ label, sub, color, onClick }: any) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50 transition-all group gap-3"
  >
    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white font-black text-xl shadow-xl group-hover:scale-110 transition-transform`}>
      {label[0]}
    </div>
    <div className="text-center">
      <p className="font-black text-slate-900 text-sm tracking-tight">{label}</p>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{sub}</p>
    </div>
  </button>
);

export default App;
