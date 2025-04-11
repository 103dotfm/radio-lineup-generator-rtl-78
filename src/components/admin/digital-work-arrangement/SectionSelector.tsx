
import React from 'react';
import { Button } from "@/components/ui/button";
import { SECTION_TITLES } from './types';
import { useArrangement } from './ArrangementContext';

const SectionSelector: React.FC = () => {
  const { currentSection, setCurrentSection } = useArrangement();

  return (
    <div className="flex flex-wrap space-x-2 space-x-reverse mb-4">
      {Object.entries(SECTION_TITLES).map(([key, title]) => (
        <Button
          key={key}
          variant={currentSection === key ? "default" : "outline"}
          onClick={() => setCurrentSection(key)}
          className="mb-2"
        >
          {title}
        </Button>
      ))}
    </div>
  );
};

export default SectionSelector;
