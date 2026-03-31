"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, GraduationCap, Users, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client"; // ✅ added

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient(); // ✅ added

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const [email, setEmail] = useState(""); // ✅ added
  const [password, setPassword] = useState(""); // ✅ added

  const roles = [
    { id: "hod", label: "HOD", icon: UserCog },
    { id: "mentor", label: "Mentor", icon: Users },
    { id: "student", label: "Student", icon: GraduationCap },
  ];

  // ✅ UPDATED LOGIN FUNCTION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole) {
      alert("Please select a role");
      return;
    }

    setIsLoading(true);

    // 🔐 LOGIN
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        alert("Your email is not confirmed yet. Please open the verification email from Supabase in your inbox and click the confirm link, then try signing in again.");
      } else {
        alert(error.message);
      }
      setIsLoading(false);
      return;
    }

    const user = data.user;

    // 🔍 FETCH ROLE FROM DB
    const { data: userData, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || !userData) {
      alert("User role not found");
      setIsLoading(false);
      return;
    }

    // ❌ ROLE MISMATCH
    if (userData.role !== selectedRole) {
      alert("Wrong role selected!");
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }

    // ✅ REDIRECT
    if (selectedRole === "hod") {
      router.push("/dashboard/hod/mentors");
    } else if (selectedRole === "mentor") {
      router.push("/dashboard/mentor/students");
    } else {
      router.push("/dashboard/student/meetings");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <div className="p-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              MM
            </div>
            <span className="font-semibold text-base text-foreground">
              Mentor Mentee Hub
            </span>
          </div>

          <div className="space-y-2 text-center mb-6">
            <h1 className="text-xl font-semibold">Welcome Back</h1>
            <p className="text-muted-foreground text-sm">
              Sign in to access the mentorship platform
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ROLE */}
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
                        selectedRole === role.id
                          ? "border-primary bg-primary/10"
                          : ""
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto" />
                      <span className="text-xs">{role.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* PASSWORD */}
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
                  className="absolute right-2 top-2"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* BUTTON */}
            <Button type="submit" disabled={isLoading || !selectedRole}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center mt-4 text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary">
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
