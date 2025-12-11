'use client';

import Link from "next/link";
import { Home, Users, BarChart, Settings, PanelLeft, Bot } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export function DashboardHeader() {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };
  
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/dashboard"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Bot className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">Bullionaire Bot</span>
            </Link>
            <Link href="/dashboard" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
              <Home className="h-5 w-5" />
              Dashboard
            </Link>
            <Link href="/dashboard/reports" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
              <BarChart className="h-5 w-5" />
              Reports
            </Link>
            <Link href="/dashboard/referrals" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
              <Users className="h-5 w-5" />
              Referrals
            </Link>
            <Link href="/dashboard/settings" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
              <Settings className="h-5 w-5" />
              Settings
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
      <div className="relative ml-auto flex-1 md:grow-0">
        {/* Can add search here if needed */}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
            <Avatar>
              <AvatarImage src={user?.photoURL || "https://picsum.photos/seed/user/48/48"} alt="User avatar" data-ai-hint="user avatar" />
              <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{user?.displayName || user?.email || 'My Account'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link href="/dashboard/settings">Settings</Link></DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
