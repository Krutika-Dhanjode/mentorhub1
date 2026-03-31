'use client'

import { Save, User } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => setIsSaving(false), 1000)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile information</p>
      </div>

      {/* Profile Settings */}
      <Card className="p-6 border-border">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Update your personal details</p>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-semibold text-foreground">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  defaultValue="John"
                  className="bg-input border-border focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-semibold text-foreground">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  defaultValue="Doe"
                  className="bg-input border-border focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                defaultValue="john.doe@college.edu"
                className="bg-input border-border focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold text-foreground">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                defaultValue="+91 98765 43210"
                className="bg-input border-border focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-sm font-semibold text-foreground">
                Department
              </Label>
              <Input
                id="department"
                defaultValue="Computer Science"
                className="bg-input border-border focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="designation" className="text-sm font-semibold text-foreground">
                Designation
              </Label>
              <Input
                id="designation"
                defaultValue="Professor"
                className="bg-input border-border focus-visible:ring-primary"
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
    </div>
  )
}
