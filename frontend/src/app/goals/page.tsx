'use client';

import { useState } from 'react';
import AddGoalForm from './AddGoalForm';
import Goals from './GoalsCards';
import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function GoalsPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="container mx-auto p-4">
      <div className="relative mb-5">
        <h2 className="text-2xl font-bold text-center">Goals</h2>
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
              <Button size="icon" variant="outline" onClick={() => setOpen(true)}>
                <Plus className="w-5 h-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-w-md w-full p-6">
              <DrawerTitle className="text-xl font-bold mb-4 text-center"></DrawerTitle>
              <AddGoalForm />
            </DrawerContent>
          </Drawer>
        </div>
      </div>
      <Goals />
    </div>
  );
}
