import { useState, useEffect, useMemo } from 'react'
import { 
  Edit2, Trash2, Plus, Sparkles, Star, 
  Search, Check, RefreshCw, ChevronLeft, ChevronRight, 
  HelpCircle, Info, ShoppingBag, Package
} from 'lucide-react'
import { apiClient } from '@/api/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProductFormData {
  name: string
  base_price: string
  original_price: string
  category: string
  sport: string
  badge: string
  rating: string
  reviews_count: string
  description_text: string
  sizes: string
  features: string
  is_customizable: boolean
  in_stock: boolean
  image_url: string
}

// 100% clean initial state with zero mock/hardcoded values
const INITIAL_FORM: ProductFormData = {
  name: '',
  base_price: '',
  original_price: '',
  category: '',
  sport: '',
  badge: '',
  rating: '',
  reviews_count: '',
  description_text: '',
  sizes: '',
  features: '',
  is_customizable: false,
  in_stock: true,
  image_url: ''
}

const ITEMS_PER_PAGE = 12

export default function AdminShop() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL')
  const [selectedStockFilter, setSelectedStockFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [showSeedInfo, setShowSeedInfo] = useState(false)

  // Primary Navigation Tabs: 'create' | 'list'
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create')

  // Pagination State (12 records per page)
  const [currentPage, setCurrentPage] = useState(1)

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<ProductFormData>(INITIAL_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Dynamically derive existing categories, sports, and badges from actual database items
  const dynamicCategories = useMemo(() => {
    const set = new Set<string>()
    products.forEach(p => {
      if (p.category) set.add(p.category)
    })
    return Array.from(set)
  }, [products])

  const dynamicSports = useMemo(() => {
    const set = new Set<string>()
    products.forEach(p => {
      if (p.sport) set.add(p.sport)
    })
    return Array.from(set)
  }, [products])

  const dynamicBadges = useMemo(() => {
    const set = new Set<string>()
    products.forEach(p => {
      if (p.badge) set.add(p.badge)
    })
    return Array.from(set)
  }, [products])

  const broadcastRealTimeUpdate = () => {
    try {
      const channel = new BroadcastChannel('turf_shop_channel')
      channel.postMessage({ type: 'PRODUCTS_UPDATED', timestamp: Date.now() })
      channel.close()
    } catch {
      // BroadcastChannel fallback
    }
    window.dispatchEvent(new CustomEvent('shop_products_updated', { detail: { timestamp: Date.now() } }))
  }

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/v1/shop/products/')
      setProducts(res.data.results || res.data || [])
    } catch (err) {
      console.error('Error fetching admin shop products:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleEdit = (p: any) => {
    setEditingId(p.id)
    setFormData({
      name: p.name || '',
      base_price: p.base_price?.toString() || '',
      original_price: p.original_price ? p.original_price.toString() : '',
      category: p.category || '',
      sport: p.sport || '',
      badge: p.badge || '',
      rating: p.rating ? p.rating.toString() : '',
      reviews_count: p.reviews_count ? p.reviews_count.toString() : '',
      description_text: p.display_description || p.description || '',
      sizes: Array.isArray(p.sizes) ? p.sizes.join(', ') : (p.sizes || ''),
      features: Array.isArray(p.features) ? p.features.join('\n') : (p.features || ''),
      is_customizable: Boolean(p.is_customizable),
      in_stock: Boolean(p.in_stock),
      image_url: p.image_url || p.image || ''
    })
    setImagePreview(p.image_url || p.image || null)
    setImageFile(null)
    setActiveTab('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setFormData(INITIAL_FORM)
    setImageFile(null)
    setImagePreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const data = new FormData()
      data.append('name', formData.name.trim())
      data.append('base_price', formData.base_price)
      data.append('original_price', formData.original_price ? formData.original_price.trim() : '')
      data.append('in_stock', formData.in_stock.toString())
      data.append('category', formData.category.trim())
      data.append('sport', formData.sport.trim())
      data.append('badge', formData.badge.trim())
      data.append('description_text', formData.description_text.trim())
      data.append('sizes', formData.sizes.trim())
      data.append('features', formData.features.trim())
      data.append('is_customizable', formData.is_customizable.toString())

      if (formData.image_url) {
        data.append('image_url', formData.image_url.trim())
      }
      if (imageFile) {
        data.append('image', imageFile)
      }

      const headers = { 'Content-Type': 'multipart/form-data' }

      if (editingId) {
        await apiClient.put(`/v1/shop/products/${editingId}/`, data, { headers })
        setStatusMessage(`Product "${formData.name}" updated successfully!`)
      } else {
        await apiClient.post('/v1/shop/products/', data, { headers })
        setStatusMessage(`Product "${formData.name}" created successfully!`)
      }

      broadcastRealTimeUpdate()
      await fetchProducts()
      handleCancelEdit()
      setActiveTab('list')

      setTimeout(() => setStatusMessage(null), 4000)
    } catch (err: any) {
      console.error(err)
      alert(err.response?.data?.detail || 'Failed to save product. Please check all fields.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? It will be removed immediately from all shop views.`)) {
      try {
        await apiClient.delete(`/v1/shop/products/${id}/`)
        broadcastRealTimeUpdate()
        await fetchProducts()
        setStatusMessage(`Product "${name}" deleted.`)
        setTimeout(() => setStatusMessage(null), 3000)
      } catch (err) {
        alert('Failed to delete product')
      }
    }
  }

  const handleSeedDefaults = async () => {
    if (window.confirm('Load initial standard sports catalog (jerseys, studs, bats, balls, etc.) into the store?')) {
      try {
        setLoading(true)
        await apiClient.post('/v1/shop/products/seed_initial/')
        broadcastRealTimeUpdate()
        await fetchProducts()
        setStatusMessage('Default sports merchandise catalog populated successfully!')
        setTimeout(() => setStatusMessage(null), 4000)
      } catch (err) {
        alert('Failed to seed catalog')
      } finally {
        setLoading(false)
      }
    }
  }

  // Filter products dynamically
  const filteredProducts = products.filter(p => {
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase()
      const matchName = p.name?.toLowerCase().includes(q)
      const matchCat = p.category?.toLowerCase().includes(q)
      const matchSport = p.sport?.toLowerCase().includes(q)
      const matchBadge = p.badge?.toLowerCase().includes(q)
      if (!matchName && !matchCat && !matchSport && !matchBadge) return false
    }

    if (selectedCategoryFilter !== 'ALL' && p.category !== selectedCategoryFilter) {
      return false
    }

    if (selectedStockFilter === 'IN_STOCK' && !p.in_stock) return false
    if (selectedStockFilter === 'OUT_OF_STOCK' && p.in_stock) return false

    return true
  })

  // Pagination calculation (12 items per page)
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredProducts.length)
  const currentProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchFilter, selectedCategoryFilter, selectedStockFilter])

  // Calculated discount preview dynamically
  const formBasePrice = parseFloat(formData.base_price || '0')
  const formOriginalPrice = parseFloat(formData.original_price || '0')
  const formDiscount = formOriginalPrice > formBasePrice && formBasePrice > 0
    ? Math.round(((formOriginalPrice - formBasePrice) / formOriginalPrice) * 100)
    : 0

  if (loading) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-bold text-muted-foreground text-sm">Loading Shop Configuration...</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto overflow-y-auto">
      {/* HEADER */}
      <header className="mb-6 flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Manage Shop</h1>
          <p className="text-muted-foreground mt-1">Configure products dynamically and view all active merchandise in the system.</p>
        </div>

        {/* SEED DEFAULT TOOL BUTTON WITH INFO POPOVER */}
        <div className="relative flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSeedDefaults}
            className="text-xs font-semibold flex items-center gap-1.5 h-9"
          >
            <RefreshCw className="w-3.5 h-3.5 text-brand" />
            Seed Defaults
          </Button>
          <button
            type="button"
            onClick={() => setShowSeedInfo(!showSeedInfo)}
            className="text-muted-foreground hover:text-foreground p-1"
            title="What is Seed Defaults?"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {showSeedInfo && (
            <div className="absolute right-0 top-11 z-30 w-72 p-4 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-brand">
                  <Info className="w-4 h-4" /> What is "Seed Defaults"?
                </span>
                <button onClick={() => setShowSeedInfo(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                "Seed Defaults" is a database helper that loads 10 authentic starter merchandise products (Barcelona kits, Madrid kits, Nike studs, Kashmir cricket bats, balls, etc.) if your catalog is empty.
              </p>
            </div>
          )}
        </div>
      </header>

      {/* STATUS BANNER */}
      {statusMessage && (
        <div className="mb-6 bg-brand/10 border border-brand/30 text-brand px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2.5 animate-in fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* TABS (MATCHING USER SCREENSHOT EXACTLY) */}
      <div className="flex items-center justify-between border-b border-border mb-6">
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'create' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {editingId ? 'Edit Product' : 'Create a New Product'}
          </button>
          <button 
            onClick={() => { setActiveTab('list'); handleCancelEdit(); }}
            className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'list' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Active Shop Catalog
          </button>
        </div>

        <a 
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand bg-brand/10 hover:bg-brand/20 rounded-xl transition-colors mb-2"
        >
          <Package className="w-3.5 h-3.5" />
          <span>Go to Orders Page &rarr;</span>
        </a>
      </div>

      {/* TAB 1: CREATE A NEW PRODUCT FULL-FORM PAGE */}
      {activeTab === 'create' && (
        <section className="animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="bg-brand text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                {editingId ? '✏️' : '1'}
              </span> 
              {editingId ? 'Edit Product' : 'Create a New Product'}
            </h2>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="text-muted-foreground">
                Cancel Edit
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 md:p-8 rounded-xl border border-border shadow-sm">
            <div className="space-y-5">
              {/* Product Name */}
              <div className="space-y-2">
                <Label>Product Name <span className="text-red-500">*</span></Label>
                <Input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="Enter product title..." 
                />
              </div>

              {/* Dynamic Category & Sport with Free-Form Input + Live Database Datalist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    list="dynamic-categories-datalist"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Jerseys, Footwear, Equipment, Accessories..."
                    className="h-10 text-sm"
                  />
                  <datalist id="dynamic-categories-datalist">
                    {dynamicCategories.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  <p className="text-[11px] text-muted-foreground">Type any custom category or pick from existing database items.</p>
                </div>

                <div className="space-y-2">
                  <Label>Sport</Label>
                  <Input
                    list="dynamic-sports-datalist"
                    value={formData.sport}
                    onChange={e => setFormData({ ...formData, sport: e.target.value })}
                    placeholder="e.g. Football, Cricket, Tennis, Multi-Sport..."
                    className="h-10 text-sm"
                  />
                  <datalist id="dynamic-sports-datalist">
                    {dynamicSports.map(s => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                  <p className="text-[11px] text-muted-foreground">Type any sport discipline or pick from existing options.</p>
                </div>
              </div>

              {/* Base Price & MRP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Selling Price (₹) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    step="0.01"
                    required 
                    value={formData.base_price} 
                    onChange={e => setFormData({ ...formData, base_price: e.target.value })} 
                    placeholder="e.g. 499" 
                  />
                  <p className="text-[11px] text-muted-foreground">The actual price charged to customer.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>MRP / Original Price (₹)</Label>
                    {formDiscount > 0 && (
                      <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">
                        {formDiscount}% OFF Preview
                      </span>
                    )}
                  </div>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.original_price} 
                    onChange={e => setFormData({ ...formData, original_price: e.target.value })} 
                    placeholder="Leave empty if no discount" 
                  />
                  <p className="text-[11px] text-muted-foreground">Optional original price to calculate dynamic discount badge.</p>
                </div>
              </div>

              {/* Badge & Real-Time Dynamic Rating Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Badge Pill</Label>
                  <Input 
                    list="dynamic-badges-datalist"
                    value={formData.badge} 
                    onChange={e => setFormData({ ...formData, badge: e.target.value })} 
                    placeholder="e.g. Best Value, Trending, Bestseller..." 
                  />
                  <datalist id="dynamic-badges-datalist">
                    {dynamicBadges.map(b => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                  <p className="text-[11px] text-muted-foreground">Marketing tag displayed on product cards.</p>
                </div>

                {/* Real-time Dynamic Customer Rating & Reviews Info */}
                <div className="space-y-1.5 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                      Live Customer Rating
                    </span>
                    <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      ⚡ Dynamic Real-Time
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-2xl font-black text-foreground">
                      {formData.rating ? `★ ${formData.rating}` : '★ Unrated'}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      ({formData.reviews_count || 0} {Number(formData.reviews_count) === 1 ? 'verified review' : 'verified reviews'})
                    </span>
                  </div>

                  <p className="text-[10px] text-muted-foreground font-medium">
                    Calculated automatically from employee & player purchases. Manual tampering disabled.
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Product Description</Label>
                <textarea 
                  value={formData.description_text}
                  onChange={e => setFormData({ ...formData, description_text: e.target.value })}
                  rows={3}
                  className="w-full border border-border rounded-md p-3 bg-background focus:ring-2 focus:ring-brand outline-none text-sm"
                  placeholder="Enter detailed description..."
                />
              </div>

              {/* Sizes & Key Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sizes / Fit Options</Label>
                  <Input 
                    value={formData.sizes} 
                    onChange={e => setFormData({ ...formData, sizes: e.target.value })} 
                    placeholder="Comma-separated: e.g. UK 7, UK 8 or S, M, L..." 
                  />
                  <p className="text-[11px] text-muted-foreground">Leave empty if product has no size options.</p>
                </div>

                <div className="space-y-2">
                  <Label>Key Highlights (One Per Line)</Label>
                  <textarea 
                    value={formData.features}
                    onChange={e => setFormData({ ...formData, features: e.target.value })}
                    rows={3}
                    className="w-full border border-border rounded-md p-2.5 bg-background focus:ring-2 focus:ring-brand outline-none text-xs"
                    placeholder="Enter key highlight bullet points (one per line)..."
                  />
                </div>
              </div>

              {/* Image Input & Preview */}
              <div className="space-y-3 pt-1">
                <Label>Product Image (URL or File Upload)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2">
                    <Input 
                      value={formData.image_url} 
                      onChange={e => {
                        const url = e.target.value
                        setFormData({ ...formData, image_url: url })
                        if (url) setImagePreview(url)
                      }} 
                      placeholder="Image URL: https://..." 
                    />
                    <Input 
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setImageFile(file)
                          setImagePreview(URL.createObjectURL(file))
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </div>

                  {imagePreview && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border bg-muted">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null)
                          setImageFile(null)
                          setFormData({ ...formData, image_url: '' })
                        }}
                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-card cursor-pointer hover:border-brand/50">
                  <input 
                    type="checkbox"
                    checked={formData.is_customizable}
                    onChange={e => setFormData({ ...formData, is_customizable: e.target.checked })}
                    className="w-4 h-4 accent-brand rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold block">3D Jersey Name & Number Stamping</span>
                    <span className="text-[11px] text-muted-foreground">Enables live visualizer in modal</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-card cursor-pointer hover:border-brand/50">
                  <input 
                    type="checkbox"
                    checked={formData.in_stock}
                    onChange={e => setFormData({ ...formData, in_stock: e.target.checked })}
                    className="w-4 h-4 accent-brand rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold block">In Stock</span>
                    <span className="text-[11px] text-muted-foreground">Available for immediate purchase</span>
                  </div>
                </label>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full bg-brand hover:bg-brand-hover text-white font-bold h-11 mt-6"
            >
              {isSubmitting ? 'Saving...' : (editingId ? 'Update Product' : 'Create Product')}
            </Button>
          </form>
        </section>
      )}

      {/* TAB 2: ACTIVE SHOP CATALOG (SHOWING EXACTLY 12 RECORDS PER PAGE) */}
      {activeTab === 'list' && (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="bg-brand text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span> 
              Active Shop Catalog ({filteredProducts.length})
            </h2>

            <Button
              onClick={() => { setActiveTab('create'); handleCancelEdit(); }}
              className="bg-brand hover:bg-brand-hover text-white text-xs font-bold h-9 px-4 rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          </div>

          {/* SEARCH & FILTER TOOLBAR */}
          <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search */}
              <div className="relative w-full sm:max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search products by title, category, sport, or badge..."
                  className="h-10 pl-9 pr-3 rounded-lg text-xs"
                />
              </div>

              {/* Dynamic Filters Derived From Live Catalog */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="h-10 px-3 rounded-md border border-border bg-background text-xs font-semibold focus:ring-2 focus:ring-brand outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {dynamicCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={selectedStockFilter}
                  onChange={(e) => setSelectedStockFilter(e.target.value as any)}
                  className="h-10 px-3 rounded-md border border-border bg-background text-xs font-semibold focus:ring-2 focus:ring-brand outline-none"
                >
                  <option value="ALL">All Stock Status</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold pt-1 border-t border-border">
              <span>
                Showing <strong className="text-foreground">{filteredProducts.length === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of{' '}
                <strong className="text-foreground">{filteredProducts.length}</strong> products (Page {currentPage} of {totalPages})
              </span>

              {(searchFilter || selectedCategoryFilter !== 'ALL' || selectedStockFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchFilter('')
                    setSelectedCategoryFilter('ALL')
                    setSelectedStockFilter('ALL')
                  }}
                  className="text-brand hover:underline font-bold text-xs"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* PRODUCTS GRID (12 RECORDS PER PAGE) */}
          {filteredProducts.length === 0 ? (
            <div className="bg-card p-10 text-center rounded-xl border border-border text-muted-foreground space-y-3">
              <p className="font-semibold text-sm">No products found matching your filter.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setActiveTab('create'); handleCancelEdit(); }}
                className="font-bold text-xs"
              >
                Create Product
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {currentProducts.map((p) => {
                const basePrice = parseFloat(p.base_price || '0')
                const originalPrice = p.original_price ? parseFloat(p.original_price) : null
                const imageUrl = p.image_url || p.image || ''
                const discount = originalPrice && originalPrice > basePrice
                  ? Math.round(((originalPrice - basePrice) / originalPrice) * 100)
                  : 0

                return (
                  <div
                    key={p.id}
                    className="bg-card border border-border hover:border-brand/50 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square w-full bg-muted overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/50 text-muted-foreground">
                          <ShoppingBag className="w-10 h-10 opacity-30" />
                        </div>
                      )}

                      {p.badge && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-brand text-white shadow-xs">
                          {p.badge}
                        </span>
                      )}

                      <span className={`absolute top-2 right-2 text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                        p.in_stock ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {p.in_stock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                          <span className="text-brand uppercase">
                            {p.category || 'Gear'} • {p.sport || 'Multi-Sport'}
                          </span>
                          {p.rating !== null && p.rating !== undefined ? (
                            <div className="flex items-center gap-1 text-amber-500 font-bold">
                              <Star className="w-3 h-3 fill-current" />
                              <span className="text-foreground">{p.rating}</span>
                              {Boolean(p.reviews_count && p.reviews_count > 0) && (
                                <span className="text-muted-foreground text-[10px]">({p.reviews_count})</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60 text-[10px]">Unrated</span>
                          )}
                        </div>

                        <h3 className="font-bold text-sm leading-snug line-clamp-2 text-foreground mb-1">
                          {p.name}
                        </h3>

                        {(p.display_description || p.description) && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {p.display_description || p.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border">
                        <div className="flex items-baseline justify-between mb-2">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-extrabold text-foreground">
                              ₹{basePrice.toLocaleString()}
                            </span>
                            {originalPrice && originalPrice > basePrice && (
                              <span className="text-xs line-through text-muted-foreground font-semibold">
                                ₹{originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                          {discount > 0 && (
                            <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1 py-0.5 rounded">
                              {discount}% OFF
                            </span>
                          )}
                        </div>

                        {p.is_customizable && (
                          <div className="mb-2">
                            <span className="text-[9px] font-bold uppercase bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> 3D Stamping
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(p)}
                            className="flex-1 h-8 text-xs font-semibold"
                          >
                            <Edit2 className="w-3 h-3 mr-1" /> Configure
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(p.id, p.name)}
                            className="h-8 px-2.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* PAGINATION CONTROLS (12 PER PAGE) */}
          {totalPages > 1 && (
            <div className="bg-card border border-border p-3 rounded-xl flex items-center justify-between gap-4 flex-wrap">
              <div className="text-xs text-muted-foreground font-semibold">
                Page <strong className="text-foreground">{currentPage}</strong> of <strong className="text-foreground">{totalPages}</strong>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1))
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="h-8 px-2.5 text-xs font-semibold"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => {
                      setCurrentPage(pg)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className={`w-8 h-8 rounded-md text-xs font-bold transition-colors ${
                      currentPage === pg
                        ? 'bg-brand text-white'
                        : 'border border-border bg-background hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {pg}
                  </button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="h-8 px-2.5 text-xs font-semibold"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
