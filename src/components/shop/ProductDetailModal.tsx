import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  X, Check, ShoppingBag, ShieldCheck, Star, Truck, 
  Sparkles, ArrowRight, MessageSquare, Trash2, Send, Lock, Award
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCartStore } from '@/store/useCartStore'
import { apiClient } from '@/api/apiClient'

interface ProductDetailModalProps {
  product: any | null
  onClose: () => void
  onBuyNow?: () => void
}

export default function ProductDetailModal({ product, onClose, onBuyNow }: ProductDetailModalProps) {
  const { items, addItem, setDrawerOpen } = useCartStore()

  // Tab State: 'details' | 'reviews'
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details')

  // Customization state for jerseys
  const [customName, setCustomName] = useState('PLAYER')
  const [customNumber, setCustomNumber] = useState('10')
  const [viewSide, setViewSide] = useState<'BACK' | 'FRONT'>('BACK')

  // Common purchase state
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [addedToast, setAddedToast] = useState(false)

  // Real-time Reviews & Rating State
  const [reviews, setReviews] = useState<any[]>([])
  const [ratingStats, setRatingStats] = useState<{ rating: number | null; reviews_count: number }>({
    rating: product?.rating ?? null,
    reviews_count: product?.reviews_count ?? 0,
  })
  const [breakdown, setBreakdown] = useState<Record<number, number>>({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 })
  const [userHasPurchased, setUserHasPurchased] = useState<boolean>(Boolean(product?.user_has_purchased))
  const [userReview, setUserReview] = useState<any>(product?.user_review || null)

  // Rating input state
  const [selectedStars, setSelectedStars] = useState<number>(5)
  const [hoverStars, setHoverStars] = useState<number>(0)
  const [reviewComment, setReviewComment] = useState<string>('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewMessage, setReviewMessage] = useState<{ text: string; isError: boolean } | null>(null)

  // Fetch real-time reviews from backend on mount or product change
  useEffect(() => {
    if (!product?.id) return

    setRatingStats({
      rating: product.rating ?? null,
      reviews_count: product.reviews_count ?? 0,
    })
    setUserHasPurchased(Boolean(product.user_has_purchased))
    if (product.user_review) {
      setUserReview(product.user_review)
      setSelectedStars(product.user_review.rating || 5)
      setReviewComment(product.user_review.comment || '')
    }

    const fetchRealTimeReviews = async () => {
      try {
        const res = await apiClient.get(`/v1/shop/products/${product.id}/reviews/`)
        const data = res.data
        if (data) {
          setReviews(data.reviews || [])
          setRatingStats({
            rating: data.rating ?? null,
            reviews_count: data.reviews_count ?? 0,
          })
          if (data.breakdown) setBreakdown(data.breakdown)
          if (data.has_purchased !== undefined) setUserHasPurchased(Boolean(data.has_purchased))
          if (data.user_review) {
            setUserReview(data.user_review)
            setSelectedStars(data.user_review.rating || 5)
            setReviewComment(data.user_review.comment || '')
          }
        }
      } catch (err) {
        console.error('Error fetching live product reviews:', err)
      }
    }

    fetchRealTimeReviews()
  }, [product?.id])

  if (!product) return null

  const isJersey = Boolean(product.is_customizable)
  const availableSizes: string[] = Array.isArray(product.sizes)
    ? product.sizes.filter(Boolean)
    : []

  const activeSize = selectedSize || (availableSizes.length > 0 ? availableSizes[0] : 'Standard')
  const basePrice = parseFloat(product.base_price || '0')
  const originalPrice = product.original_price ? parseFloat(product.original_price) : null
  const imageUrl = product.image_url || product.image || ''

  // Quantity already in gear bag
  const inBagItem = items.find(
    (i) => i.productId === product.id && (!isJersey || (i.customName === customName && i.customNumber === customNumber)) && i.size === activeSize
  )
  const inBagCount = inBagItem ? inBagItem.quantity : 0

  const broadcastUpdate = () => {
    try {
      const channel = new BroadcastChannel('turf_shop_channel')
      channel.postMessage({ type: 'PRODUCTS_UPDATED', timestamp: Date.now() })
      channel.close()
    } catch {}
    window.dispatchEvent(new CustomEvent('shop_products_updated', { detail: { timestamp: Date.now() } }))
  }

  const handleAddToCart = (openDrawer = true) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: basePrice,
      originalPrice: originalPrice ?? undefined,
      image: imageUrl,
      quantity: 1, // Quantity selection happens inside Add to Bag drawer and Buy Now
      customName: isJersey ? customName : undefined,
      customNumber: isJersey ? customNumber : undefined,
      size: activeSize,
      category: product.category,
      isCustomizable: isJersey,
    })

    setAddedToast(true)
    setTimeout(() => setAddedToast(false), 2000)

    if (openDrawer) {
      onClose()
      setDrawerOpen(true)
    }
  }

  const handleInstantBuy = () => {
    handleAddToCart(false)
    onClose()
    setDrawerOpen(true)
    if (onBuyNow) onBuyNow()
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingReview(true)
    setReviewMessage(null)

    try {
      const res = await apiClient.post(`/v1/shop/products/${product.id}/rate/`, {
        rating: selectedStars,
        comment: reviewComment.trim(),
      })

      const data = res.data
      setRatingStats({
        rating: data.rating,
        reviews_count: data.reviews_count,
      })
      setUserReview(data.review)
      setReviewMessage({
        text: userReview ? '✓ Review updated successfully in real-time!' : '🎉 Rating submitted successfully in real-time!',
        isError: false,
      })

      // Refresh reviews list
      const updatedList = await apiClient.get(`/v1/shop/products/${product.id}/reviews/`)
      if (updatedList.data) {
        setReviews(updatedList.data.reviews || [])
        if (updatedList.data.breakdown) setBreakdown(updatedList.data.breakdown)
      }

      broadcastUpdate()
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to submit review. Please try again.'
      setReviewMessage({ text: errMsg, isError: true })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const handleDeleteReview = async () => {
    if (!window.confirm('Are you sure you want to delete your review?')) return
    setIsSubmittingReview(true)
    try {
      const res = await apiClient.delete(`/v1/shop/products/${product.id}/delete_review/`)
      setRatingStats({
        rating: res.data.rating,
        reviews_count: res.data.reviews_count,
      })
      setUserReview(null)
      setReviewComment('')
      setSelectedStars(5)
      setReviewMessage({ text: 'Review removed successfully.', isError: false })

      // Refresh reviews list
      const updatedList = await apiClient.get(`/v1/shop/products/${product.id}/reviews/`)
      if (updatedList.data) {
        setReviews(updatedList.data.reviews || [])
        if (updatedList.data.breakdown) setBreakdown(updatedList.data.breakdown)
      }

      broadcastUpdate()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove review.')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const starDescriptions: Record<number, string> = {
    1: '1 Star - Needs Improvement',
    2: '2 Stars - Fair',
    3: '3 Stars - Average',
    4: '4 Stars - Very Good',
    5: '5 Stars - Outstanding Pro Gear!',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="bg-card border-2 border-border rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 relative my-6 max-h-[92vh] flex flex-col md:grid"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shadow-md hover:scale-105"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT COLUMN: VISUAL STUDIO / PRODUCT SHOWCASE */}
        <div className="bg-muted/40 p-6 md:p-8 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-border min-h-[340px] md:min-h-[480px]">
          {isJersey ? (
            /* INTERACTIVE LIVE JERSEY STUDIO */
            <div className="w-full flex flex-col items-center">
              {/* Front / Back Toggle */}
              <div className="flex gap-2 mb-6 bg-background/90 backdrop-blur-md p-1.5 rounded-2xl border border-border shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewSide('BACK')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                    viewSide === 'BACK'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Back (Name & Number)
                </button>
                <button
                  type="button"
                  onClick={() => setViewSide('FRONT')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                    viewSide === 'FRONT'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Front View
                </button>
              </div>

              {/* 3D/SVG Jersey Visualizer */}
              <div className="relative w-64 h-80 sm:w-72 sm:h-96 flex items-center justify-center">
                {viewSide === 'BACK' ? (
                  <div
                    className="relative w-64 h-80 rounded-t-[40px] rounded-b-2xl shadow-2xl flex flex-col items-center justify-center overflow-hidden border-4 border-emerald-700/40"
                    style={{
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)',
                      clipPath: 'polygon(15% 0%, 85% 0%, 100% 20%, 100% 100%, 0% 100%, 0% 20%)',
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-4 bg-amber-400/30" />
                    <div className="absolute -left-6 top-0 w-12 h-24 bg-blue-900 rounded-l-3xl transform -rotate-12" />
                    <div className="absolute -right-6 top-0 w-12 h-24 bg-blue-900 rounded-r-3xl transform rotate-12" />

                    <div
                      className="text-white font-black text-2xl tracking-[0.25em] uppercase text-center mt-[-20px] px-2"
                      style={{
                        textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
                      }}
                    >
                      {customName || 'YOUR NAME'}
                    </div>

                    <div
                      className="text-amber-400 font-black text-8xl mt-3 select-none"
                      style={{
                        textShadow: '4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                        fontFamily: 'impact, sans-serif',
                      }}
                    >
                      {customNumber || '00'}
                    </div>

                    <div className="absolute bottom-3 text-[10px] font-black uppercase text-white/50 tracking-widest">
                      TURFARENA PRO
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full rounded-3xl overflow-hidden border border-border shadow-lg bg-background flex items-center justify-center">
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain p-4"
                    />
                  </div>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground font-bold mt-4 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Live Stamping Preview • Sublimated Anti-Fade Print
              </p>
            </div>
          ) : (
            /* STANDARD EQUIPMENT SHOWCASE */
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="w-full max-w-sm aspect-square rounded-3xl overflow-hidden bg-background border border-border shadow-lg p-4 flex items-center justify-center relative group">
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-300"
                />
                {product.badge && (
                  <span className="absolute top-4 left-4 px-3 py-1 bg-emerald-600 text-white font-black text-xs rounded-full uppercase tracking-wider shadow-md">
                    {product.badge}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 mt-6 text-xs text-muted-foreground font-bold justify-center">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> 100% Authentic Turf Certified
                </span>
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-500" /> Dispatched within 24h
                </span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SPECS, CUSTOMIZATION & BUY CONTROLS */}
        <div className="p-6 md:p-8 flex flex-col justify-between overflow-y-auto max-h-[85vh] space-y-5">
          <div>
            {/* Category & REAL-TIME Dynamic Rating Header */}
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                {product.category || 'Gear'} • {product.sport || 'Multi-Sport'}
              </span>

              {/* Dynamic Real-Time Rating Badge */}
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-amber-500 cursor-pointer"
                title="View customer feedback & ratings"
              >
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                {ratingStats.rating !== null ? (
                  <>
                    <span className="text-foreground font-black text-sm">{ratingStats.rating}</span>
                    <span className="text-muted-foreground font-semibold">
                      ({ratingStats.reviews_count} {ratingStats.reviews_count === 1 ? 'review' : 'reviews'})
                    </span>
                  </>
                ) : (
                  <span className="text-foreground font-bold text-xs">
                    ★ Unrated ({ratingStats.reviews_count} reviews)
                  </span>
                )}
              </button>
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2 leading-tight">
              {product.name}
            </h2>

            {/* Price section */}
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{basePrice.toLocaleString()}
              </span>
              {originalPrice && originalPrice > basePrice && (
                <>
                  <span className="text-lg line-through text-muted-foreground font-bold">
                    ₹{originalPrice.toLocaleString()}
                  </span>
                  <span className="text-xs bg-red-500/10 text-red-500 border border-red-500/20 font-black px-2 py-0.5 rounded-md">
                    {Math.round(((originalPrice - basePrice) / originalPrice) * 100)}% OFF
                  </span>
                </>
              )}
            </div>

            {/* TAB SELECTOR: Specs vs Customer Reviews */}
            <div className="flex gap-2 border-b border-border pb-2 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`pb-1 text-xs font-black uppercase tracking-wider transition-all relative ${
                  activeTab === 'details'
                    ? 'text-emerald-600 dark:text-emerald-400 after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-emerald-500'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Overview & Specs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`pb-1 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 relative ${
                  activeTab === 'reviews'
                    ? 'text-emerald-600 dark:text-emerald-400 after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-emerald-500'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Verified Reviews ({ratingStats.reviews_count})
              </button>
            </div>

            {/* TAB CONTENT: DETAILS & SPECS */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {(product.display_description || product.description) && (
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-medium">
                    {product.display_description || product.description}
                  </p>
                )}

                {/* JERSEY CUSTOMIZATION INPUTS */}
                {isJersey && (
                  <div className="space-y-3 p-4 rounded-2xl bg-muted/40 border border-border">
                    <p className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Kit Personalization
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px] font-bold text-muted-foreground">Jersey Back Name</Label>
                        <Input
                          maxLength={12}
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value.toUpperCase())}
                          placeholder="e.g. RONALDO"
                          className="h-10 text-sm font-black uppercase mt-1 rounded-xl"
                        />
                      </div>

                      <div>
                        <Label className="text-[11px] font-bold text-muted-foreground">Jersey Number (0-99)</Label>
                        <Input
                          maxLength={2}
                          value={customNumber}
                          onChange={(e) => setCustomNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 10"
                          className="h-10 text-sm font-black mt-1 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SIZE SELECTOR */}
                {availableSizes.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Select Size / Fit</span>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedSize(s)}
                          className={`min-w-12 h-10 px-3 rounded-xl font-black text-sm border transition-all ${
                            activeSize === s
                              ? 'border-emerald-500 bg-emerald-600 text-white shadow-md'
                              : 'border-border bg-background hover:bg-muted text-foreground'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* KEY HIGHLIGHTS */}
                {product.features && product.features.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    <p className="font-bold text-muted-foreground uppercase">Key Highlights</p>
                    <div className="grid grid-cols-2 gap-2">
                      {product.features.map((feat: string, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 text-foreground font-semibold">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: REAL-TIME VERIFIED REVIEWS */}
            {activeTab === 'reviews' && (
              <div className="space-y-5">
                {/* Score Summary Box */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-foreground">
                        {ratingStats.rating !== null ? ratingStats.rating : '—'}
                      </span>
                      <span className="text-xs text-muted-foreground font-bold">/ 5.0</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            (ratingStats.rating || 0) >= star
                              ? 'fill-current text-amber-500'
                              : (ratingStats.rating || 0) >= star - 0.5
                              ? 'fill-amber-300 text-amber-500'
                              : 'text-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-semibold mt-1">
                      Based on {ratingStats.reviews_count} real-time feedback {ratingStats.reviews_count === 1 ? 'submission' : 'submissions'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <Award className="w-3.5 h-3.5" /> 100% Verified Purchases
                    </span>
                  </div>
                </div>

                {/* Star Breakdown Progress Bars */}
                {ratingStats.reviews_count > 0 && (
                  <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/80 space-y-1.5">
                    <p className="text-[11px] font-black uppercase text-muted-foreground tracking-wider mb-1">
                      Rating Breakdown
                    </p>
                    {[5, 4, 3, 2, 1].map((s) => {
                      const count = breakdown[s] || 0
                      const pct = ratingStats.reviews_count > 0 ? (count / ratingStats.reviews_count) * 100 : 0
                      return (
                        <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
                          <span className="w-6 text-right flex items-center justify-end gap-0.5">
                            {s}<Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                          </span>
                          <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-6 text-right text-[11px] text-foreground font-semibold">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* RATE PRODUCT SECTION */}
                {userHasPurchased ? (
                  <form onSubmit={handleSubmitReview} className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        {userReview ? 'Your Real-Time Review (Edit)' : 'Rate this Product as Verified Buyer'}
                      </p>
                      {userReview && (
                        <button
                          type="button"
                          onClick={handleDeleteReview}
                          className="text-[11px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>

                    {/* Interactive 5 Star Picker */}
                    <div className="flex items-center gap-1.5 py-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setSelectedStars(star)}
                          onMouseEnter={() => setHoverStars(star)}
                          onMouseLeave={() => setHoverStars(0)}
                          className="p-1 hover:scale-125 transition-transform"
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              (hoverStars || selectedStars) >= star
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-muted-foreground ml-2">
                        {starDescriptions[hoverStars || selectedStars]}
                      </span>
                    </div>

                    <div>
                      <Input
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Write your honest feedback on durability, comfort, or performance..."
                        className="h-10 text-xs rounded-xl bg-background"
                      />
                    </div>

                    {reviewMessage && (
                      <p className={`text-xs font-bold ${reviewMessage.isError ? 'text-red-500' : 'text-emerald-500'}`}>
                        {reviewMessage.text}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSubmittingReview ? 'Syncing...' : userReview ? 'Update Real-Time Rating' : 'Post Verified Rating'}
                    </Button>
                  </form>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground font-semibold">
                        Purchase this product to leave a real-time verified review.
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleInstantBuy}
                      className="rounded-xl h-8 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Buy Now
                    </Button>
                  </div>
                )}

                {/* REVIEWS LIST */}
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {reviews.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-xs font-semibold">
                      No reviews posted yet. Be the first verified buyer to rate this product!
                    </div>
                  ) : (
                    reviews.map((rev) => (
                      <div key={rev.id} className="p-3 rounded-2xl bg-muted/30 border border-border space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-foreground">
                              {rev.user_name || 'Verified Buyer'}
                            </span>
                            {rev.verified_purchase && (
                              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Verified Buyer
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  rev.rating >= s ? 'fill-current text-amber-500' : 'text-muted-foreground/30'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {rev.comment && (
                          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                            "{rev.comment}"
                          </p>
                        )}

                        <p className="text-[10px] text-muted-foreground/70">
                          {new Date(rev.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM CONTROLS: ADD TO BAG & BUY NOW (QUANTITY IS MANAGED HERE & IN DRAWER) */}
          <div className="pt-4 border-t border-border space-y-3">
            {addedToast && (
              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 text-center animate-bounce">
                ✓ Added to your gear bag! Quantity adjustable in bag.
              </p>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => handleAddToCart(true)}
                className="flex-1 h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform"
              >
                <ShoppingBag className="w-5 h-5" />
                {inBagCount > 0 ? `Add to Bag (${inBagCount} in Bag)` : 'Add to Bag'}
              </Button>

              <Button
                variant="outline"
                onClick={handleInstantBuy}
                className="flex-1 h-13 rounded-2xl font-black text-base border-2 border-border hover:border-emerald-500 flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform"
              >
                Buy Now <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex justify-between items-center text-[11px] text-muted-foreground font-bold pt-1">
              <span>🏟️ Venue pickup free</span>
              <span>🔄 7-day match exchange</span>
              <span>🔒 100% secure Razorpay</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
