// 'use client'

// import { useState } from 'react'
// import Link from 'next/link'
// import Image from 'next/image'
// import { Eye, EyeOff, GraduationCap, Users, UserCog } from 'lucide-react'
// import { Button } from '@/components/ui/button'
// import { Input } from '@/components/ui/input'
// import { Label } from '@/components/ui/label'
// import { Card } from '@/components/ui/card'

// export default function SignupPage() {
//   const [showPassword, setShowPassword] = useState(false)
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false)
//   const [isLoading, setIsLoading] = useState(false)
//   const [role, setRole] = useState('')

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault()
//     setIsLoading(true)
//     // Simulate signup
//     setTimeout(() => {
//       setIsLoading(false)
//     }, 1000)
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent/10 flex items-center justify-center p-4">
//       <Card className="w-full max-w-md shadow-lg border-0">
//         <div className="p-8">
//           {/* Logo */}
//           <div className="flex justify-center mb-6">
//             <Image 
//               src="/logo.png" 
//               alt="MentorMinds Logo" 
//               width={80} 
//               height={80}
//               className="object-contain w-auto h-auto"
//               priority
//             />
//           </div>

//           {/* Heading */}
//           <div className="space-y-2 text-center mb-6">
//             <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
//             <p className="text-muted-foreground text-sm">
//               Join MentorMinds platform
//             </p>
//           </div>

//           {/* Form */}
//           <form onSubmit={handleSubmit} className="space-y-5">
//             {/* Role Selection */}
//             <div className="space-y-2">
//               <Label className="text-sm font-semibold text-foreground">
//                 Select Your Role
//               </Label>
//               <div className="grid grid-cols-3 gap-2">
//                 {[
//                   { id: 'hod', label: 'HOD', icon: UserCog },
//                   { id: 'mentor', label: 'Mentor', icon: Users },
//                   { id: 'student', label: 'Student', icon: GraduationCap },
//                 ].map((roleOption) => {
//                   const Icon = roleOption.icon
//                   return (
//                     <button
//                       key={roleOption.id}
//                       type="button"
//                       onClick={() => setRole(roleOption.id)}
//                       className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all duration-200 ${
//                         role === roleOption.id
//                           ? 'border-primary bg-primary/10 text-primary'
//                           : 'border-border bg-input hover:border-primary/50 text-muted-foreground hover:text-foreground'
//                       }`}
//                     >
//                       <Icon className="w-5 h-5" />
//                       <span className="text-xs font-medium">{roleOption.label}</span>
//                     </button>
//                   )
//                 })}
//               </div>
//             </div>

//             {/* Full Name */}
//             <div className="space-y-2">
//               <Label htmlFor="name" className="text-sm font-semibold text-foreground">
//                 Full Name
//               </Label>
//               <Input
//                 id="name"
//                 type="text"
//                 placeholder="John Doe"
//                 className="bg-input border-border focus-visible:ring-primary h-10"
//                 required
//               />
//             </div>

//             {/* Email Field */}
//             <div className="space-y-2">
//               <Label htmlFor="email" className="text-sm font-semibold text-foreground">
//                 Email Address
//               </Label>
//               <Input
//                 id="email"
//                 type="email"
//                 placeholder="you@example.com"
//                 className="bg-input border-border focus-visible:ring-primary h-10"
//                 required
//               />
//             </div>

//             {/* Password Field */}
//             <div className="space-y-2">
//               <Label htmlFor="password" className="text-sm font-semibold text-foreground">
//                 Password
//               </Label>
//               <div className="relative">
//                 <Input
//                   id="password"
//                   type={showPassword ? 'text' : 'password'}
//                   placeholder="Create a strong password"
//                   className="bg-input border-border focus-visible:ring-primary h-10 pr-10"
//                   required
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
//                 >
//                   {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
//                 </button>
//               </div>
//             </div>

//             {/* Confirm Password */}
//             <div className="space-y-2">
//               <Label htmlFor="confirm-password" className="text-sm font-semibold text-foreground">
//                 Confirm Password
//               </Label>
//               <div className="relative">
//                 <Input
//                   id="confirm-password"
//                   type={showConfirmPassword ? 'text' : 'password'}
//                   placeholder="Confirm your password"
//                   className="bg-input border-border focus-visible:ring-primary h-10 pr-10"
//                   required
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
//                 >
//                   {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
//                 </button>
//               </div>
//             </div>

//             {/* Terms */}
//             <label className="flex items-start gap-2 cursor-pointer">
//               <input
//                 type="checkbox"
//                 className="rounded border-border bg-input cursor-pointer mt-1"
//                 required
//               />
//               <span className="text-xs text-muted-foreground">
//                 I agree to the{' '}
//                 <Link href="#" className="text-primary hover:underline font-medium">
//                   terms of service
//                 </Link>{' '}
//                 and{' '}
//                 <Link href="#" className="text-primary hover:underline font-medium">
//                   privacy policy
//                 </Link>
//               </span>
//             </label>

//             {/* Submit Button */}
//             <Button
//               type="submit"
//               className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-10 font-semibold rounded-lg transition-all duration-200"
//               disabled={isLoading}
//             >
//               {isLoading ? 'Creating account...' : 'Create Account'}
//             </Button>
//           </form>

//           {/* Sign In Link */}
//           <p className="text-center text-sm text-muted-foreground mt-6">
//             Already have an account?{' '}
//             <Link href="/login" className="text-primary hover:underline font-medium">
//               Sign in
//             </Link>
//           </p>
//         </div>
//       </Card>
//     </div>
//   )
// }
"use client";

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, GraduationCap, Users, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client' // ✅ added

export default function SignupPage() {
  const supabase = createClient() // ✅ added
  const router = useRouter() // ✅ added

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [role, setRole] = useState('')

  // ✅ added states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [prn, setPrn] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // ✅ UPDATED FUNCTION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!role) {
      alert("Please select a role")
      return
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match")
      return
    }

    if (role === 'student' && !prn.trim()) {
      alert('Please enter PRN number')
      return
    }

    setIsLoading(true)

    // 🔐 signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          prn: role === 'student' ? prn.trim() : '',
        },
      },
    })

    if (error) {
      alert(error.message)
      setIsLoading(false)
      return
    }

    const user = data.user

    if (!user) {
      alert('Unexpected signup error; user record missing')
      setIsLoading(false)
      return
    }

    alert('Signup successful! You can now log in directly.')
    setIsLoading(false)
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <div className="p-8">

          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
              MM
            </div>
            <span className="text-xl font-semibold text-foreground">Mentor Mentee Hub</span>
          </div>

          {/* Heading */}
          <div className="space-y-2 text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
            <p className="text-muted-foreground text-sm">
              Join Mentor Mentee Hub platform
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Role Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">
                Select Your Role
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'hod', label: 'HOD', icon: UserCog },
                  { id: 'mentor', label: 'Mentor', icon: Users },
                  { id: 'student', label: 'Student', icon: GraduationCap },
                ].map((roleOption) => {
                  const Icon = roleOption.icon
                  return (
                    <button
                      key={roleOption.id}
                      type="button"
                      onClick={() => setRole(roleOption.id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all duration-200 ${
                        role === roleOption.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-input hover:border-primary/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{roleOption.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-foreground">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-input border-border focus-visible:ring-primary h-10"
                required
              />
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input border-border focus-visible:ring-primary h-10"
                required
              />
            </div>

            {role === 'student' && (
              <div className="space-y-2">
                <Label htmlFor="prn" className="text-sm font-semibold text-foreground">
                  PRN Number
                </Label>
                <Input
                  id="prn"
                  type="text"
                  placeholder="Enter your PRN number"
                  value={prn}
                  onChange={(e) => setPrn(e.target.value)}
                  className="bg-input border-border focus-visible:ring-primary h-10"
                  required={role === 'student'}
                />
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="bg-input border-border focus-visible:ring-primary h-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-semibold text-foreground">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="bg-input border-border focus-visible:ring-primary h-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-border bg-input cursor-pointer mt-1"
                required
              />
              <span className="text-xs text-muted-foreground">
                I agree to the{' '}
                <Link href="#" className="text-primary hover:underline font-medium">
                  terms of service
                </Link>{' '}
                and{' '}
                <Link href="#" className="text-primary hover:underline font-medium">
                  privacy policy
                </Link>
              </span>
            </label>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-10 font-semibold rounded-lg transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>

        </div>
      </Card>
    </div>
  )
}
