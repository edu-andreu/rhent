import { ShoppingCart, Menu } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import logo from "figma:asset/logo_rhent_bg_transparent.png";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface AppHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  mobileMenuOpen: boolean;
  onMobileMenuOpenChange: (open: boolean) => void;
  cartItemCount: number;
  onOpenCart: () => void;
}

/**
 * Application header component with navigation tabs and cart button.
 * Displays logo, navigation tabs (desktop) or mobile menu (mobile), and shopping cart icon.
 * 
 * @param props - Header configuration including active tab, handlers, and cart count
 */
export function AppHeader({
  activeTab,
  onTabChange,
  mobileMenuOpen,
  onMobileMenuOpenChange,
  cartItemCount,
  onOpenCart,
}: AppHeaderProps) {
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
                  {navButton("cash", "Cash Drawer")}
                  {navButton("catalog", "Catalog")}
                  {navButton("rentals", "Rentals")}
                  {navButton("reservations", "Reservations")}
                  {navButton("customers", "Customers")}
                  {navButton("settings", "Settings")}
                </nav>
              </SheetContent>
            </Sheet>
            <img src={logo} alt="Rhent Logo" className="h-8" />
          </div>

          <div id="main-nav" className="hidden lg:block flex-1 max-w-4xl">
            <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-6 h-10">
                <TabsTrigger value="catalog" className="text-sm" data-testid="nav-tab-catalog">Catalog</TabsTrigger>
                <TabsTrigger value="rentals" className="text-sm" data-testid="nav-tab-rentals">Rentals</TabsTrigger>
                <TabsTrigger value="reservations" className="text-sm" data-testid="nav-tab-reservations">Reservations</TabsTrigger>
                <TabsTrigger value="customers" className="text-sm" data-testid="nav-tab-customers">Customers</TabsTrigger>
                <TabsTrigger value="cash" className="text-sm" data-testid="nav-tab-cash">Cash Drawer</TabsTrigger>
                <TabsTrigger value="settings" className="text-sm" data-testid="nav-tab-settings">Settings</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

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
        </div>
      </div>
    </header>
  );
}
