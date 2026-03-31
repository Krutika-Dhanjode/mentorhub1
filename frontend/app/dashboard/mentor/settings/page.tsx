'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Save, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'

export default function MentorSettingsPage() {
  const { user, loading } = useUser()
  const supabase = createClient()
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    employmentId: '',
    department: '',
    designation: '',
    officeLocation: '',
  })

  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.fullName || user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        employmentId: user.employmentId || '',
        department: user.department || '',
        designation: user.designation || '',
        officeLocation: user.officeLocation || user.office || '',
      })
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      if (profile.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: profile.email,
        })

        if (authError) {
          alert('Error updating auth email: ' + authError.message)
          setIsSaving(false)
          return
        }
      }

      const { error } = await supabase
        .from('users')
        .update({
          name: profile.fullName,
          full_name: profile.fullName,
          email: profile.email,
          phone: profile.phone,
          employment_id: profile.employmentId,
          department: profile.department,
          designation: profile.designation,
          office: profile.officeLocation,
          office_location: profile.officeLocation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        alert('Error saving profile: ' + error.message)
      } else {
        alert('Profile saved successfully! Refresh the page if you do not see updated account details immediately.')
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
            <h2 className="text-xl font-semibold text-foreground">{profile.fullName || 'User'}</h2>
            <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
            <p className="text-sm text-muted-foreground">{profile.designation}</p>
            <p className="text-sm text-muted-foreground">{profile.department}</p>
            <p className="text-sm text-muted-foreground">{profile.officeLocation}</p>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Edit Profile</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
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
              <Label htmlFor="employmentId">Employment ID</Label>
              <Input
                id="employmentId"
                value={profile.employmentId}
                onChange={(e) => setProfile({ ...profile, employmentId: e.target.value })}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={profile.department}
                onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="designation"
                  value={profile.designation}
                  onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                  className="pl-10 bg-input border-border"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="officeLocation">Office Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="officeLocation"
                value={profile.officeLocation}
                onChange={(e) => setProfile({ ...profile, officeLocation: e.target.value })}
                className="pl-10 bg-input border-border"
              />
            </div>
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
