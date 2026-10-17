import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, Truck, MapPin, Clock, CheckCircle2, 
  XCircle, Search, RotateCcw, Copy, Check, Download, 
  Edit2, ChevronLeft, ChevronRight, Phone, ShoppingBag, 
  Printer, X, LayoutList, LayoutGrid, ArrowUpDown, 
  Calendar, ChevronDown, Filter, Layers
} from 'lucide-react'
import { apiClient } from '@/api/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

interface Order {
  id: string
  user: number
  customer_name: string
  customer_email: string
  customer_phone: string
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
  tracking_timeline?: any[]
}

interface OrderStats {
  total_orders: number
  pending_orders: number
  confirmed_orders: number
  shipped_orders: number
  delivered_orders: number
  cancelled_orders: number
  total_revenue: number
  today_orders: number
  pickup_count: number
  courier_count: number
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLiveSyncing, setIsLiveSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date())

  // Dynamic View & Configuration Settings
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE')
  const [pageSize, setPageSize] = useState<number>(10) // STRICT REQUIREMENT: Only show 10 records page of order (with dynamic switch)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(5) // Real-time configurable polling: 3s, 5s, 15s, 0 (paused)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Robust & Featureful Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL')
  const [sortOrder, setSortOrder] = useState<'-created_at' | 'created_at' | '-total_amount' | 'total_amount'>('-created_at')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modal / Tracking Management Drawer
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false)
  const [trackingForm, setTrackingForm] = useState({
    status: '',
    carrier: '',
    tracking_number: '',
    estimated_delivery: '',
    notes: '',
  })

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    return { Authorization: `Bearer ${token}` }
  }

  // Cross-tab & real-time broadcast helper
  const broadcastOrderUpdate = (type: string, data?: any) => {
    try {
      const channel = new BroadcastChannel('turf_orders_channel')
      channel.postMessage({ type, data, timestamp: Date.now() })
      channel.close()
    } catch {}
    window.dispatchEvent(new CustomEvent('turf_orders_updated', { detail: { type, data, timestamp: Date.now() } }))
  }

  // 1. Fetch Orders from Backend (supports background silent sync to avoid UI flicker)
  const fetchOrders = async (page = currentPage, isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true)
      } else {
        setIsLiveSyncing(true)
      }

      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('page_size', pageSize.toString())

      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (deliveryTypeFilter !== 'ALL') params.append('delivery_type', deliveryTypeFilter)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())
      if (sortOrder) params.append('ordering', sortOrder)

      if (dateFilter === 'TODAY') {
        const today = new Date().toISOString().split('T')[0]
        params.append('date_from', today)
      } else if (dateFilter === 'WEEK') {
        const past = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
        params.append('date_from', past)
      } else if (dateFilter === 'MONTH') {
        const past = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
        params.append('date_from', past)
      }

      const res = await apiClient.get(`/v1/shop/orders/?${params.toString()}`, {
        headers: getAuthHeaders()
      })

      const data = res.data
      const results = data.results || []
      setOrders(results)
      setTotalPages(data.total_pages || Math.ceil((data.count || results.length) / pageSize) || 1)
      setTotalCount(data.count || results.length)
      setLastSyncTime(new Date())
    } catch (err) {
      console.error('Failed to load admin orders', err)
    } finally {
      if (!isBackground) setLoading(false)
      setIsLiveSyncing(false)
    }
  }

  // 2. Fetch Order Statistics
  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/v1/shop/orders/stats/', {
        headers: getAuthHeaders()
      })
      setStats(res.data)
    } catch (err) {
      console.error('Failed to load order stats', err)
    }
  }

  // Initial and Filter-triggered data load
  useEffect(() => {
    fetchOrders(1)
    fetchStats()
    setCurrentPage(1)
  }, [statusFilter, deliveryTypeFilter, dateFilter, sortOrder, pageSize])

  // Debounced search query
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(1)
      setCurrentPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Page navigation
  useEffect(() => {
    fetchOrders(currentPage)
  }, [currentPage])

  // Real-Time Listeners: BroadcastChannel + Custom Event + Window Focus Revalidation
  useEffect(() => {
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('turf_orders_channel')
      channel.onmessage = () => {
        fetchOrders(currentPage, true)
        fetchStats()
      }
    } catch {}

    const handleRealTimeSync = () => {
      fetchOrders(currentPage, true)
      fetchStats()
    }

    window.addEventListener('turf_orders_updated', handleRealTimeSync)
    window.addEventListener('focus', handleRealTimeSync)

    return () => {
      if (channel) channel.close()
      window.removeEventListener('turf_orders_updated', handleRealTimeSync)
      window.removeEventListener('focus', handleRealTimeSync)
    }
  }, [currentPage, statusFilter, deliveryTypeFilter, dateFilter, sortOrder, searchQuery, pageSize])

  // Dynamic Configurable Polling Interval for guaranteed live freshness across clients
  useEffect(() => {
    if (autoRefreshInterval <= 0) return
    const interval = setInterval(() => {
      fetchOrders(currentPage, true)
      fetchStats()
    }, autoRefreshInterval * 1000)
    return () => clearInterval(interval)
  }, [autoRefreshInterval, currentPage, statusFilter, deliveryTypeFilter, dateFilter, sortOrder, searchQuery, pageSize])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleOpenTrackingModal = (order: Order) => {
    setSelectedOrder(order)
    setTrackingForm({
      status: order.status,
      carrier: order.carrier || '',
      tracking_number: order.tracking_number || '',
      estimated_delivery: order.estimated_delivery || '',
      notes: order.tracking_notes || '',
    })
  }

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder) return
    try {
      setIsUpdatingTracking(true)
      await apiClient.post(
        `/v1/shop/orders/${selectedOrder.id}/update_tracking/`,
        trackingForm,
        { headers: getAuthHeaders() }
      )
      broadcastOrderUpdate('ORDER_STATUS_CHANGED', { orderId: selectedOrder.id, status: trackingForm.status })
      alert('Order tracking status updated successfully! Customer notified.')
      setSelectedOrder(null)
      fetchOrders(currentPage, true)
      fetchStats()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update order tracking.')
    } finally {
      setIsUpdatingTracking(false)
    }
  }

  // Quick Status changer directly from table
  const handleQuickStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await apiClient.post(
        `/v1/shop/orders/${orderId}/update_tracking/`,
        { status: newStatus },
        { headers: getAuthHeaders() }
      )
      broadcastOrderUpdate('ORDER_STATUS_CHANGED', { orderId, status: newStatus })
      fetchOrders(currentPage, true)
      fetchStats()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status.')
    }
  }

  // CSV Export
  const handleExportCSV = () => {
    if (orders.length === 0) return alert('No orders to export.')
    const headers = ['Order ID', 'Customer Name', 'Email', 'Phone', 'Total (INR)', 'Status', 'Fulfillment', 'Carrier', 'Tracking Number', 'Placed Date']
    const rows = orders.map(o => [
      o.id,
      `"${o.customer_name || ''}"`,
      o.customer_email || '',
      o.customer_phone || '',
      o.total_amount,
      o.status,
      o.delivery_type,
      `"${o.carrier || ''}"`,
      o.tracking_number || '',
      new Date(o.created_at).toISOString()
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `TurfArena_Orders_Export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetAllFilters = () => {
    setSearchQuery('')
    setStatusFilter('ALL')
    setDeliveryTypeFilter('ALL')
    setDateFilter('ALL')
    setSortOrder('-created_at')
    setCurrentPage(1)
  }

  const activeFilterCount = 
    (statusFilter !== 'ALL' ? 1 : 0) + 
    (deliveryTypeFilter !== 'ALL' ? 1 : 0) + 
    (dateFilter !== 'ALL' ? 1 : 0) + 
    (searchQuery.trim() ? 1 : 0)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        )
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Truck className="w-3.5 h-3.5 animate-pulse" /> {status === 'OUT_FOR_DELIVERY' ? 'Out for Delivery' : 'In Transit'}
          </span>
        )
      case 'CONFIRMED':
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Package className="w-3.5 h-3.5" /> Confirmed
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand uppercase tracking-wider mb-1">
            <ShoppingBag className="w-4 h-4" /> E-Commerce Fulfillment & Operations
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Customer Orders Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track, filter, update shipment tracking numbers, and manage all customer merchandise orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dynamic Real-Time Live Sync Indicator & Selector */}
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 ${autoRefreshInterval > 0 ? 'opacity-75' : 'opacity-0'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${autoRefreshInterval > 0 ? 'bg-emerald-500' : 'bg-muted-foreground'}`}></span>
            </span>
            <span className="text-xs font-black hidden sm:inline">Live Sync:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-xs font-black text-emerald-700 dark:text-emerald-300 cursor-pointer focus:outline-none"
              title="Configure real-time sync frequency"
            >
              <option value={3} className="bg-card text-foreground">Real-time (3s)</option>
              <option value={5} className="bg-card text-foreground">Fast (5s)</option>
              <option value={15} className="bg-card text-foreground">Normal (15s)</option>
              <option value={0} className="bg-card text-foreground">Manual Only</option>
            </select>
            {isLiveSyncing && (
              <span className="w-2 h-2 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin ml-0.5" title="Syncing now..." />
            )}
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { fetchOrders(currentPage); fetchStats(); }}
            className="rounded-xl border-border hover:bg-muted font-bold text-xs"
            title={`Last updated: ${lastSyncTime.toLocaleTimeString()}`}
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isLiveSyncing ? 'animate-spin' : ''}`} /> Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="rounded-xl border-border hover:bg-muted font-bold text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>
      </header>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
            <Package className="w-4 h-4 text-brand" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">
            {stats ? stats.total_orders : '—'}
          </p>
          <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
            {stats ? `${stats.today_orders} orders placed today` : 'Loading...'}
          </p>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {stats ? stats.pending_orders : '—'}
          </p>
          <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
            Awaiting order confirmation
          </p>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-blue-500">
            <span className="text-xs font-bold uppercase tracking-wider">In Transit</span>
            <Truck className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {stats ? stats.shipped_orders : '—'}
          </p>
          <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
            Dispatched via courier
          </p>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-emerald-500">
            <span className="text-xs font-bold uppercase tracking-wider">Delivered</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {stats ? stats.delivered_orders : '—'}
          </p>
          <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
            Completed fulfillments
          </p>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider">Merchandise Revenue</span>
            <span className="text-xs font-black">₹</span>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            ₹{stats ? stats.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
          </p>
          <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
            Total verified sales
          </p>
        </div>
      </div>

      {/* ROBUST & FEATUREFUL FILTER CONTROL BAR */}
      <div className="bg-card border border-border/80 p-4 sm:p-5 rounded-2xl shadow-xs space-y-3.5">
        {/* Row 1: Omni-Search & Display Configurations */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Omni Search Input */}
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by Order ID, customer, phone, item, waybill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9.5 pr-8 h-10 text-xs rounded-xl bg-background border-border/80 hover:border-border focus:border-brand focus:ring-1 focus:ring-brand shadow-none transition-all placeholder:text-muted-foreground/70"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Display & Sorting Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            {/* View Mode Segmented Switcher */}
            <div className="inline-flex items-center h-10 p-1 bg-muted/60 border border-border/80 rounded-xl">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'TABLE' 
                    ? 'bg-card text-foreground shadow-xs border border-border/60' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewMode('CARDS')}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'CARDS' 
                    ? 'bg-card text-foreground shadow-xs border border-border/60' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>

            {/* Records Per Page Selector */}
            <div className="relative inline-flex items-center">
              <div className="flex items-center gap-1.5 h-10 px-3 bg-background border border-border/80 hover:border-border rounded-xl text-xs font-bold text-foreground transition-all">
                <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-[11px] font-semibold hidden sm:inline">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-foreground cursor-pointer outline-none pr-5 appearance-none"
                >
                  <option value={10} className="bg-card text-foreground">10 / page (Default)</option>
                  <option value={20} className="bg-card text-foreground">20 / page</option>
                  <option value={50} className="bg-card text-foreground">50 / page</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Sort Order Selector */}
            <div className="relative inline-flex items-center">
              <div className="flex items-center gap-1.5 h-10 px-3 bg-background border border-border/80 hover:border-border rounded-xl text-xs font-bold text-foreground transition-all">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <select
                  value={sortOrder}
                  onChange={(e: any) => setSortOrder(e.target.value)}
                  className="bg-transparent text-xs font-bold text-foreground cursor-pointer outline-none pr-5 appearance-none"
                >
                  <option value="-created_at" className="bg-card text-foreground">Newest First</option>
                  <option value="created_at" className="bg-card text-foreground">Oldest First</option>
                  <option value="-total_amount" className="bg-card text-foreground">Highest Amount</option>
                  <option value="total_amount" className="bg-card text-foreground">Lowest Amount</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Status Pills, Delivery Type, Date Filter & Reset */}
        <div className="pt-3.5 border-t border-border/60 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* Status Pills with Dynamic Counts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-none">
            <div className="inline-flex items-center gap-1 text-[11px] font-black text-muted-foreground uppercase tracking-wider mr-1 px-1 shrink-0">
              <Filter className="w-3 h-3 text-brand" />
              <span>Status:</span>
            </div>
            {[
              { id: 'ALL', label: 'All', count: stats?.total_orders },
              { id: 'PENDING', label: 'Pending', count: stats?.pending_orders },
              { id: 'CONFIRMED', label: 'Confirmed', count: stats?.confirmed_orders },
              { id: 'SHIPPED', label: 'Shipped', count: stats?.shipped_orders },
              { id: 'DELIVERED', label: 'Delivered', count: stats?.delivered_orders },
              { id: 'CANCELLED', label: 'Cancelled', count: stats?.cancelled_orders }
            ].map((st) => {
              const isActive = statusFilter === st.id
              return (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`inline-flex items-center gap-1.5 h-8.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isActive
                      ? 'bg-brand text-white shadow-xs ring-1 ring-brand/30'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60'
                  }`}
                >
                  <span>{st.label}</span>
                  {typeof st.count === 'number' && (
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-background/80 text-muted-foreground'
                      }`}
                    >
                      {st.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Fulfillment Type, Date Range & Reset */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
            {/* Fulfillment Type Dropdown */}
            <div className="relative inline-flex items-center">
              <div className="flex items-center gap-1.5 h-8.5 px-3 bg-background border border-border/80 hover:border-border rounded-xl text-xs font-bold text-foreground transition-all">
                <Truck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <select
                  value={deliveryTypeFilter}
                  onChange={(e) => setDeliveryTypeFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-foreground cursor-pointer outline-none pr-5 appearance-none"
                >
                  <option value="ALL" className="bg-card text-foreground">All Delivery Types</option>
                  <option value="VENUE_PICKUP" className="bg-card text-foreground">Venue Pickup Desk</option>
                  <option value="HOME_DELIVERY" className="bg-card text-foreground">Doorstep Courier</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Date Range Dropdown */}
            <div className="relative inline-flex items-center">
              <div className="flex items-center gap-1.5 h-8.5 px-3 bg-background border border-border/80 hover:border-border rounded-xl text-xs font-bold text-foreground transition-all">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <select
                  value={dateFilter}
                  onChange={(e: any) => setDateFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-foreground cursor-pointer outline-none pr-5 appearance-none"
                >
                  <option value="ALL" className="bg-card text-foreground">All Time</option>
                  <option value="TODAY" className="bg-card text-foreground">Today</option>
                  <option value="WEEK" className="bg-card text-foreground">Past 7 Days</option>
                  <option value="MONTH" className="bg-card text-foreground">Past 30 Days</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Reset Filters Button */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                className="h-8.5 px-2.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold rounded-xl transition-all"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Reset ({activeFilterCount})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ORDERS LIST: 10 RECORDS PER PAGE STRICT PAGINATION */}
      {loading && orders.length === 0 ? (
        <div className="py-24 text-center space-y-3 bg-card border border-border rounded-2xl">
          <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-muted-foreground">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground">No Orders Found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              No orders matched your current filter criteria.
            </p>
          </div>
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live channel listening for customer orders...
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={resetAllFilters} variant="outline" size="sm" className="rounded-xl text-xs font-bold">
                Clear Filters
              </Button>
              <Button onClick={() => { fetchOrders(1); fetchStats(); }} size="sm" className="bg-brand text-white hover:bg-brand-hover rounded-xl text-xs font-bold shadow-sm">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Check Now
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header Summary */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} total orders
            </span>
            <span className="text-[11px] font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full">
              Showing {pageSize} records per page
            </span>
          </div>

          {/* VIEW MODE 1: DATA TABLE VIEW */}
          {viewMode === 'TABLE' ? (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border uppercase tracking-wider font-black text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Order ID</th>
                      <th className="px-5 py-3.5">Customer</th>
                      <th className="px-5 py-3.5">Merchandise</th>
                      <th className="px-5 py-3.5">Fulfillment</th>
                      <th className="px-5 py-3.5">Total Amount</th>
                      <th className="px-5 py-3.5">Quick Status</th>
                      <th className="px-5 py-3.5">Carrier / Waybill</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                        {/* Order ID */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 font-mono font-black text-foreground">
                            <span>#{order.id.slice(0, 8).toUpperCase()}</span>
                            <button
                              onClick={() => copyToClipboard(order.id, order.id)}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                              title="Copy ID"
                            >
                              {copiedId === order.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                            {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>

                        {/* Customer Info */}
                        <td className="px-5 py-4">
                          <p className="font-bold text-foreground text-xs">{order.customer_name || 'Customer'}</p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{order.customer_email}</p>
                          {order.customer_phone && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" /> {order.customer_phone}
                            </p>
                          )}
                        </td>

                        {/* Merchandise Items */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {order.items.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="w-8 h-8 rounded-lg bg-muted border-2 border-card overflow-hidden flex items-center justify-center shrink-0">
                                  {item.product_image ? (
                                    <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate max-w-[140px]">
                                {order.items[0]?.product_name || 'Gear Item'}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {order.items_count} {order.items_count === 1 ? 'item' : 'items'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Fulfillment */}
                        <td className="px-5 py-4">
                          {order.delivery_type === 'VENUE_PICKUP' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                              <MapPin className="w-3 h-3" /> Venue Pickup
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                              <Truck className="w-3 h-3" /> Courier
                            </span>
                          )}
                          <p className="text-[10px] text-muted-foreground truncate max-w-[140px] mt-0.5" title={order.shipping_address}>
                            {order.shipping_address || 'Turf Counter'}
                          </p>
                        </td>

                        {/* Total Amount */}
                        <td className="px-5 py-4">
                          <span className="font-black text-sm text-foreground">
                            ₹{Number(order.total_amount).toLocaleString()}
                          </span>
                        </td>

                        {/* Quick Status Dropdown */}
                        <td className="px-5 py-4">
                          <select
                            value={order.status}
                            onChange={(e) => handleQuickStatusChange(order.id, e.target.value)}
                            className="h-8 px-2 bg-background border border-border rounded-xl text-xs font-black text-foreground focus:ring-1 focus:ring-brand"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="PROCESSING">PROCESSING</option>
                            <option value="SHIPPED">SHIPPED</option>
                            <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                            <option value="DELIVERED">DELIVERED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>

                        {/* Carrier / Waybill */}
                        <td className="px-5 py-4">
                          <p className="font-bold text-foreground text-xs">{order.carrier || 'Standard'}</p>
                          <p className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                            {order.tracking_number || '—'}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenTrackingModal(order)}
                            className="rounded-xl text-xs font-bold h-8 border-border hover:bg-muted"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1 text-brand" /> Manage
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* VIEW MODE 2: RICH GRID CARDS VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 hover:border-brand/40 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 font-mono text-xs font-black text-foreground">
                        <span>#{order.id.slice(0, 8).toUpperCase()}</span>
                        <button onClick={() => copyToClipboard(order.id, order.id)} className="text-muted-foreground hover:text-foreground">
                          {copiedId === order.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  {/* Customer Info */}
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-foreground">{order.customer_name || 'Customer'}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{order.customer_email}</p>
                    </div>
                    <span className="font-black text-sm text-foreground">
                      ₹{Number(order.total_amount).toLocaleString()}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">
                      Items ({order.items.length})
                    </p>
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-none">
                          <span className="truncate pr-2 text-foreground font-medium">
                            {item.product_name} {item.size && `(${item.size})`}
                          </span>
                          <span className="font-bold text-muted-foreground shrink-0">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tracking & Quick Update */}
                  <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                    <select
                      value={order.status}
                      onChange={(e) => handleQuickStatusChange(order.id, e.target.value)}
                      className="h-8 px-2 bg-background border border-border rounded-xl text-xs font-black text-foreground flex-1"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="PROCESSING">PROCESSING</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>

                    <Button
                      size="sm"
                      onClick={() => handleOpenTrackingModal(order)}
                      className="bg-brand text-white hover:bg-brand-hover rounded-xl text-xs font-bold h-8 px-3"
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 10 RECORDS PER PAGE PAGINATION CONTROLS */}
          <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground font-semibold">
              Page <strong className="text-foreground">{currentPage}</strong> of <strong className="text-foreground">{totalPages}</strong> ({totalCount} total orders)
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="rounded-xl h-8 px-2 font-bold"
              >
                First
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="rounded-xl h-8 px-3 font-bold"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1]
                    const showEllipsis = prev && p - prev > 1
                    return (
                      <div key={p} className="flex items-center">
                        {showEllipsis && <span className="px-1 text-muted-foreground">...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-xl text-xs font-black transition-colors ${
                            currentPage === p
                              ? 'bg-brand text-white shadow-sm'
                              : 'hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    )
                  })}
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

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="rounded-xl h-8 px-2 font-bold"
              >
                Last
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAILS & TRACKING MANAGEMENT MODAL */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-border bg-muted/40 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-foreground">
                    Manage Order #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure live status, courier carrier, and tracking waybill.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form & Order Details */}
              <form onSubmit={handleSaveTracking} className="p-6 space-y-6">
                {/* Customer & Address Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/30 border border-border text-xs">
                  <div>
                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Customer Details</span>
                    <p className="font-black text-foreground mt-1">{selectedOrder.customer_name}</p>
                    <p className="text-muted-foreground">{selectedOrder.customer_email}</p>
                    <p className="text-muted-foreground">{selectedOrder.customer_phone || 'No phone provided'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-muted-foreground uppercase text-[10px]">
                      {selectedOrder.delivery_type === 'VENUE_PICKUP' ? 'Venue Pickup Counter' : 'Courier Address'}
                    </span>
                    <p className="font-bold text-foreground mt-1">
                      {selectedOrder.delivery_type === 'VENUE_PICKUP' ? 'Turf Arena Collection Counter' : 'Home Delivery'}
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      {selectedOrder.shipping_address || 'Turf Venue Desk'}
                    </p>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Ordered Merchandise ({selectedOrder.items.length})
                  </Label>
                  <div className="max-h-36 overflow-y-auto divide-y divide-border border border-border rounded-xl bg-background">
                    {selectedOrder.items.map((it) => (
                      <div key={it.id} className="p-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{it.product_name}</span>
                          {it.size && <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-semibold">Size {it.size}</span>}
                          {it.custom_name && (
                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {it.custom_name} #{it.custom_number}
                            </span>
                          )}
                        </div>
                        <span className="font-black text-foreground">
                          {it.quantity} x ₹{Number(it.product_price).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tracking Configuration Inputs */}
                <div className="space-y-4 pt-2 border-t border-border">
                  <h4 className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-brand" /> Live Tracking Configuration
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Order Status *</Label>
                      <select
                        value={trackingForm.status}
                        onChange={(e) => setTrackingForm({ ...trackingForm, status: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-bold text-foreground"
                      >
                        <option value="PENDING">PENDING (Awaiting Confirmation)</option>
                        <option value="CONFIRMED">CONFIRMED (Packed & Verified)</option>
                        <option value="PROCESSING">PROCESSING (Customizing Jersey)</option>
                        <option value="SHIPPED">SHIPPED (In Transit)</option>
                        <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY (With Courier / Desk)</option>
                        <option value="DELIVERED">DELIVERED (Fulfilled)</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Courier / Carrier Partner</Label>
                      <Input
                        placeholder="e.g. BlueDart Express, Delhivery, DTDC, Turf Desk"
                        value={trackingForm.carrier}
                        onChange={(e) => setTrackingForm({ ...trackingForm, carrier: e.target.value })}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Tracking / Waybill ID</Label>
                      <Input
                        placeholder="e.g. BD-849201938IN"
                        value={trackingForm.tracking_number}
                        onChange={(e) => setTrackingForm({ ...trackingForm, tracking_number: e.target.value })}
                        className="h-10 text-xs font-mono rounded-xl uppercase"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Estimated Delivery Date</Label>
                      <Input
                        type="date"
                        value={trackingForm.estimated_delivery}
                        onChange={(e) => setTrackingForm({ ...trackingForm, estimated_delivery: e.target.value })}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Tracking Notes / Delivery Updates (Visible to Customer)</Label>
                    <Input
                      placeholder="e.g. Handed over to courier hub at 2:00 PM. Expected arrival in 48 hours."
                      value={trackingForm.notes}
                      onChange={(e) => setTrackingForm({ ...trackingForm, notes: e.target.value })}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.print()}
                    className="rounded-xl text-xs font-bold border-border"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Packing Slip
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedOrder(null)}
                      className="rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isUpdatingTracking}
                      className="bg-brand text-white hover:bg-brand-hover rounded-xl text-xs font-bold shadow-md px-5"
                    >
                      {isUpdatingTracking ? 'Saving...' : 'Save & Notify Customer'}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
