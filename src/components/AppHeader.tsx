import { Fragment } from "react";
import { ShoppingCart, Menu, LogOut, Settings } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import logo from "figma:asset/logo_rhent_bg_transparent.png";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useAuth } from "../providers/AuthProvider";

interface AppHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  mobileMenuOpen: boolean;
  onMobileMenuOpenChange: (open: boolean) => void;
  cartItemCount: number;
  onOpenCart: () => void;
}

interface TabDef {
  id: string;
  label: string;
  permission: string;
}

const ALL_TABS: TabDef[] = [
  { id: "dashboard", label: "Dashboard", permission: "tab:dashboard" },
  { id: "catalog", label: "Catalog", permission: "tab:catalog" },
  { id: "rentals", label: "Rentals", permission: "tab:rentals" },
  { id: "reservations", label: "Reservations", permission: "tab:reservations" },
  { id: "customers", label: "Customers", permission: "tab:customers" },
  { id: "cash", label: "Cash Drawer", permission: "tab:cash" },
];

export function AppHeader({
  activeTab,
  onTabChange,
  mobileMenuOpen,
  onMobileMenuOpenChange,
  cartItemCount,
  onOpenCart,
}: AppHeaderProps) {
  const { appUser, role, permissions, signOut } = useAuth();

  const visibleTabs = ALL_TABS.filter((t) => permissions.includes(t.permission));

  const navButton = (tab: string, label: string) => (
    <Button
      variant={activeTab === tab ? "secondary" : "ghost"}
      className="justify-start"
      onClick={() => {
        onTabChange(tab);
        onMobileMenuOpenChange(false);
      }}
    >
      {label}
    </Button>
  );

  const initials = appUser?.full_name
    ? appUser.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : appUser?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header id="main-header" data-testid="app-header" className="border-b bg-background z-50 flex-shrink-0">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={onMobileMenuOpenChange}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" data-testid="mobile-menu-button">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[320px]" data-testid="mobile-menu">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <img src={logo} alt="Rhent Logo" className="h-6" />
                  </SheetTitle>
                  <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
                </SheetHeader>
                <nav id="mobile-nav" className="flex flex-col gap-2 mt-6">
                  {visibleTabs.map((t) => (
                    <Fragment key={t.id}>{navButton(t.id, t.label)}</Fragment>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <img src={logo} alt="Rhent Logo" className="h-8" />
          </div>

          <div id="main-nav" className="hidden lg:block flex-1 max-w-4xl">
            <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
              <TabsList className={`grid w-full h-10`} style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>
                {visibleTabs.map((t) => (
                  <TabsTrigger key={t.id} value={t.id} className="text-sm" data-testid={`nav-tab-${t.id}`}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            <Button id="cart-button" data-testid="cart-button" variant="outline" size="lg" className="relative" onClick={onOpenCart}>
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
                  data-testid="cart-badge"
                >
                  {cartItemCount}
                </Badge>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative size-9 shrink-0 aspect-square rounded-full p-0" data-testid="user-menu-button">
                  <Avatar className="size-9 aspect-square">
                    <AvatarImage src={appUser?.avatar_url ?? undefined} alt={appUser?.full_name ?? "User"} referrerPolicy="no-referrer" />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{appUser?.full_name ?? "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{appUser?.email}</p>
                    <p className="text-xs leading-none text-muted-foreground capitalize">{role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {permissions.includes("action:view_edit_settings") && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => onTabChange("settings")}
                    data-testid="user-menu-settings"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
