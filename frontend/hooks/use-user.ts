import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
  id: string
  name: string
  fullName?: string
  email: string
  role: 'hod' | 'mentor' | 'student'
  phone?: string
  employmentId?: string
  department?: string
  designation?: string
  office?: string
  officeLocation?: string
  bio?: string
  [key: string]: any
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient()

        // Get authenticated user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        // Get user profile from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (userError) {
          setError(userError.message)
          setLoading(false)
          return
        }

        const normalizedUser: UserProfile = {
          ...(userData as UserProfile),
          name: userData.name || userData.full_name || '',
          fullName: userData.full_name || userData.name || '',
          phone: userData.phone || '',
          employmentId: userData.employment_id || userData.employeeId || '',
          department: userData.department || '',
          designation: userData.designation || '',
          office: userData.office || userData.office_location || '',
          officeLocation: userData.office_location || userData.office || '',
        }

        setUser(normalizedUser)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return { user, loading, error }
}
