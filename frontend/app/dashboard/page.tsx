'use client'

import Link from 'next/link'
import { ArrowRight, BookOpen, Users, BarChart3, GraduationCap, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function DashboardLanding() {
  const roles = [
    {
      id: 'hod',
      label: 'HOD',
      description: 'Department Head',
      icon: <UserCog className="w-8 h-8" />,
      color: 'bg-primary/20 text-primary',
      buttonColor: 'bg-primary hover:bg-primary/90 text-primary-foreground',
      features: ['Monitor all mentors', 'Generate reports', 'Department analytics'],
    },
    {
      id: 'mentor',
      label: 'Mentor',
      description: 'Faculty Mentor',
      icon: <Users className="w-8 h-8" />,
      color: 'bg-accent/20 text-accent',
      buttonColor: 'bg-accent hover:bg-accent/90 text-accent-foreground',
      features: ['Manage students', 'Schedule meetings', 'Track progress'],
    },
    {
      id: 'student',
      label: 'Student',
      description: 'Student',
      icon: <GraduationCap className="w-8 h-8" />,
      color: 'bg-blue-500/20 text-blue-500',
      buttonColor: 'bg-blue-500 hover:bg-blue-600 text-white',
      features: ['View meetings', 'Submit progress', 'Connect with mentor'],
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent/10">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              MM
            </div>
            <span className="font-bold text-lg text-foreground">Mentor Hub</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="text-foreground hover:bg-secondary">
                Home
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Access Your Dashboard
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select your role and login to access the mentorship management platform.
          </p>
        </div>
      </section>

      {/* Role Selection Cards */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Card 
              key={role.id}
              className="p-6 border-border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`p-4 rounded-xl ${role.color} w-fit mb-4`}>
                {role.icon}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">{role.label}</h3>
              <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
              
              <ul className="space-y-2 mb-6">
                {role.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href="/login">
                <Button className={`w-full gap-2 ${role.buttonColor}`}>
                  Login as {role.label}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Info Section */}
      <section className="px-4 py-12 bg-gradient-to-t from-primary/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span className="text-sm">Real-time Analytics</span>
            </div>
            <div className="w-px h-4 bg-border hidden sm:block" />
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5 text-accent" />
              <span className="text-sm">Seamless Collaboration</span>
            </div>
            <div className="w-px h-4 bg-border hidden sm:block" />
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <span className="text-sm">Progress Tracking</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 MentorMinds. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
