
import React from 'react';
import { ArrangementProvider } from './ArrangementContext';
import ArrangementEditor from './ArrangementEditor';

const DigitalWorkArrangementEditor: React.FC = () => {
  return (
    <ArrangementProvider>
      <ArrangementEditor />
    </ArrangementProvider>
  );
};

export default DigitalWorkArrangementEditor;
