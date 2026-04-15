import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { MOBILE_MENU_ITEMS } from './Constants';

interface MobileNavProps {
  user: any;
  onLogout: () => void;
}

export function MobileNav({ user, onLogout }: MobileNavProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const handleNavigation = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
  };

  const handleProfileClick = () => {
    router.push('/profile');
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setMobileMenuOpen(false);
  };

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon" className="p-1">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[350px] flex flex-col h-full">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>

        {/* User Profile Section */}
        <UserProfileSection user={user} onProfileClick={handleProfileClick} />

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto">
          <Accordion type="single" collapsible className="w-full">
            {MOBILE_MENU_ITEMS.map((item, index) =>
              item.subItems ? (
                <AccordionItem key={index} value={`item-${index}`} className="border-b">
                  <AccordionTrigger className="hover:no-underline py-3 px-3">
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-10 space-y-1 py-2">
                      {item.subItems.map((subItem, subIndex) => (
                        <button
                          key={subIndex}
                          onClick={() => handleNavigation(subItem.path)}
                          className="flex items-center gap-3 w-full p-2 rounded hover:bg-accent transition-colors text-sm"
                        >
                          {subItem.icon}
                          <span>{subItem.title}</span>
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ) : (
                <button
                  key={index}
                  onClick={() => handleNavigation(item.path)}
                  className="flex items-center gap-3 w-full py-3 px-3 rounded hover:bg-accent transition-colors"
                >
                  {item.icon}
                  <span>{item.title}</span>
                </button>
              )
            )}
          </Accordion>
        </div>

        {/* Logout Button - Fixed at bottom */}
        <div className="border-t pt-4 pb-4 mt-auto">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function UserProfileSection({ user, onProfileClick }: { user: any; onProfileClick: () => void }) {
  return (
    <div className="border-b pb-4 mb-4 mt-6">
      <button
        onClick={onProfileClick}
        className="flex items-center gap-3 w-full p-2 rounded hover:bg-accent transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-semibold">{user.name?.[0]?.toUpperCase()}</span>
        </div>
        <span className="font-medium">{user.name}</span>
      </button>
    </div>
  );
}
