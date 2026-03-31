"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, Users, BarChart3, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent/10 flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              MM
            </div>
            <span className="font-bold text-lg text-foreground">MentorHub</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-foreground hover:bg-secondary">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section removed */}

      {/* Roles Section */}
      <section className="px-4 py-20 bg-gradient-to-t from-primary/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Built for Every Role</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* HOD */}
            <Card className="p-8 border-border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-foreground">HOD</h3>
                <div className="p-3 bg-primary/20 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  'Monitor all mentors and students',
                  'Generate comprehensive reports',
                  'Track mentor-mentee metrics',
                  'Department-wide analytics',
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login" className="mt-6 block">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  Access Dashboard
                </Button>
              </Link>
            </Card>

            {/* Mentor */}
            <Card className="p-8 border-border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-foreground">Mentor</h3>
                <div className="p-3 bg-accent/20 rounded-lg">
                  <Users className="w-6 h-6 text-accent" />
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  'Manage assigned students',
                  'Schedule and track meetings',
                  'Monitor student progress',
                  'Handle guidance queries',
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login" className="mt-6 block">
                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  Access Dashboard
                </Button>
              </Link>
            </Card>

            {/* Student */}
            <Card className="p-8 border-border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-foreground">Student</h3>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  'Track academic progress',
                  'View meeting history',
                  'Ask queries to mentor',
                  'Upload progress files',
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login" className="mt-6 block">
                <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                  Access Dashboard
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Mentor Mentee Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
