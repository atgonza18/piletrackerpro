"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ProjectSelector } from "@/components/ProjectSelector";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);
  const [accountType, setAccountType] = useState("epc"); // "epc" or "owner"
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const router = useRouter();
  const { signIn, signUp, isLoading, user, refreshUserSession } = useAuth();

  // Handle refresh token error
  const handleRefreshTokenError = async () => {
    toast.error("Your session has expired. Please log in again.");
    try {
      await refreshUserSession();
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  };

  // Check for refresh token errors in URL
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const errorParam = query.get('error');
    const errorDescription = query.get('error_description');
    
    if (errorParam === 'invalid_grant' || (errorDescription && errorDescription.includes('Refresh Token'))) {
      console.log('Detected refresh token error in URL, attempting to refresh session');
      handleRefreshTokenError();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [handleRefreshTokenError]);

  // Check for email confirmation redirect
  useEffect(() => {
    // Check if this is a redirect back after email confirmation
    const query = new URLSearchParams(window.location.search);
    const isConfirmation = query.get('confirm') === 'true';
    
    if (isConfirmation) {
      toast.success("Email confirmed successfully! Please log in to continue.");
      // Remove the query parameter to avoid showing the message again on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      // Defer redirection to AuthContext to ensure consistent behavior
      console.log("User is already logged in, AuthContext will handle redirection");
    }
  }, [user, router]);

  // Simulate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    
    let strength = 0;
    // Length check
    if (password.length >= 8) strength += 1;
    // Contains number
    if (/\d/.test(password)) strength += 1;
    // Contains special char
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  }, [password]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Reset form errors
    setFormErrors({});
    
    // Validate form
    if (!email) {
      setFormErrors(prev => ({ ...prev, email: "Email is required" }));
      return;
    }
    
    if (!password) {
      setFormErrors(prev => ({ ...prev, password: "Password is required" }));
      return;
    }
    
    try {
      const { data, error } = await signIn(email, password);
      
      if (error) {
        console.error("Error signing in:", error.message);
        
        if (error.message && error.message.includes("Invalid Refresh Token")) {
          // Handle refresh token error
          handleRefreshTokenError();
          return;
        } else if (error.message && error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password. Please try again.");
        } else {
          toast.error("An error occurred. Please try again later.");
        }
        return;
      }
      
      // Successfully logged in
      console.log("Login successful, checking if project setup is needed");
      
      // Check if user has completed project setup
      const { data: userProject, error: projectError } = await supabase
        .from('user_projects')
        .select('id')
        .eq('user_id', data.session.user.id)
        .maybeSingle();
      
      if (projectError) {
        console.error("Error checking user project:", projectError);
        return;
      }
      
      if (!userProject) {
        // New user who needs to complete project setup
        console.log("New user, redirecting to project setup");
        // Set a flag in localStorage to indicate this user needs project setup
        localStorage.setItem('needs_project_setup', 'true');
        router.push("/project-setup");
      } else {
        // Existing user, redirect to dashboard
        console.log("Existing user, redirecting to dashboard");
        // Clear the flag in case it was set previously
        localStorage.removeItem('needs_project_setup');
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Unexpected error during sign in:", error);
      toast.error("An unexpected error occurred. Please try again later.");
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Reset form errors
    setFormErrors({});
    
    // Validate form
    if (!email) {
      setFormErrors(prev => ({ ...prev, email: "Email is required" }));
      return;
    }
    
    if (!password) {
      setFormErrors(prev => ({ ...prev, password: "Password is required" }));
      return;
    }
    
    if (password.length < 8) {
      setFormErrors(prev => ({ ...prev, password: "Password must be at least 8 characters" }));
      return;
    }
    
    if (password !== confirmPassword) {
      setFormErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match" }));
      return;
    }
    
    if (!agreeToTerms) {
      setFormErrors(prev => ({ ...prev, terms: "You must agree to the terms" }));
      return;
    }
    
    try {
      // Attempt to sign up the user
      const { data, error } = await signUp(email, password, {
        first_name: firstName,
        last_name: lastName
      });
      
      if (error) {
        console.error("Error signing up:", error.message);
        
        if (error.message.includes("User already registered")) {
          toast.error("This email is already registered. Try logging in instead.");
        } else {
          toast.error("An error occurred. Please try again later.");
        }
        return;
      }
      
      // Check if email confirmation is needed
      if (data?.user && !data.user.confirmed_at) {
        // Email confirmation is needed
        setEmailConfirmationSent(true);
        toast.success("Registration successful! Please check your email to confirm your account before logging in.");
        
        // Switch to login tab after successful registration
        setActiveTab("login");
      } else {
        // No email confirmation needed, proceed with login
        toast.success("Registration successful! Signing you in...");
        
        // Sign in the user
        const { error: signInError } = await signIn(email, password);
        
        if (signInError) {
          console.error("Error signing in after registration:", signInError.message);
          toast.error("Account created but couldn't log in automatically. Please log in manually.");
        }
      }
    } catch (error) {
      console.error("Unexpected error during sign up:", error);
      toast.error("An unexpected error occurred. Please try again later.");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (accountType === "owner" && !selectedProjectId) {
      toast.error("Please select a project");
      return;
    }
    
    try {
      const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            account_type: accountType,
            project_id: selectedProjectId
          }
        }
      });

      if (error) throw error;

      if (user) {
        // If it's an owner account, create the user-project association
        if (accountType === "owner" && selectedProjectId) {
          const { error: projectError } = await supabase
            .from('user_projects')
            .insert({
              user_id: user.id,
              project_id: selectedProjectId,
              role: 'owner',
              is_owner: false
            });

          if (projectError) {
            console.error("Error associating user with project:", projectError);
            toast.error("Failed to set up project access");
            return;
          }
        }

        toast.success("Sign up successful! Please check your email for verification.");
        router.push("/project-setup");
      }
    } catch (error) {
      console.error("Error signing up:", error);
      toast.error("Failed to sign up. Please try again.");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex min-h-screen h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50 w-full">
      {/* Left panel with logo - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,transparent_60%)]"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-10 w-10 rounded-lg bg-white text-blue-600 flex items-center justify-center font-bold text-xl">PT</div>
            <h1 className="text-2xl font-bold">PileTrackerPro</h1>
          </div>
        </div>
        
        <div className="relative z-10 text-sm text-blue-200">
          &copy; {new Date().getFullYear()} PileTrackerPro. All rights reserved.
        </div>
      </div>
      
      {/* Right panel with auth forms */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="lg:hidden mb-10 flex flex-col items-center">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-2xl mb-3 shadow-lg">
            PT
          </div>
          <h1 className="text-2xl font-bold text-slate-900">PileTrackerPro</h1>
          <p className="text-slate-500 text-sm mt-1">Track your piles, organize your life</p>
        </div>
        
        <Card className="w-full max-w-md border-0 shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden">
          {/* Custom Tab Header - Outside the Card Content */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 text-center py-4 px-5 text-sm font-medium transition-colors relative
                ${activeTab === "login" 
                  ? "text-blue-600" 
                  : "text-slate-500 hover:text-slate-800"
                }`}
              type="button"
            >
              Log In
              {activeTab === "login" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`flex-1 text-center py-4 px-5 text-sm font-medium transition-colors relative
                ${activeTab === "register" 
                  ? "text-blue-600" 
                  : "text-slate-500 hover:text-slate-800"
                }`}
              type="button"
            >
              Sign Up
              {activeTab === "register" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>
              )}
            </button>
          </div>
          
          {/* Login Form */}
          {activeTab === "login" && (
            <form onSubmit={handleLogin} className="space-y-6">
              <CardHeader className="pb-2 pt-6 px-6">
                <CardTitle className="text-2xl font-bold text-slate-900">Welcome back</CardTitle>
                <CardDescription className="text-slate-500">
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-5 px-6">
                {emailConfirmationSent && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4">
                    <p className="text-sm text-blue-700">
                      <strong>Check your email!</strong> We've sent a confirmation link to {email}. 
                      Please verify your email address before logging in.
                    </p>
                  </div>
                )}
                <div className="space-y-2.5">
                  <Label htmlFor="login-email" className="text-sm font-medium text-slate-700">
                    Email
                  </Label>
                  <Input 
                    id="login-email" 
                    type="email" 
                    placeholder="name@example.com" 
                    className={`h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 ${
                      formErrors.email ? "border-red-500" : ""
                    }`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-sm font-medium text-slate-700">
                      Password
                    </Label>
                    <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input 
                      id="login-password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      className={`h-11 pr-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 ${
                        formErrors.password ? "border-red-500" : ""
                      }`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                    <button 
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      onClick={togglePasswordVisibility}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="remember" className="text-sm text-slate-600">
                    Remember me for 30 days
                  </label>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col px-6 pb-6">
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Logging in...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      Log in <ArrowRight size={16} className="ml-2" />
                    </div>
                  )}
                </Button>
                
                <div className="mt-6 text-center text-sm text-slate-500">
                  Don&apos;t have an account?{" "}
                  <button 
                    type="button" 
                    className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    onClick={() => setActiveTab("register")}
                  >
                    Sign up
                  </button>
                </div>
              </CardFooter>
            </form>
          )}
          
          {/* Register Form */}
          {activeTab === "register" && (
            <form onSubmit={(e) => {
              e.preventDefault();
              
              // Validate form
              const errors: { [key: string]: string } = {};
              
              if (!email) {
                errors.email = "Email is required";
              }
              
              if (!password) {
                errors.password = "Password is required";
              }
              
              if (password.length < 8) {
                errors.password = "Password must be at least 8 characters";
              }
              
              if (password !== confirmPassword) {
                errors.confirmPassword = "Passwords do not match";
              }
              
              if (!agreeToTerms) {
                errors.terms = "You must agree to the terms";
              }
              
              if (accountType === "owner" && !selectedProjectId) {
                errors.project = "Please select a project";
              }
              
              if (Object.keys(errors).length > 0) {
                setFormErrors(errors);
                return;
              }
              
              // All validation passed, proceed with sign up
              handleSignUp(e);
            }} className="space-y-6">
              <CardHeader className="pb-2 pt-6 px-6">
                <CardTitle className="text-2xl font-bold text-slate-900">Create an account</CardTitle>
                <CardDescription className="text-slate-500">
                  Enter your information to create your account
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-5 px-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">First name</Label>
                    <Input 
                      id="firstName" 
                      placeholder="John"
                      className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">Last name</Label>
                    <Input 
                      id="lastName" 
                      placeholder="Doe"
                      className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required 
                    />
                  </div>
                </div>
                
                <div className="space-y-2.5">
                  <Label htmlFor="register-email" className="text-sm font-medium text-slate-700">Email</Label>
                  <Input 
                    id="register-email" 
                    type="email" 
                    placeholder="name@example.com" 
                    className={`h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 ${
                      formErrors.email ? "border-red-500" : ""
                    }`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2.5">
                  <Label htmlFor="register-password" className="text-sm font-medium text-slate-700">Password</Label>
                  <div className="relative">
                    <Input 
                      id="register-password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      className={`h-11 pr-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 ${
                        formErrors.password ? "border-red-500" : ""
                      }`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                    <button 
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      onClick={togglePasswordVisibility}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  {/* Password strength indicator */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex h-1.5 w-full gap-1.5 mb-1.5">
                        {[1, 2, 3, 4].map((segment) => (
                          <div 
                            key={segment}
                            className={`h-full w-1/4 rounded-full ${
                              segment <= passwordStrength 
                                ? segment <= 1 ? "bg-red-500" 
                                : segment <= 2 ? "bg-orange-500" 
                                : segment <= 3 ? "bg-yellow-500" 
                                : "bg-green-500"
                                : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">
                        {passwordStrength === 0 && "Enter a password"}
                        {passwordStrength === 1 && "Weak password"}
                        {passwordStrength === 2 && "Fair password"}
                        {passwordStrength === 3 && "Good password"}
                        {passwordStrength === 4 && "Strong password"}
                      </p>
                    </div>
                  )}
                  {formErrors.password && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
                  )}
                </div>
                
                <div className="space-y-2.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className={`h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 ${
                      formErrors.confirmPassword ? "border-red-500" : ""
                    }`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                  />
                  {formErrors.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.confirmPassword}</p>
                  )}
                </div>
                
                <div className="space-y-3">
                  <Label>Account Type</Label>
                  <RadioGroup 
                    defaultValue="epc" 
                    value={accountType}
                    onValueChange={setAccountType}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem
                        value="epc"
                        id="epc"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="epc"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-slate-50 [&:has([data-state=checked])]:border-blue-600 [&:has([data-state=checked])]:bg-blue-50"
                      >
                        <Building2 className="mb-2 h-6 w-6 text-blue-600" />
                        <div className="space-y-1">
                          <h3 className="font-semibold">EPC Account</h3>
                          <p className="text-sm text-slate-500">
                            Full access to manage and edit projects
                          </p>
                        </div>
                      </Label>
                    </div>

                    <div>
                      <RadioGroupItem
                        value="owner"
                        id="owner"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="owner"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-slate-50 [&:has([data-state=checked])]:border-blue-600 [&:has([data-state=checked])]:bg-blue-50"
                      >
                        <Eye className="mb-2 h-6 w-6 text-blue-600" />
                        <div className="space-y-1">
                          <h3 className="font-semibold">Owner's Rep</h3>
                          <p className="text-sm text-slate-500">
                            View-only access to monitor progress
                          </p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Project Selection - Only show for Owner's Rep accounts */}
                {accountType === "owner" && (
                  <div className="space-y-3">
                    <Label>Select Project</Label>
                    <ProjectSelector onProjectSelect={setSelectedProjectId} />
                    <p className="text-sm text-slate-500">
                      Choose the project you want to monitor. You'll have view-only access to all data for this project.
                    </p>
                  </div>
                )}
                
                <div className="flex items-center pt-2">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      id="terms"
                      required
                      className={`h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${
                        formErrors.terms ? "border-red-500" : ""
                      }`}
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                    />
                  </div>
                  <div className="ml-2 text-sm">
                    <label htmlFor="terms" className={`text-slate-600 ${
                      formErrors.terms ? "text-red-500" : ""
                    }`}>
                      I agree to the <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">Terms of Service</a> and <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">Privacy Policy</a>
                    </label>
                  </div>
                </div>
                {formErrors.terms && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.terms}</p>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col px-6 pb-6">
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      Create account <ArrowRight size={16} className="ml-2" />
                    </div>
                  )}
                </Button>
                
                <div className="mt-6 text-center text-sm text-slate-500">
                  Already have an account?{" "}
                  <button 
                    type="button" 
                    className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    onClick={() => setActiveTab("login")}
                  >
                    Log in
                  </button>
                </div>
              </CardFooter>
            </form>
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