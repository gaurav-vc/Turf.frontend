import { useState, useEffect } from 'react'
import { apiClient } from '@/api/apiClient'
import { motion } from 'framer-motion'
import { Users, Edit2, Check, X, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface User {
  id: number
  email: string
  full_name: string
  phone: string
  user_type: string
  is_active: boolean
  date_joined: string
  is_superuser?: boolean
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ user_type: '', is_active: false })

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    fetchUsers()
  }, [currentPage, debouncedSearch])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        console.warn('Demo Mode: No access token found. Skipping fetch.')
        return
      }
      const response = await apiClient.get(`/v1/accounts/users/?paginate=true&search=${debouncedSearch}&page=${currentPage}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(response.data.results || [])
      setTotalPages(Math.ceil((response.data.count || 0) / 10) || 1)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (user: User) => {
    setEditingId(user.id)
    setEditForm({ user_type: user.user_type, is_active: user.is_active })
  }

  const handleSave = async (id: number) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        alert('Action disabled in Demo Mode. Please log in with a real Super Admin account.')
        setEditingId(null)
        return
      }
      await apiClient.patch(`/v1/accounts/users/${id}/`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEditingId(null)
      fetchUsers()
    } catch (error) {
      console.error('Failed to update user:', error)
      alert('Error updating user')
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">User Management</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Manage platform users, roles, and access.</p>
        </div>
        <Users className="w-8 h-8 text-brand opacity-50 hidden sm:block" />
      </header>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search users by name, email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 animate-pulse text-muted-foreground font-semibold">Loading users...</div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Joined</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <motion.tr 
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{user.full_name || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {user.phone || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === user.id ? (
                        <select 
                          value={editForm.user_type} 
                          onChange={(e) => setEditForm({...editForm, user_type: e.target.value})}
                          className="bg-background border border-border rounded-md text-sm p-1.5 focus:ring-2 focus:ring-brand"
                        >
                          <option value="PLAYER">PLAYER</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      ) : (
                        <span className={`font-semibold text-xs tracking-wider uppercase px-2.5 py-1 rounded-full ${user.is_superuser ? 'bg-purple-500/10 text-purple-500' : user.user_type === 'MANAGER' ? 'bg-blue-500/10 text-blue-500' : 'bg-muted'}`}>
                          {user.is_superuser ? 'SUPER ADMIN' : user.user_type}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === user.id ? (
                        <select 
                          value={editForm.is_active ? 'true' : 'false'} 
                          onChange={(e) => setEditForm({...editForm, is_active: e.target.value === 'true'})}
                          className="bg-background border border-border rounded-md text-sm p-1.5 focus:ring-2 focus:ring-brand"
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      ) : (
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${user.is_active ? 'text-green-600' : 'text-muted-foreground'}`}>
                          <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(user.date_joined).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {editingId === user.id ? (
                        <>
                          <Button size="sm" className="bg-brand text-white hover:bg-brand-hover h-8 px-3" onClick={() => handleSave(user.id)}>
                            <Check className="w-4 h-4 mr-1" /> Save
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => handleEditClick(user)}>
                          <Edit2 className="w-4 h-4 mr-1" /> Edit
                        </Button>
                      )}
                    </td>
                  </motion.tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
            <div className="text-sm text-muted-foreground">
              Page <span className="font-semibold text-foreground">{currentPage}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
