import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'ADMIN' | 'MANAGER' | 'PLAYER'

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  phone?: string
  avatar?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (userData: any) => void
  updateUser: (partialData: Partial<User>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (userData) => {
        if (typeof userData === 'string') {
          set({ 
            user: { 
              id: '1', 
              name: userData === 'ADMIN' ? 'Super Admin' : userData === 'MANAGER' ? 'Turf Manager' : 'Rahul Player', 
              email: `${userData.toLowerCase()}@turfarena.com`, 
              phone: '',
              role: userData as UserRole,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData}`
            },
            isAuthenticated: true
          })
          return
        }

        let role: UserRole = 'PLAYER'
        if (userData.is_superuser) {
          role = 'ADMIN'
        } else if (userData.user_type === 'MANAGER') {
          role = 'MANAGER'
        }

        const avatarUrl = userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.email)}`

        set({
          user: {
            id: userData.id.toString(),
            name: userData.full_name || userData.email.split('@')[0],
            email: userData.email,
            phone: userData.phone || '',
            role,
            avatar: avatarUrl
          },
          isAuthenticated: true
        })
      },
      updateUser: (partialData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...partialData } : null
        }))
      },
      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
    }
  )
)
