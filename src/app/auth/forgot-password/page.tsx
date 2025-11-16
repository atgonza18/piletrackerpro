"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const router = useRouter();
  const { resetPassword, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Reset form errors
    setFormErrors({});
    
    // Validate form
    if (!email) {
      setFormErrors(prev => ({ ...prev, email: "Email is required" }));
      return;
    }
    
    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        console.error("Error sending reset password email:", error.message);
        toast.error("Failed to send reset link. Please try again later.");
      } else {
        setIsSubmitted(true);
        toast.success("Reset link sent successfully!");
      }
    } catch (error) {
      console.error("Unexpected error during password reset:", error);
      toast.error("An unexpected error occurred. Please try again later.");
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-50">
      {/* Left panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-600 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 opacity-90"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,transparent_60%)]"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-10 w-10 rounded-lg bg-white text-slate-600 flex items-center justify-center font-bold text-xl">PT</div>
            <h1 className="text-2xl font-bold">PileTrackerPro</h1>
          </div>
          
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-6">Reset your password</h2>
            <p className="text-slate-200 text-lg mb-8">
              Don't worry, it happens to the best of us. Let's get you back on track.
            </p>
          </div>
        </div>
        
        <div className="relative z-10 text-sm text-slate-300">
          &copy; {new Date().getFullYear()} PileTrackerPro. All rights reserved.
        </div>
      </div>
      
      {/* Right panel with form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="lg:hidden mb-10 flex flex-col items-center">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold text-2xl mb-3 shadow-lg">
            PT
          </div>
          <h1 className="text-2xl font-bold text-slate-900">PileTrackerPro</h1>
        </div>
        
        <Card className="w-full max-w-md border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <CardHeader className="pb-2 pt-6 px-6">
                <div className="flex items-center mb-4">
                  <Link 
                    href="/auth" 
                    className="rounded-full h-9 w-9 inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="Back to login"
                  >
                    <ArrowLeft size={18} />
                  </Link>
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900">Reset password</CardTitle>
                <CardDescription className="text-slate-500">
                  Enter your email address and we'll send you a link to reset your password.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-5 px-6">
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                      <Mail size={18} />
                    </div>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@example.com" 
                      className={`h-11 pl-10 border-slate-200 focus:border-slate-500 focus:ring-slate-500 ${
                        formErrors.email ? "border-red-500" : ""
                      }`}
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {formErrors.email && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-4 px-6 pb-6">
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-md transition-all" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending reset link...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      Send reset link <ArrowRight size={16} className="ml-2" />
                    </div>
                  )}
                </Button>
                <div className="text-center">
                  <Link href="/auth" className="text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors">
                    Back to login
                  </Link>
                </div>
              </CardFooter>
            </form>
          ) : (
            <div className="p-6 space-y-6">
              <CardHeader className="p-0 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900 text-center">Check your email</CardTitle>
                <CardDescription className="text-center text-slate-500">
                  We've sent a password reset link to <span className="font-semibold text-slate-900">{email}</span>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-0 space-y-5">
                <div className="p-4 bg-slate-100 rounded-lg text-slate-700 text-sm">
                  <p>
                    If you don&apos;t see it in your inbox, please check your spam folder.
                    The link will expire in 1 hour.
                  </p>
                </div>
              </CardContent>
              
              <CardFooter className="p-0 pt-2">
                <Button 
                  variant="outline"
                  className="w-full h-11 border-slate-200 hover:bg-slate-50 transition-colors" 
                  onClick={() => router.push("/auth")}
                >
                  Return to login
                </Button>
              </CardFooter>
            </div>
          )}
        </Card>
        
        <div className="mt-8 text-center text-sm text-slate-500 lg:hidden">
          <p className="flex items-center justify-center">
            <svg className="h-4 w-4 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Protected by industry-standard encryption
          </p>
          <p className="mt-2">
            &copy; {new Date().getFullYear()} PileTrackerPro. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
} 