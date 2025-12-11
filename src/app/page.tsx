'use client';

import {
  AreaChart,
  Bot,
  Check,
  ChevronRight,
  LayoutDashboard,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/logo';
import React, { useEffect, useState } from 'react';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const StatCounter = ({ to, label, prefix = '', suffix = '' }: { to: number; label: string; prefix?: string; suffix?: string }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const stepTime = Math.abs(Math.floor(duration / to));
    let currentCount = 0;
    const timer = setInterval(() => {
      currentCount += 1;
      setCount(currentCount);
      if (currentCount === to) {
        clearInterval(timer);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [to]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M+';
    if (num >= 1000) return num.toLocaleString() + '+';
    return num.toFixed(1);
  };

  const displayValue = label === 'Profits Generated' ? formatNumber(to) : (label === 'Active Traders' ? to.toLocaleString() + '+' : to.toFixed(1));

  return (
    <div className="text-center">
      <p className="font-headline text-4xl font-bold text-primary md:text-5xl">
        {prefix}{displayValue}{suffix}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
};


const LandingPage = () => {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };

  const features = [
    {
      icon: <Bot className="h-8 w-8 text-primary" />,
      title: 'Set & Forget',
      description: 'Configure once in the morning, and our AI trades for you all day, automatically.',
    },
    {
      icon: <AreaChart className="h-8 w-8 text-primary" />,
      title: 'Multi-Strategy AI',
      description: 'Our bot adapts to trending, ranging, and volatile markets to find profitable opportunities.',
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: 'Risk-First Design',
      description: 'Your capital is protected with our iron-clad risk management. Never lose more than you allow.',
    },
    {
      icon: <LayoutDashboard className="h-8 w-8 text-primary" />,
      title: 'Live Dashboard',
      description: 'Monitor your account growth in real-time with our intuitive and data-rich dashboard.',
    },
  ];

  const pricingTiers = [
    {
      name: 'Basic',
      price: 99,
      features: ['5 auto-trades per day', 'Basic risk management', 'Email support', '70% accuracy target'],
      popular: false,
    },
    {
      name: 'Pro',
      price: 299,
      features: ['Unlimited auto-trades', 'Advanced AI strategies', 'Priority signals', 'Phone/chat support', '75% accuracy target'],
      popular: true,
    },
    {
      name: 'Institutional',
      price: 999,
      features: ['Everything in Pro +', 'Custom risk parameters', 'Dedicated account manager', 'API access', '78% accuracy target'],
      popular: false,
    },
    {
      name: 'Lifetime',
      price: 4999,
      features: ['Permanent access', 'All future upgrades', 'VIP support', 'Profit sharing opportunity'],
      popular: false,
      isLifetime: true,
    },
  ];

  const testimonials = [
    {
      quote: "Bullionaire Bot changed the game for me. I was struggling with consistency, and now I'm hitting my profit targets every week without staring at charts all day.",
      author: 'Mark L.',
      image: "https://picsum.photos/seed/t1/48/48",
      rating: 5,
    },
    {
      quote: "The 'set and forget' feature is a lifesaver for my busy schedule. The results have been incredible. I've already made back my subscription fee 10x over.",
      author: 'Sarah K.',
      image: "https://picsum.photos/seed/t2/48/48",
      rating: 5,
    },
    {
      quote: "As a professional trader, I was skeptical. But the AI's ability to adapt to different market conditions is seriously impressive. Highly recommended for serious traders.",
      author: 'David Chen',
      image: "https://picsum.photos/seed/t3/48/48",
      rating: 5,
    },
  ];

  return (
    <div className="w-full bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link href="#features" className="transition-colors hover:text-primary">
              Features
            </Link>
            <Link href="#pricing" className="transition-colors hover:text-primary">
              Pricing
            </Link>
            <Link href="#referrals" className="transition-colors hover:text-primary">
              Referrals
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            {isUserLoading ? (
              <div className="h-10 w-24 animate-pulse rounded-md bg-muted"></div>
            ) : user ? (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button onClick={handleLogout}>Logout</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/login">Start Free Trial</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/10"></div>
            <div className="container relative mx-auto px-4 text-center md:px-6">
                <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-7xl">
                    Professional Gold Auto-Trading
                </h1>
                <p className="mt-4 text-lg text-muted-foreground md:text-xl">
                    AI-Powered • 24/7 Monitoring • Institutional Grade
                </p>
                <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
                    <StatCounter to={72} label="Average Win Rate" suffix="%" />
                    <StatCounter to={2} label="Average Risk/Reward" prefix="1:" />
                    <StatCounter to={2100000} label="Profits Generated" prefix="$" />
                    <StatCounter to={1842} label="Active Traders" />
                </div>
                <div className="mt-10">
                    <Button size="lg" asChild>
                        <Link href="/login">
                            Start 7-Day Free Trial
                            <ChevronRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-headline text-3xl font-bold md:text-4xl">Why Traders Trust Bullionaire Bot</h2>
              <p className="mt-4 text-muted-foreground">
                We've built a platform with one goal: to make you a profitable trader without the hassle.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <Card key={index} className="flex flex-col items-center p-6 text-center">
                  {feature.icon}
                  <h3 className="mt-4 text-xl font-bold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="bg-muted/40 py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-headline text-3xl font-bold md:text-4xl">Find the Perfect Plan</h2>
              <p className="mt-4 text-muted-foreground">Start with a 7-day free trial. Cancel anytime.</p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {pricingTiers.map((tier) => (
                <Card key={tier.name} className={`flex flex-col ${tier.popular ? 'border-primary ring-2 ring-primary' : ''}`}>
                  {tier.popular && (
                    <div className="bg-primary px-3 py-1 text-center text-sm font-semibold text-primary-foreground">
                      Most Popular
                    </div>
                  )}
                  <CardHeader className="items-center text-center">
                    <CardTitle className="font-headline text-2xl">{tier.name}</CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">${tier.isLifetime ? tier.price.toLocaleString() : tier.price}</span>
                      <span className="text-muted-foreground">{tier.isLifetime ? '/ one-time' : '/month'}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="space-y-3 text-sm">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start">
                          <Check className="mr-2 mt-1 h-4 w-4 shrink-0 text-accent" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" variant={tier.popular ? 'default' : 'outline'} asChild>
                      <Link href="/login">Choose Plan</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Referral Section */}
        <section id="referrals" className="py-20 md:py-28">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid gap-12 md:grid-cols-2 md:items-center">
                    <div>
                        <h2 className="font-headline text-3xl font-bold md:text-4xl">Earn While You Trade</h2>
                        <p className="mt-4 text-muted-foreground">
                            Our referral program is simple. You help us grow, we reward you. It's a win-win-win.
                        </p>
                        <Card className="mt-8 bg-muted/40">
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold">How It Works</h3>
                                <ul className="mt-4 space-y-4">
                                    <li className="flex items-start gap-4">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">1</div>
                                        <p><strong className="text-primary">You refer a friend.</strong> They sign up using your unique link.</p>
                                    </li>
                                    <li className="flex items-start gap-4">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">2</div>
                                        <div>
                                            <p className="font-semibold">Your friend gets 10% OFF their first month.</p>
                                            <p className="text-sm text-muted-foreground">An easy way for them to get started.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-4">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">3</div>
                                        <div>
                                            <p className="font-semibold">You get 20% OFF your next bill.</p>
                                            <p className="text-sm text-muted-foreground">Refer 5 friends and your subscription is free!</p>
                                        </div>
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                     <div className="rounded-lg border bg-card p-8 shadow-lg">
                        <Users className="mx-auto h-12 w-12 text-accent"/>
                        <h3 className="mt-4 text-center font-headline text-2xl">Referral Dashboard</h3>
                        <p className="mt-2 text-center text-muted-foreground">Track your referrals and see your savings grow in real-time.</p>
                        <div className="mt-6 space-y-4">
                            <div className="flex justify-between">
                                <span className="font-medium">Total Referrals:</span>
                                <span className="font-bold text-primary">12</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Monthly Savings:</span>
                                <span className="font-bold text-primary">$71.80</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Leaderboard Rank:</span>
                                <span className="font-bold text-primary">#3 / 1,842</span>
                            </div>
                        </div>
                        <Button className="mt-6 w-full" asChild>
                            <Link href="/dashboard">View Your Dashboard</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>

        {/* Testimonials Section */}
        <section className="bg-muted/40 py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-headline text-3xl font-bold md:text-4xl">Don't Just Take Our Word For It</h2>
              <p className="mt-4 text-muted-foreground">
                See what our 1,842+ active traders are saying about their success.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-1 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.author}>
                  <CardContent className="p-6">
                    <div className="flex">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="mt-4 italic">"{testimonial.quote}"</p>
                  </CardContent>
                  <CardFooter className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={testimonial.image} alt={testimonial.author} data-ai-hint="person portrait" />
                      <AvatarFallback>{testimonial.author.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container mx-auto grid grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
          <div>
            <Logo />
            <p className="mt-2 text-sm text-muted-foreground">Automated Gold Trading.</p>
          </div>
          <div>
            <h4 className="font-semibold">Product</h4>
            <ul className="mt-2 space-y-1 text-sm">
              <li><Link href="#features" className="text-muted-foreground hover:text-foreground">Features</Link></li>
              <li><Link href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link></li>
              <li><Link href="#referrals" className="text-muted-foreground hover:text-foreground">Referrals</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">Company</h4>
            <ul className="mt-2 space-y-1 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-foreground">About Us</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground">Contact</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">Legal</h4>
            <ul className="mt-2 space-y-1 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-foreground">Privacy Policy</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <Separator />
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground md:px-6">
          © {new Date().getFullYear()} Bullionaire Bot. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
