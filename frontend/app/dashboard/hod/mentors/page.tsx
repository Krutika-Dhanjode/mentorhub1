'use client'

import { BarChart3, Users, BookOpen, Download, Search, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface StatCard {
  title: string
  value: string
  icon: React.ReactNode
  trend?: string
  color: string
}

interface Mentor {
  id: string
  name: string
  email: string
  students: number
  status: 'Active' | 'Inactive'
  department: string
}

const statCards: StatCard[] = [
  {
    title: 'Total Mentors',
    value: '24',
    icon: <Users className="w-6 h-6" />,
    trend: '+2 this month',
    color: 'text-primary',
  },
  {
    title: 'Total Students',
    value: '156',
    icon: <BookOpen className="w-6 h-6" />,
    trend: '+12 this month',
    color: 'text-accent',
  },
  {
    title: 'Meetings Scheduled',
    value: '89',
    icon: <BarChart3 className="w-6 h-6" />,
    trend: '+5 this week',
    color: 'text-blue-500',
  },
]

const mentors: Mentor[] = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@college.edu',
    students: 8,
    status: 'Active',
    department: 'Computer Science',
  },
  {
    id: '2',
    name: 'Prof. Michael Chen',
    email: 'michael.chen@college.edu',
    students: 6,
    status: 'Active',
    department: 'Information Technology',
  },
  {
    id: '3',
    name: 'Dr. Emily Roberts',
    email: 'emily.roberts@college.edu',
    students: 7,
    status: 'Active',
    department: 'Computer Science',
  },
  {
    id: '4',
    name: 'Prof. James Wilson',
    email: 'james.wilson@college.edu',
    students: 5,
    status: 'Inactive',
    department: 'Software Engineering',
  },
]

export default function HODMentorsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Mentors Overview</h2>
          <p className="text-muted-foreground mt-1">Manage and monitor all mentors in your department</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="p-6 border-border bg-card hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">{stat.title}</p>
                <h3 className="text-3xl font-bold text-foreground">{stat.value}</h3>
                {stat.trend && (
                  <p className="text-xs text-primary font-medium mt-2">{stat.trend}</p>
                )}
              </div>
              <div className={`${stat.color} opacity-20 p-3 rounded-lg bg-primary/10`}>
                {stat.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex-1 min-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search mentors..."
              className="pl-10 bg-input border-border focus-visible:ring-primary"
            />
          </div>
        </div>
        <Button variant="outline" className="border-border bg-card hover:bg-secondary">
          Filter
        </Button>
      </div>

      {/* Mentors Table */}
      <Card className="border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Mentor List</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-foreground font-semibold">Name</TableHead>
                <TableHead className="text-foreground font-semibold">Email</TableHead>
                <TableHead className="text-foreground font-semibold">Department</TableHead>
                <TableHead className="text-center text-foreground font-semibold">Students</TableHead>
                <TableHead className="text-foreground font-semibold">Status</TableHead>
                <TableHead className="text-right text-foreground font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mentors.map((mentor) => (
                <TableRow key={mentor.id} className="border-border hover:bg-secondary/30 transition-colors">
                  <TableCell className="font-medium text-foreground">{mentor.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{mentor.email}</TableCell>
                  <TableCell className="text-muted-foreground">{mentor.department}</TableCell>
                  <TableCell className="text-center font-medium text-foreground">{mentor.students}</TableCell>
                  <TableCell>
                    <Badge
                      className={mentor.status === 'Active' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}
                    >
                      {mentor.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button className="text-primary hover:text-primary/80 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-10">
            Add New Mentor
          </Button>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground h-10">
            Generate Reports
          </Button>
          <Button className="bg-secondary hover:bg-secondary/80 text-foreground h-10">
            View Analytics
          </Button>
        </div>
      </Card>
    </div>
  )
}
