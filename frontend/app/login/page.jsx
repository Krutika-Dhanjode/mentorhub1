"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, GraduationCap, Users, UserCog, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  useEffect(() => {
    // This allows us to intercept the back button
    window.history.pushState(null, null, window.location.pathname);
    
    const handlePopState = () => {
      router.push("/");
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  const roles = [
    { id: "hod", label: "Admin", icon: UserCog },
    { id: "mentor", label: "Mentor", icon: Users },
    { id: "student", label: "Student", icon: GraduationCap },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedRole) {
      alert("Please select a role");
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          alert(
            "Your email is not confirmed yet. Open the verification email from Supabase and confirm it, then try again."
          );
        } else {
          alert(error.message);
        }
        return;
      }

      const user = data?.user;
      if (!user?.id) {
        alert("Sign in succeeded but no user session was returned. Please try again.");
        return;
      }

      const { data: userData, error: roleError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (roleError || !userData) {
        alert("User role not found");
        return;
      }

      if (userData.role !== selectedRole) {
        alert("Wrong role selected!");
        await supabase.auth.signOut();
        return;
      }

      if (selectedRole === "hod") {
        router.push("/dashboard/hod/mentors");
      } else if (selectedRole === "mentor") {
        router.push("/dashboard/mentor/students");
      } else {
        router.push("/dashboard/student/meetings");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("failed to fetch")) {
        alert(
          "Unable to reach Supabase right now. Check internet, Vercel env vars, and ensure the project is active."
        );
      } else {
        alert(message || "Unable to sign in right now.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent/10 p-4 flex flex-col">


      <div className="flex-1 flex items-center justify-center -mt-16">
        <Card className="w-full max-w-md shadow-lg border-0">
          <div className="p-8">
            <Link href="/" className="flex items-center justify-center gap-2 mb-6 hover:opacity-80 transition-opacity">
              <Image
                src="/logo1.jpeg"
                alt="Mentor Mentee Hub logo"
                width={36}
                height={36}
                className="h-9 w-9 rounded-md object-contain"
                priority
              />
              <span className="font-semibold text-base text-foreground">Mentor Mentee Hub</span>
            </Link>

            <div className="space-y-2 text-center mb-6">
              <h1 className="text-xl font-semibold">Welcome Back</h1>
              <p className="text-muted-foreground text-sm">Sign in to access the mentorship platform</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Select Your Role</Label>
                <div className="grid grid-cols-3 gap-2">
                  {roles.map((role) => {
                    const Icon = role.icon;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id)}
                        className={`p-3 border rounded ${
                          selectedRole === role.id ? "border-primary bg-primary/10" : ""
                        }`}
                      >
                        <Icon className="w-5 h-5 mx-auto" />
                        <span className="text-xs">{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button type="submit" className="w-full h-10 font-semibold" disabled={isLoading || !selectedRole}>
                {isLoading ? "Processing..." : "Sign In"}
              </Button>
            </form>

            <p className="text-center mt-4 text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
