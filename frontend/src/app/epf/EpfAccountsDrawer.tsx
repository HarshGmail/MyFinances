import { Plus } from 'lucide-react';
import { EpfAccount } from '@/api/dataInterface';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Card, CardContent } from '@/components/ui/card';

interface EpfAccountsDrawerProps {
  accounts: EpfAccount[] | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAccountClick: () => void;
}

export function EpfAccountsDrawer({
  accounts,
  open,
  onOpenChange,
  onAddAccountClick,
}: EpfAccountsDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button size="icon" variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-full w-[35%] ml-auto">
        <DrawerHeader className="border-b">
          <div className="flex justify-between items-center">
            <DrawerTitle>EPF Declarations</DrawerTitle>
            <Button size="icon" variant="outline" onClick={onAddAccountClick}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {accounts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <p>No EPF accounts added yet</p>
              <p className="text-sm">Click the + button to add your first account</p>
            </div>
          ) : (
            accounts?.map((epf) => (
              <Card key={epf._id} className="hover:shadow-md transition">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="font-medium text-base">{epf.organizationName}</div>
                    <div className="text-sm text-muted-foreground">
                      Monthly Contribution: ₹{epf.epfAmount.toLocaleString('en-IN')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Annual Contribution: ₹{(epf.epfAmount * 12).toLocaleString('en-IN')}
                    </div>
                    <div className="text-sm text-muted-foreground">Credit Day: {epf.creditDay}</div>
                    <div className="text-sm text-muted-foreground">
                      Start Date: {new Date(epf.startDate).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
