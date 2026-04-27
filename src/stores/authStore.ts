import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  locale: 'de' | 'en'
  role: 'client' | 'designer' | 'engineer' | 'authority'
  created_at: string
  updated_at: string
}

interface AuthState {
  user: User | null
  profile: Profile | null
  /** True until the initial session probe completes (regardless of result). */
  isLoading: boolean
  setUser: (u: User | null) => void
  setProfile: (p: Profile | null) => void
  setLoading: (l: boolean) => void
  reset: () => void
}

/**
 * Auth store — populated by useSession on mount, consumed by
 * ProtectedRoute and any page that wants to know "is someone signed in?".
 *
 * isLoading starts true; useSession sets it false after INITIAL_SESSION
 * resolves. ProtectedRoute uses it to avoid flashing protected content
 * before the store has settled.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, profile: null, isLoading: false }),
}))
