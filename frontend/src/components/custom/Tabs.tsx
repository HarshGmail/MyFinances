import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

export interface SectionTab {
  tabName: string;
  tabComponent: React.ReactNode;
}

interface SectionTabsProps {
  tabs: SectionTab[];
}

export const SectionTabs: React.FC<SectionTabsProps> = ({ tabs }) => {
  if (!tabs || tabs.length === 0) return null;
  const defaultTab = tabs[0].tabName;

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.tabName} value={tab.tabName}>
            {tab.tabName}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.tabName} value={tab.tabName}>
          {tab.tabComponent}
        </TabsContent>
      ))}
    </Tabs>
  );
};
