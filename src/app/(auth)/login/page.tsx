'use client';

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { initiateEmailSignIn } from "@/firebase/non-blocking-login";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { createInitialUserData } from "@/lib/firestore-data";

export default function LoginPage() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        // User is logged in, redirect to dashboard.
        router.push('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
        // Use the official signIn method, which we can await
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        // The onAuthStateChanged listener will handle the redirect
    } catch (err: any) {
        setError(err.message);
        toast({ variant: "destructive", title: "Login Failed", description: err.message });
        setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    if (!signupFirstName || !signupLastName) {
      setError("First and Last name are required.");
      toast({ variant: "destructive", title: "Sign Up Failed", description: "First and Last name are required." });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      const newUser = userCredential.user;
      
      // Now that user is created, create their data in Firestore
      await createInitialUserData(firestore, newUser, signupFirstName, signupLastName);
      
      toast({ title: "Welcome!", description: "Your account and trading profile have been created." });
      // The onAuthStateChanged listener will handle the redirect
    } catch (err: any) {
      setError(err.message);
      toast({ variant: "destructive", title: "Sign Up Failed", description: err.message });
      setLoading(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Tabs defaultValue="login" className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <Logo className="mb-4 justify-center" />
            <CardTitle className="font-headline text-3xl">Welcome</CardTitle>
            <CardDescription>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardDescription>
          </CardHeader>
          <TabsContent value="login">
            <CardContent>
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="trader@example.com" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full !mt-6" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            </CardContent>
          </TabsContent>
          <TabsContent value="signup">
            <CardContent>
              <form className="space-y-4" onSubmit={handleSignUp}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input id="first-name" placeholder="John" required value={signupFirstName} onChange={(e) => setSignupFirstName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input id="last-name" placeholder="Doe" required value={signupLastName} onChange={(e) => setSignupLastName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="trader@example.com" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" required minLength={6} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full !mt-6" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Start Free Trial'}
                </Button>
              </form>
            </CardContent>
          </TabsContent>
          {error && <p className="p-4 text-center text-sm text-destructive">{error}</p>}
        </Card>
      </Tabs>
    </div>
  );
}
