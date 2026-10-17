import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string // unique item id (productId + customization hash)
  productId: string | number
  name: string
  price: number
  originalPrice?: number
  image: string
  quantity: number
  customName?: string
  customNumber?: string
  size?: string
  category?: string
  isCustomizable?: boolean
}

interface CartState {
  items: CartItem[]
  isDrawerOpen: boolean
  appliedPromo: string | null
  discountPercent: number
  deliveryType: 'VENUE_PICKUP' | 'HOME_DELIVERY'
  deliveryAddress: string

  // Actions
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, delta: number) => void
  clearCart: () => void
  setDrawerOpen: (open: boolean) => void
  toggleDrawer: () => void
  applyPromo: (code: string) => { success: boolean; message: string }
  removePromo: () => void
  setDeliveryType: (type: 'VENUE_PICKUP' | 'HOME_DELIVERY') => void
  setDeliveryAddress: (address: string) => void

  // Computed Helpers
  getSubtotal: () => number
  getDiscountAmount: () => number
  getDeliveryFee: () => number
  getTotal: () => number
  getTotalItemsCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,
      appliedPromo: null,
      discountPercent: 0,
      deliveryType: 'VENUE_PICKUP',
      deliveryAddress: '',

      addItem: (itemData) => {
        const customKey = `${itemData.customName || ''}_${itemData.customNumber || ''}_${itemData.size || ''}`
        const itemId = `${itemData.productId}_${customKey}`

        set((state) => {
          const existingIndex = state.items.findIndex((i) => i.id === itemId)
          if (existingIndex > -1) {
            const updated = [...state.items]
            updated[existingIndex].quantity += itemData.quantity || 1
            return { items: updated, isDrawerOpen: true }
          }
          return {
            items: [...state.items, { ...itemData, id: itemId, quantity: itemData.quantity || 1 }],
            isDrawerOpen: true,
          }
        })
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }))
      },

      updateQuantity: (id, delta) => {
        set((state) => {
          const updated = state.items
            .map((item) => {
              if (item.id === id) {
                const newQty = item.quantity + delta
                return newQty > 0 ? { ...item, quantity: newQty } : null
              }
              return item
            })
            .filter(Boolean) as CartItem[]

          return { items: updated }
        })
      },

      clearCart: () => {
        set({ items: [], appliedPromo: null, discountPercent: 0 })
      },

      setDrawerOpen: (open) => set({ isDrawerOpen: open }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      applyPromo: (code) => {
        const cleanCode = code.trim().toUpperCase()
        if (cleanCode === 'TURFPRO10') {
          set({ appliedPromo: 'TURFPRO10', discountPercent: 10 })
          return { success: true, message: '🎉 TURFPRO10 applied! 10% discount added.' }
        }
        if (cleanCode === 'WELCOME50') {
          set({ appliedPromo: 'WELCOME50', discountPercent: 5 })
          return { success: true, message: '🎉 WELCOME50 applied! 5% discount added.' }
        }
        return { success: false, message: 'Invalid promo code. Try TURFPRO10' }
      },

      removePromo: () => set({ appliedPromo: null, discountPercent: 0 }),

      setDeliveryType: (type) => set({ deliveryType: type }),
      setDeliveryAddress: (address) => set({ deliveryAddress: address }),

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },

      getDiscountAmount: () => {
        const subtotal = get().getSubtotal()
        const pct = get().discountPercent
        return (subtotal * pct) / 100
      },

      getDeliveryFee: () => {
        const subtotal = get().getSubtotal()
        if (get().deliveryType === 'VENUE_PICKUP') return 0
        // Free shipping over 1500
        return subtotal >= 1500 ? 0 : 99
      },

      getTotal: () => {
        const subtotal = get().getSubtotal()
        const discount = get().getDiscountAmount()
        const delivery = get().getDeliveryFee()
        return Math.max(0, subtotal - discount + delivery)
      },

      getTotalItemsCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    {
      name: 'turf-shop-cart',
    }
  )
)
