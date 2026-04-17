import { CalendarIcon } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';
import { EpfAccountPayload } from '@/api/dataInterface';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface AddEpfAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<EpfAccountPayload>;
  onSubmit: (values: EpfAccountPayload) => Promise<void>;
  isPending: boolean;
}

export function AddEpfAccountDialog({
  open,
  onOpenChange,
  form,
  onSubmit,
  isPending,
}: AddEpfAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add EPF Account</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4 py-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. TCS, Infosys" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="epfAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly EPF Contribution</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="3000"
                      type="number"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="creditDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Day</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="5"
                      type="number"
                      min="1"
                      max="31"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        captionLayout="dropdown"
                        startMonth={new Date(1990, 0)}
                        endMonth={new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Adding...' : 'Add EPF Account'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
