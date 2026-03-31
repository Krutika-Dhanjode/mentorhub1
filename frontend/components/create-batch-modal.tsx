'use client'

import { useState } from 'react'
import { X, Users, Calendar, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CreateBatchModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (batchData: {
    name: string
    year: string
    department: string
  }) => void
}

export default function CreateBatchModal({
  isOpen,
  onClose,
  onCreate
}: CreateBatchModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    year: '',
    department: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.year || !formData.department) {
      alert("Please fill in all required fields")
      return
    }

    onCreate(formData)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      name: '',
      year: '',
      department: '',
    })
    onClose()
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => (currentYear + i).toString())

  const departments = [
    'Computer Science',
    'Information Technology',
    'Electronics',
    'Mechanical',
    'Civil',
    'Electrical',
    'Chemical',
    'Biotechnology'
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Create New Batch</h2>
          <button
            onClick={resetForm}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Batch Name */}
          <div>
            <Label htmlFor="name" className="text-foreground font-medium mb-2 block">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Batch Name
              </div>
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., CS-2024-A"
              className="border-border bg-background text-foreground focus:ring-primary"
            />
          </div>

          {/* Year */}
          <div>
            <Label htmlFor="year" className="text-foreground font-medium mb-2 block">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Academic Year
              </div>
            </Label>
            <Select value={formData.year} onValueChange={(value) => setFormData({ ...formData, year: value })}>
              <SelectTrigger className="border-border bg-background text-foreground focus:ring-primary">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department */}
          <div>
            <Label htmlFor="department" className="text-foreground font-medium mb-2 block">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Department
              </div>
            </Label>
            <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
              <SelectTrigger className="border-border bg-background text-foreground focus:ring-primary">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              onClick={resetForm}
              className="flex-1 bg-muted hover:bg-muted/90 text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.name || !formData.year || !formData.department}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
            >
              Create Batch
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}