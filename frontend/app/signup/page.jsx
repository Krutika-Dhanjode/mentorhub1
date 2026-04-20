"use client";
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, GraduationCap, Users, UserCog, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
    const supabase = createClient();
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [role, setRole] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [prn, setPrn] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // OTP States
    const [isOtpStep, setIsOtpStep] = useState(false);
    const [otpValue, setOtpValue] = useState('');
    const [otpHash, setOtpHash] = useState('');
    const [otpExpiresAt, setOtpExpiresAt] = useState('');

    const handleInitialSubmit = async (e) => {
        e.preventDefault();
        const normalizedPrn = prn.trim().toUpperCase();
        if (!role) {
            alert("Please select a role");
            return;
        }
        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }
        if (role === 'student' && !normalizedPrn) {
            alert('Please enter PRN number');
            return;
        }
        if (role === 'student') {
            const { data: existingPrnUser, error: existingPrnError } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'student')
                .eq('prn', normalizedPrn)
                .maybeSingle();
            if (existingPrnError) {
                alert('Unable to verify PRN right now: ' + existingPrnError.message);
                return;
            }
            if (existingPrnUser) {
                alert('This PRN is already registered.');
                return;
            }
        }
        setIsLoading(true);
        // Send OTP
        try {
            const res = await fetch("/api/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), type: "signup" })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            setOtpHash(data.hash);
            setOtpExpiresAt(data.expiresAt);
            setIsOtpStep(true);
        } catch (error) {
            alert(error.message || "Failed to send OTP. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        if (!otpValue) return alert("Please enter the OTP");

        setIsLoading(true);
        try {
            // Verify OTP
            const verifyRes = await fetch("/api/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    otp: otpValue,
                    hash: otpHash,
                    expiresAt: otpExpiresAt
                })
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error);

            const normalizedPrn = prn.trim().toUpperCase();

            // Proceed with Supabase Signup
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        name: name.trim(),
                        role,
                        prn: role === 'student' ? normalizedPrn : '',
                    },
                },
            });

            if (error) throw new Error(error.message);

            const user = data.user;
            if (!user) throw new Error('Unexpected signup error; user record missing');

            const { error: profileSaveError } = await supabase
                .from('users')
                .upsert({
                id: user.id,
                name: name.trim(),
                full_name: name.trim(),
                email: email.trim().toLowerCase(),
                role,
                prn: role === 'student' ? normalizedPrn : null,
            });

            if (profileSaveError) throw new Error('Signup succeeded, but saving profile failed: ' + profileSaveError.message);

            alert('Signup successful! You can now log in directly.');
            router.push('/login');
        } catch (error) {
            alert(error.message || "Signup failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent/10 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg border-0">
                <div className="p-8">
                    <div className="mb-6 flex items-center justify-center gap-3">
                        <Image src="/logo1.jpeg" alt="Mentor Mentee Hub logo" width={48} height={48} className="h-12 w-12 object-contain" priority/>
                        <span className="text-xl font-semibold text-foreground">Mentor Mentee Hub</span>
                    </div>

                    {!isOtpStep ? (
                        <>
                            <div className="space-y-2 text-center mb-6">
                                <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
                                <p className="text-muted-foreground text-sm">Join Mentor Mentee Hub platform</p>
                            </div>

                            <form onSubmit={handleInitialSubmit} className="space-y-5">
                                {/* Role Selection */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold text-foreground">Select Your Role</Label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'hod', label: 'Admin', icon: UserCog },
                                        { id: 'mentor', label: 'Mentor', icon: Users },
                                        { id: 'student', label: 'Student', icon: GraduationCap },
                                    ].map((roleOption) => {
                                        const Icon = roleOption.icon;
                                        return (
                                            <button key={roleOption.id} type="button" onClick={() => setRole(roleOption.id)} className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all duration-200 ${role === roleOption.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-input hover:border-primary/50 text-muted-foreground hover:text-foreground'}`}>
                                                <Icon className="w-5 h-5"/>
                                                <span className="text-xs font-medium">{roleOption.label}</span>
                                            </button>
                                        );
                                    })}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="name" className="text-sm font-semibold text-foreground">Full Name</Label>
                                  <Input id="name" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className="bg-input border-border focus-visible:ring-primary h-10" required/>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="email" className="text-sm font-semibold text-foreground">Email Address</Label>
                                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-input border-border focus-visible:ring-primary h-10" required/>
                                </div>

                                {role === 'student' && (
                                  <div className="space-y-2">
                                    <Label htmlFor="prn" className="text-sm font-semibold text-foreground">PRN Number</Label>
                                    <Input id="prn" type="text" placeholder="Enter your PRN number" value={prn} onChange={(e) => setPrn(e.target.value)} className="bg-input border-border focus-visible:ring-primary h-10" required={role === 'student'}/>
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <Label htmlFor="password" className="text-sm font-semibold text-foreground">Password</Label>
                                  <div className="relative">
                                    <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a strong password" className="bg-input border-border focus-visible:ring-primary h-10 pr-10" required/>
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                      {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="confirm-password" className="text-sm font-semibold text-foreground">Confirm Password</Label>
                                  <div className="relative">
                                    <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" className="bg-input border-border focus-visible:ring-primary h-10 pr-10" required/>
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                      {showConfirmPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                    </button>
                                  </div>
                                </div>

                                <label className="flex items-start gap-2 cursor-pointer">
                                  <input type="checkbox" className="rounded border-border bg-input cursor-pointer mt-1" required/>
                                  <span className="text-xs text-muted-foreground">
                                    I agree to the <Link href="#" className="text-primary hover:underline font-medium">terms of service</Link> and <Link href="#" className="text-primary hover:underline font-medium">privacy policy</Link>
                                  </span>
                                </label>

                                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-10 font-semibold rounded-lg transition-all duration-200" disabled={isLoading}>
                                  {isLoading ? 'Creating account...' : 'Create Account'}
                                </Button>
                            </form>

                            <p className="text-center text-sm text-muted-foreground mt-6">
                                Already have an account? <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2 text-center mb-6">
                                <div className="flex justify-center mb-2">
                                    <div className="p-3 bg-primary/10 rounded-full">
                                        <KeyRound className="w-6 h-6 text-primary" />
                                    </div>
                                </div>
                                <h1 className="text-2xl font-bold text-foreground">Verify OTP</h1>
                                <p className="text-muted-foreground text-sm">
                                    We&apos;ve sent a 6-digit code to <strong>{email}</strong>
                                </p>
                            </div>
                            
                            <form onSubmit={handleOtpSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="otp" className="text-sm font-semibold text-foreground">OTP Code</Label>
                                    <Input 
                                        id="otp" 
                                        type="text" 
                                        maxLength={6}
                                        placeholder="000000" 
                                        value={otpValue} 
                                        onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))} 
                                        className="bg-input border-border focus-visible:ring-primary h-12 text-center text-xl tracking-widest" 
                                        required
                                    />
                                </div>
                                
                                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 font-semibold rounded-lg transition-all duration-200" disabled={isLoading || otpValue.length !== 6}>
                                    {isLoading ? 'Verifying...' : 'Verify & Complete Signup'}
                                </Button>

                                <p className="text-center text-sm text-muted-foreground">
                                    <button type="button" onClick={() => setIsOtpStep(false)} className="text-primary hover:underline font-medium">
                                        Back to details
                                    </button>
                                </p>
                            </form>
                        </>
                    )}
                </div>
            </Card>
        </div>
    );
}
