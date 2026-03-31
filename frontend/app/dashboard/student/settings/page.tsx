'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUser } from '@/hooks/use-user'

export default function StudentSettingsPage() {
  const { user, loading } = useUser()
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    prn: '',
    department: '',
    batch: '',
    address: '',
    bio: '',
  })

  const [isSaving, setIsSaving] = useState(false)

  // ✅ load user data when available
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        prn: user.prn || '',
        department: user.department || '',
        batch: user.batch || '',
        address: user.address || '',
        bio: user.bio || '',
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
          batch: profile.batch,
          address: profile.address,
          bio: profile.bio,
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
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile information</p>
      </div>

      {loading && (
        <Card className="border-border p-6 text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </Card>
      )}

      {!loading && (
      <Card className="border-border p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{profile.name || 'Student'}</h2>
            <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
            <p className="text-sm text-muted-foreground">PRN: {profile.prn}</p>
            <p className="text-sm text-muted-foreground">{profile.department}</p>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Edit Profile</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="pl-10 bg-input border-border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="pl-10 bg-input border-border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prn">PRN</Label>
              <Input
                id="prn"
                value={profile.prn}
                disabled
                className="bg-secondary border-border text-muted-foreground"
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
              <Label htmlFor="batch">Batch</Label>
              <Input
                id="batch"
                value={profile.batch}
                disabled
                className="bg-secondary border-border text-muted-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="address"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="pl-10 bg-input border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className="bg-input border-border min-h-24"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Card>
      )}
    </div>
  )
}
