import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ShoppingBag, Search, Heart, Star, Sparkles, Truck, Tag, Check, 
  RotateCcw, Flame, X, Eye, Package
} from 'lucide-react'
import { apiClient } from '@/api/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/store/useCartStore'
import CartDrawer from '@/components/shop/CartDrawer'
import ProductDetailModal from '@/components/shop/ProductDetailModal'

export default function PlayerShop() {
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedSport, setSelectedSport] = useState('All Sports')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [priceRange, setPriceRange] = useState<'ALL' | 'UNDER_1000' | '1000_2500' | 'ABOVE_2500'>('ALL')
  const [sortBy, setSortBy] = useState<'FEATURED' | 'PRICE_LOW' | 'PRICE_HIGH' | 'RATING'>('FEATURED')

  // Wishlist State
  const [wishlist, setWishlist] = useState<string[]>([])
  const [copiedCode, setCopiedCode] = useState(false)

  // Cart store
  const { toggleDrawer, getTotalItemsCount, addItem } = useCartStore()
  const cartItemsCount = getTotalItemsCount()

  // 1. Live Fetch from Backend Database
  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/v1/shop/products/')
      const data = res.data.results || res.data || []
      setProducts(data)

      // Real-time synchronization: if customer has a modal open, live-update its specs
      setSelectedProduct((prev: any) => {
        if (!prev) return null
        const updated = data.find((p: any) => p.id === prev.id)
        return updated || prev
      })
    } catch (err) {
      console.error("Failed to fetch products", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Real-time synchronization: BroadcastChannel + custom event + short polling + focus re-validation
  useEffect(() => {
    fetchProducts()

    // Cross-tab real-time sync
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('turf_shop_channel')
      channel.onmessage = () => {
        fetchProducts()
      }
    } catch {}

    const handleUpdate = () => fetchProducts()
    window.addEventListener('shop_products_updated', handleUpdate)
    window.addEventListener('focus', handleUpdate)

    // Short polling interval (3 seconds) for background updates across clients
    const pollInterval = setInterval(fetchProducts, 3000)

    return () => {
      if (channel) channel.close()
      window.removeEventListener('shop_products_updated', handleUpdate)
      window.removeEventListener('focus', handleUpdate)
      clearInterval(pollInterval)
    }
  }, [])

  // Wishlist toggle
  const toggleWishlist = (id: string | number) => {
    const strId = id.toString()
    setWishlist(prev => 
      prev.includes(strId) ? prev.filter(item => item !== strId) : [...prev, strId]
    )
  }

  // Copy promo code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  // 2. Dynamically derive categories and sports from LIVE database products
  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach(p => {
      if (p.category) cats.add(p.category)
    })
    return ['All', ...Array.from(cats)]
  }, [products])

  const dynamicSports = useMemo(() => {
    const sports = new Set<string>()
    products.forEach(p => {
      if (p.sport) sports.add(p.sport)
    })
    return ['All Sports', ...Array.from(sports)]
  }, [products])

  // 3. Real-time Filter & Sort computation
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = p.name?.toLowerCase().includes(q)
        const matchesDesc = (p.display_description || p.description || '').toLowerCase().includes(q)
        const matchesCategory = p.category?.toLowerCase().includes(q)
        if (!matchesName && !matchesDesc && !matchesCategory) return false
      }

      // Category
      if (selectedCategory !== 'All' && p.category !== selectedCategory) {
        return false
      }

      // Sport
      if (selectedSport !== 'All Sports' && p.sport !== selectedSport) {
        return false
      }

      // Stock
      if (inStockOnly && !p.in_stock) {
        return false
      }

      // Price
      const price = parseFloat(p.base_price || '0')
      if (priceRange === 'UNDER_1000' && price >= 1000) return false
      if (priceRange === '1000_2500' && (price < 1000 || price > 2500)) return false
      if (priceRange === 'ABOVE_2500' && price <= 2500) return false

      return true
    }).sort((a, b) => {
      const priceA = parseFloat(a.base_price || '0')
      const priceB = parseFloat(b.base_price || '0')
      const ratingA = a.rating ? parseFloat(a.rating) : 0
      const ratingB = b.rating ? parseFloat(b.rating) : 0

      if (sortBy === 'PRICE_LOW') return priceA - priceB
      if (sortBy === 'PRICE_HIGH') return priceB - priceA
      if (sortBy === 'RATING') return ratingB - ratingA
      return 0 // FEATURED (natural order)
    })
  }, [products, searchQuery, selectedCategory, selectedSport, inStockOnly, priceRange, sortBy])

  const handleQuickAdd = (p: any, e: React.MouseEvent) => {
    e.stopPropagation()
    const basePrice = parseFloat(p.base_price || '0')
    const originalPrice = p.original_price ? parseFloat(p.original_price) : undefined
    const imageUrl = p.image_url || p.image || ''
    const size = (Array.isArray(p.sizes) && p.sizes.length > 0) ? p.sizes[0] : 'Standard'

    addItem({
      productId: p.id,
      name: p.name,
      price: basePrice,
      originalPrice: originalPrice,
      image: imageUrl,
      quantity: 1,
      size: size,
      category: p.category,
      isCustomizable: false,
    })
  }

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedCategory('All')
    setSelectedSport('All Sports')
    setInStockOnly(false)
    setPriceRange('ALL')
    setSortBy('FEATURED')
  }

  return (
    <div className="pb-24 bg-background min-h-screen text-foreground">
      {/* TOP PRO SHOP BAR */}
      <div className="bg-card/70 backdrop-blur-md border-b border-border py-6 px-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
                TurfArena Pro Shop
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Official Match Store
                </span>
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm font-medium">
                Official team kits, turf studs, heavy match balls & customized jerseys.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {/* Track Orders Button */}
            <Link to="/orders">
              <Button
                variant="outline"
                className="h-12 px-5 rounded-2xl border-border bg-card hover:bg-muted font-bold text-xs flex items-center gap-2 transition-transform active:scale-95"
              >
                <Package className="w-4 h-4 text-brand" />
                <span>My Orders</span>
              </Button>
            </Link>

            {/* View Bag Button */}
            <Button
              onClick={toggleDrawer}
              className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/25 flex items-center gap-2.5 relative transition-transform active:scale-95"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Gear Bag</span>
              {cartItemsCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-white text-emerald-700 text-xs font-black">
                  {cartItemsCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* HERO PROMOTIONAL BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand via-emerald-500 to-teal-500 text-white p-8 md:p-12 shadow-xl border border-white/20">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/15 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 text-xs font-black uppercase tracking-widest">
              <Flame className="w-3.5 h-3.5 fill-current text-yellow-300" /> Turf League Mega Season Deals
            </div>

            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Wear Your Colors.<br />Dominate The Turf.
            </h2>

            <p className="text-sm md:text-base text-white/90 font-medium">
              Custom player jerseys with your name & number, professional turf studs, and match balls. Delivered directly to your turf venue or doorstep.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleCopyCode('TURFPRO10')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-xs font-bold transition-colors cursor-pointer text-white"
              >
                <Tag className="w-4 h-4 text-yellow-300" />
                <span>Code: <strong className="text-white">TURFPRO10</strong> (10% OFF)</span>
                {copiedCode ? <Check className="w-3.5 h-3.5 text-yellow-300" /> : <span className="text-[10px] opacity-80">Click to copy</span>}
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-white/95">
                <Truck className="w-4 h-4 text-yellow-300" /> Free Venue Pickup Desk
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH, CATEGORY & FACET FILTER ENGINE */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
          {/* Search bar & quick filter bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search jerseys, studs, cricket bats, balls, gloves..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 pr-10 rounded-2xl bg-muted/50 font-bold text-sm border-border"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <span className="text-xs font-bold text-muted-foreground uppercase shrink-0">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-11 px-4 rounded-xl border border-border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="FEATURED">Featured / Recommended</option>
                <option value="PRICE_LOW">Price: Low to High</option>
                <option value="PRICE_HIGH">Price: High to Low</option>
                <option value="RATING">Highest Customer Rating</option>
              </select>
            </div>
          </div>

          {/* Dynamic Category Tabs */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
            {dynamicCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Secondary Facet Filters: Sport, Price Brackets, Stock */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/40 text-xs">
            {/* Sport Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-muted-foreground uppercase text-[11px]">Sport:</span>
              {dynamicSports.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setSelectedSport(sp)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    selectedSport === sp
                      ? 'bg-foreground text-background shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>

            {/* Price Brackets & Stock */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl">
                {[
                  { id: 'ALL', label: 'All Prices' },
                  { id: 'UNDER_1000', label: '< ₹1k' },
                  { id: '1000_2500', label: '₹1k - ₹2.5k' },
                  { id: 'ABOVE_2500', label: '₹2.5k+' },
                ].map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => setPriceRange(pr.id as any)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      priceRange === pr.id
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {pr.label}
                  </button>
                ))}
              </div>

              {/* In Stock toggle */}
              <label className="flex items-center gap-2 cursor-pointer font-bold text-muted-foreground hover:text-foreground select-none">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <span>In Stock Only</span>
              </label>
            </div>
          </div>
        </div>

        {/* RESULTS HEADER & COUNTER */}
        <div className="flex justify-between items-center text-xs text-muted-foreground font-bold px-1">
          <span>
            Showing <strong className="text-foreground">{filteredProducts.length}</strong> of{' '}
            <strong className="text-foreground">{products.length}</strong> merchandise items
          </span>

          {(selectedCategory !== 'All' || selectedSport !== 'All Sports' || inStockOnly || priceRange !== 'ALL' || searchQuery) && (
            <button
              onClick={resetFilters}
              className="text-emerald-500 hover:text-emerald-600 flex items-center gap-1 font-bold underline"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset all filters
            </button>
          )}
        </div>

        {/* PRODUCT GRID */}
        {isLoading ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-lg font-bold animate-pulse text-muted-foreground">
              Loading TurfArena Pro Gear...
            </h3>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center bg-card border border-border rounded-3xl p-8 space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground/60">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black">No merchandise matched your filters</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try adjusting your search query, price bracket, or category to discover more gear.
            </p>
            <Button
              onClick={resetFilters}
              variant="outline"
              className="rounded-xl font-bold border-border"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p) => {
              const basePrice = parseFloat(p.base_price || '0')
              const originalPrice = p.original_price ? parseFloat(p.original_price) : null
              const imageUrl = p.image_url || p.image || ''
              const isJersey = Boolean(p.is_customizable)
              const isWishlisted = wishlist.includes(p.id.toString())

              return (
                <motion.div
                  key={p.id}
                  layout
                  whileHover={{ y: -6 }}
                  onClick={() => setSelectedProduct(p)}
                  className="bg-card border-2 border-border/80 hover:border-emerald-500/50 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
                >
                  {/* Image Container with Badges */}
                  <div className="relative aspect-square w-full bg-muted overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted/60 text-muted-foreground">
                        <ShoppingBag className="w-12 h-12 opacity-30" />
                      </div>
                    )}

                    {/* Gradient Overlay for badges */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Badge */}
                    {p.badge && (
                      <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-md">
                        {p.badge}
                      </span>
                    )}

                    {/* Wishlist Heart Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleWishlist(p.id)
                      }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors shadow-sm"
                    >
                      <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>

                    {/* Quick View Button on Hover */}
                    <div className="absolute bottom-3 inset-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-background/90 backdrop-blur-md text-foreground text-xs font-black py-2 rounded-xl text-center shadow-lg flex items-center justify-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-emerald-500" />
                        {isJersey ? 'Customize Kit' : 'View Specifications'}
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Category & Rating Row */}
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider">
                          {p.category || 'Gear'}
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
                          <span className="text-muted-foreground/70 text-[10px] font-bold">★ New</span>
                        )}
                      </div>

                      {/* Product Name */}
                      <h3 className="font-black text-base text-foreground leading-snug line-clamp-2 mb-2 group-hover:text-emerald-600 transition-colors">
                        {p.name}
                      </h3>

                      {/* Snippet */}
                      {(p.display_description || p.description) && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 font-medium leading-relaxed">
                          {p.display_description || p.description}
                        </p>
                      )}
                    </div>

                    {/* Pricing & CTA Row */}
                    <div>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-xl font-black text-foreground">
                          ₹{basePrice.toLocaleString()}
                        </span>
                        {originalPrice && originalPrice > basePrice && (
                          <>
                            <span className="text-xs line-through text-muted-foreground font-bold">
                              ₹{originalPrice.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                              {Math.round(((originalPrice - basePrice) / originalPrice) * 100)}% OFF
                            </span>
                          </>
                        )}
                      </div>

                      {/* Button Action */}
                      {isJersey ? (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedProduct(p)
                          }}
                          className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Customize & Buy
                        </Button>
                      ) : (
                        <Button
                          onClick={(e) => handleQuickAdd(p, e)}
                          variant="outline"
                          className="w-full h-11 rounded-xl font-black text-xs border-2 border-border hover:border-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center gap-1.5"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" /> Quick Add to Bag
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* PRODUCT DETAIL & JERSEY CUSTOMIZER MODAL */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* INTERACTIVE CART DRAWER */}
      <CartDrawer />
    </div>
  )
}
