import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { X } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterColumn {
  id: string;
  label: string;
  options: FilterOption[];
}

export interface FilterState {
  [key: string]: string[];
}

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  columns: FilterColumn[];
  filters: FilterState;
  tempFilters: FilterState;
  onTempFiltersChange: (filters: FilterState) => void;
  onApply: () => void;
  onCancel: () => void;
  onRemoveAll: () => void;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  columns,
  filters,
  tempFilters,
  onTempFiltersChange,
  onApply,
  onCancel,
  onRemoveAll,
}) => {
  const [activeTab, setActiveTab] = useState('all');

  const getSelectedFiltersCount = () => {
    return Object.values(tempFilters).reduce((sum, values) => sum + values.length, 0);
  };

  const hasFiltersChanged = () => {
    return JSON.stringify(filters) !== JSON.stringify(tempFilters);
  };

  const toggleFilterValue = (filterId: string, value: string) => {
    const currentValues = tempFilters[filterId] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    onTempFiltersChange({
      ...tempFilters,
      [filterId]: newValues,
    });
  };

  const getSelectedFilters = () => {
    const selected: FilterState = {};
    Object.keys(tempFilters).forEach((key) => {
      if (tempFilters[key] && tempFilters[key].length > 0) {
        selected[key] = tempFilters[key];
      }
    });
    return selected;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 bg-background shadow-xl transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">Filters</h3>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="selected">Selected ({getSelectedFiltersCount()})</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="link"
                size="sm"
                onClick={onRemoveAll}
                className="text-red-600 hover:text-red-700"
              >
                Remove all
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
              <TabsContent value="all" className="mt-0">
                <Accordion type="multiple" defaultValue={columns.map((col) => col.id)}>
                  {columns.map((column) => (
                    <AccordionItem key={column.id} value={column.id}>
                      <AccordionTrigger>{column.label}</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {column.options.map((option) => (
                            <div
                              key={option.value}
                              onClick={() => toggleFilterValue(column.id, option.value)}
                              className={`p-2 rounded cursor-pointer transition-colors ${
                                (tempFilters[column.id] || []).includes(option.value)
                                  ? 'bg-blue-100 dark:bg-blue-900'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {option.label}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>

              <TabsContent value="selected" className="mt-0">
                <Accordion type="multiple" defaultValue={columns.map((col) => col.id)}>
                  {(() => {
                    const selectedFilters = getSelectedFilters();
                    const accordionItems = columns
                      .filter((column) => selectedFilters[column.id]?.length > 0)
                      .map((column) => (
                        <AccordionItem key={column.id} value={column.id}>
                          <AccordionTrigger>{column.label}</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2">
                              {selectedFilters[column.id].map((value) => {
                                const option = column.options.find((opt) => opt.value === value);
                                return (
                                  <div
                                    key={value}
                                    onClick={() => toggleFilterValue(column.id, value)}
                                    className="p-2 rounded cursor-pointer transition-colors bg-blue-100 dark:bg-blue-900"
                                  >
                                    {option?.label || value}
                                  </div>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ));

                    return accordionItems.length > 0 ? (
                      accordionItems
                    ) : (
                      <div className="text-center text-gray-500 py-8">No filters selected</div>
                    );
                  })()}
                </Accordion>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="p-4 border-t w-full flex justify-between">
            <Button onClick={onApply} disabled={!hasFiltersChanged()} className="w-fit">
              Apply
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={!hasFiltersChanged()}
              className="w-fit"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
