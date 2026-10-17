import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Package, Truck, MapPin, Clock, CheckCircle2, 
  XCircle, ChevronRight, Search, RotateCcw, Copy, Check, ArrowRight,
  ShieldCheck, ChevronLeft, ShoppingBag, Printer
} from 'lucide-react'
import { apiClient } from '@/api/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface OrderItem {
  id: string
  product_name: string
  product_price: string | number
  product_image?: string
  quantity: number
  custom_name?: string
  custom_number?: string
  size?: string
}

interface TimelineStep {
  key: string
  title: string
  description: string
  timestamp?: string
  completed: boolean
  current: boolean
}

interface Order {
  id: string
  total_amount: string | number
  status: string
  created_at: string
  updated_at: string
  delivery_type: 'VENUE_PICKUP' | 'HOME_DELIVERY'
  shipping_address: string
  carrier: string
  tracking_number: string
  estimated_delivery?: string
  tracking_notes?: string
  items: OrderItem[]
  items_count: number
  tracking_timeline: TimelineStep[]
}

export default function PlayerOrders() {
  const [searchParams] = useSearchParams()
  const highlightedId = searchParams.get('highlight')

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  // Filters & Pagination State
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 10 // STRICT REQUIREMENT: Only show 10 records per page

  const broadcastOrderUpdate = (type: string, data?: any) => {
    try {
      const channel = new BroadcastChannel('turf_orders_channel')
      channel.postMessage({ type, data, timestamp: Date.now() })
      channel.close()
    } catch {}
    window.dispatchEvent(new CustomEvent('turf_orders_updated', { detail: { type, data, timestamp: Date.now() } }))
  }

  const fetchOrders = async (page = currentPage, isBackground = false) => {
    try {
      if (!isBackground) setLoading(true)
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('page_size', pageSize.toString())
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())

      const res = await apiClient.get(`/v1/shop/orders/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = res.data
      const results = data.results || []
      setOrders(results)
      setTotalPages(data.total_pages || Math.ceil((data.count || results.length) / pageSize) || 1)
      setTotalCount(data.count || results.length)

      // If highlighted or selected order is open, update its details
      if (highlightedId) {
        const found = results.find((o: Order) => o.id === highlightedId || o.id.startsWith(highlightedId))
        if (found) setSelectedOrder(found)
      } else if (selectedOrder) {
        const updated = results.find((o: Order) => o.id === selectedOrder.id)
        if (updated) setSelectedOrder(updated)
      } else if (results.length > 0 && !selectedOrder) {
        setSelectedOrder(results[0])
      }
    } catch (err) {
      console.error('Failed to load orders', err)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders(1)
    setCurrentPage(1)
  }, [statusFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(1)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    fetchOrders(currentPage)
  }, [currentPage])

  // Real-Time Listeners: BroadcastChannel + Custom Event + Window Focus + Polling
  useEffect(() => {
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('turf_orders_channel')
      channel.onmessage = () => {
        fetchOrders(currentPage, true)
      }
    } catch {}

    const handleRealTimeSync = () => {
      fetchOrders(currentPage, true)
    }

    window.addEventListener('turf_orders_updated', handleRealTimeSync)
    window.addEventListener('focus', handleRealTimeSync)

    // Background 4s live tracking interval
    const interval = setInterval(() => {
      fetchOrders(currentPage, true)
    }, 4000)

    return () => {
      if (channel) channel.close()
      window.removeEventListener('turf_orders_updated', handleRealTimeSync)
      window.removeEventListener('focus', handleRealTimeSync)
      clearInterval(interval)
    }
  }, [currentPage, statusFilter, searchQuery])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    try {
      setIsCancelling(true)
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      await apiClient.post(`/v1/shop/orders/${orderId}/cancel_order/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      broadcastOrderUpdate('ORDER_CANCELLED', { orderId })
      alert('Your order has been cancelled.')
      fetchOrders(currentPage, true)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel order.')
    } finally {
      setIsCancelling(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        )
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Truck className="w-3.5 h-3.5 animate-pulse" /> {status === 'OUT_FOR_DELIVERY' ? 'Out for Delivery' : 'In Transit'}
          </span>
        )
      case 'CONFIRMED':
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Package className="w-3.5 h-3.5" /> Confirmed & Packing
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Verification Pending
          </span>
        )
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand uppercase tracking-wider mb-1">
            <ShoppingBag className="w-4 h-4" /> TurfArena Official Merchandise
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            My Orders & Delivery Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track real-time shipment milestones, courier waybills, and order status updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black">Live Tracking</span>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchOrders(currentPage)}
            className="rounded-xl border-border hover:bg-muted font-bold text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Link to="/shop">
            <Button size="sm" className="bg-brand text-white hover:bg-brand-hover rounded-xl font-bold text-xs shadow-md">
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Continue Shopping
            </Button>
          </Link>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {st === 'ALL' ? 'All Orders' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by Order ID, item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl bg-background border-border"
          />
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-12 h-12 border-3 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-muted-foreground">Loading your orders & live tracking...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground">No Orders Found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No orders match your filter criteria.'
                : "You haven't placed any merchandise orders yet."}
            </p>
          </div>
          <Link to="/shop">
            <Button className="bg-brand text-white hover:bg-brand-hover rounded-xl text-xs font-bold px-6">
              Browse Pro Shop
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: ORDERS LIST (10 records per page) */}
          <div className={selectedOrder ? "lg:col-span-5 space-y-3" : "lg:col-span-12 space-y-3"}>
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase text-muted-foreground">
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} Orders
              </span>
              <span className="text-[11px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-md">
                10 records per page
              </span>
            </div>

            <div className="space-y-3">
              {orders.map((order) => {
                const isSelected = selectedOrder?.id === order.id
                return (
                  <motion.div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-card border-brand shadow-md ring-2 ring-brand/10'
                        : 'bg-card border-border hover:border-brand/40 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-foreground">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-semibold mt-1">
                          Placed on {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-sm text-foreground">
                          ₹{Number(order.total_amount).toLocaleString()}
                        </span>
                        <p className="text-[10px] text-muted-foreground font-semibold">
                          {order.items_count} {order.items_count === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>

                    {/* Preview Items Thumbnails */}
                    <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
                      <div className="flex items-center -space-x-2 overflow-hidden">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <div
                            key={idx}
                            className="w-8 h-8 rounded-lg bg-muted border-2 border-card overflow-hidden flex items-center justify-center shrink-0"
                            title={item.product_name}
                          >
                            {item.product_image ? (
                              <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="w-8 h-8 rounded-lg bg-muted border-2 border-card flex items-center justify-center text-[10px] font-black text-muted-foreground shrink-0">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-brand">
                        <span>Track</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Pagination Controls (Strict 10 Records Per Page) */}
            {totalPages > 1 && (
              <div className="pt-2 flex items-center justify-between bg-card p-3 rounded-2xl border border-border text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="rounded-xl h-8 px-3 font-bold"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                </Button>

                <div className="flex items-center gap-1 font-bold">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-black transition-colors ${
                        currentPage === p
                          ? 'bg-brand text-white shadow-sm'
                          : 'hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="rounded-xl h-8 px-3 font-bold"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: LIVE DELIVERY TRACKER & ORDER DETAILS */}
          {selectedOrder && (
            <div className="lg:col-span-7 lg:sticky lg:top-4 bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm space-y-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
              {/* Tracker Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-foreground">
                      Order #{selectedOrder.id.slice(0, 8).toUpperCase()}
                    </h2>
                    <button
                      onClick={() => copyToClipboard(selectedOrder.id, 'oid')}
                      className="text-muted-foreground hover:text-foreground p-1"
                      title="Copy full Order ID"
                    >
                      {copiedId === 'oid' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Placed on {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedOrder.status)}
                  {selectedOrder.status === 'PENDING' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isCancelling}
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 text-xs font-bold"
                    >
                      Cancel Order
                    </Button>
                  )}
                </div>
              </div>

              {/* LIVE SHIPMENT STATUS STEPPER */}
              <div className="bg-muted/40 p-5 md:p-6 rounded-2xl border border-border/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Truck className="w-4 h-4 text-brand" /> Live Delivery Stepper
                  </h3>
                  {selectedOrder.carrier && (
                    <span className="text-xs font-bold text-muted-foreground">
                      Via <strong className="text-foreground">{selectedOrder.carrier}</strong>
                    </span>
                  )}
                </div>

                {/* Waybill / Tracking Box */}
                {selectedOrder.tracking_number && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border text-xs">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-brand" />
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Tracking Waybill Number</p>
                        <p className="font-mono font-black text-foreground">{selectedOrder.tracking_number}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(selectedOrder.tracking_number, 'trk')}
                      className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-[11px] font-bold text-foreground flex items-center gap-1 transition-colors"
                    >
                      {copiedId === 'trk' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Vertical Timeline Steps */}
                <div className="space-y-4 pt-2">
                  {(selectedOrder.tracking_timeline || []).map((step, idx) => {
                    const isLast = idx === (selectedOrder.tracking_timeline?.length || 0) - 1
                    return (
                      <div key={step.key} className="relative flex items-start gap-3">
                        {!isLast && (
                          <div 
                            className={`absolute left-3.5 top-7 bottom-0 w-0.5 ${
                              step.completed ? 'bg-emerald-500' : 'bg-border'
                            }`} 
                          />
                        )}
                        <div 
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 font-black text-xs ${
                            step.completed
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : step.current
                              ? 'bg-brand text-white animate-pulse shadow-sm'
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}
                        >
                          {step.completed ? <Check className="w-4 h-4" /> : idx + 1}
                        </div>

                        <div className="flex-1 pb-3">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-black ${step.completed || step.current ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {step.title}
                            </h4>
                            {step.timestamp && (
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                {new Date(step.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Delivery Details Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-brand" /> 
                    {selectedOrder.delivery_type === 'VENUE_PICKUP' ? 'Pickup Location' : 'Courier Destination'}
                  </span>
                  <p className="text-xs font-bold text-foreground">
                    {selectedOrder.delivery_type === 'VENUE_PICKUP' ? 'Turf Venue Pickup Desk' : 'Home Delivery'}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {selectedOrder.shipping_address || 'Turf Arena Front Desk'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand" /> Authenticated Fulfillment
                  </span>
                  <p className="text-xs font-bold text-foreground">
                    Official TurfArena Logistics
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    All items are inspected, verified for quality, and backed by TurfArena warranty.
                  </p>
                </div>
              </div>

              {/* Order Items Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Purchased Merchandise ({selectedOrder.items.length})
                </h3>

                <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
                  {(selectedOrder.items || []).map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                        {item.product_image ? (
                          <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-foreground truncate">{item.product_name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                          {item.size && <span className="bg-muted px-1.5 py-0.5 rounded font-semibold">Size: {item.size}</span>}
                          {item.custom_name && (
                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                              {item.custom_name} #{item.custom_number}
                            </span>
                          )}
                          <span>Qty: {item.quantity}</span>
                        </div>
                      </div>

                      <div className="text-right font-black text-xs text-foreground shrink-0">
                        ₹{(Number(item.product_price) * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Actions */}
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <span className="text-xs text-muted-foreground font-semibold">Total Paid</span>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹{Number(selectedOrder.total_amount).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="flex-1 sm:flex-none rounded-xl text-xs font-bold border-border hover:bg-muted"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Receipt
                  </Button>
                  <Link to="/shop" className="flex-1 sm:flex-none">
                    <Button size="sm" className="w-full bg-brand text-white hover:bg-brand-hover rounded-xl text-xs font-bold shadow-md">
                      Order More Gear <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
