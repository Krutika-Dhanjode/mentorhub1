'use client'

import { useState, useEffect } from 'react'
import { User, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUser } from '@/hooks/use-user'

export default function HODSettingsPage() {
  const { user, loading } = useUser()
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    department: '',
    phone: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  // ✅ load user data when available
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        department: user.department || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      const supabase = require('@/lib/supabase/client').createClient()
      
      const { error } = await supabase
        .from('users')
        .update({
          name: profile.name,
          phone: profile.phone,
          department: profile.department,
        })
        .eq('id', user.id)

      if (error) {
        alert('Error saving profile: ' + error.message)
      } else {
        alert('Profile saved successfully!')
      }
    } catch (err) {
      alert('Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Update your profile information</p>
      </div>

      {loading && (
        <Card className="border-border p-6 text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </Card>
      )}

      {!loading && (
      <Card className="p-6 border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{profile.name || 'HOD'}</h2>
            <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="bg-input border-border" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="bg-input border-border" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input 
              id="department" 
              value={profile.department}
              disabled
              className="bg-secondary border-border text-muted-foreground" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input 
              id="phone" 
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="bg-input border-border" 
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>
      )}
    </div>
  )
}
