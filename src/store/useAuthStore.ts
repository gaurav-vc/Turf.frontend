import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'ADMIN' | 'MANAGER' | 'PLAYER'

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (userData: any) => void
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

        set({
          user: {
            id: userData.id.toString(),
            name: userData.full_name || userData.email.split('@')[0],
            email: userData.email,
            role,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.email}`
          },
          isAuthenticated: true
        })
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
