
import React, { useState, useEffect } from 'react';
import DigitalWorkArrangementEditor from './DigitalWorkArrangementEditor';

const DigitalWorkArrangement: React.FC = () => {
  useEffect(() => {
    return () => {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    };
  }, []);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6 text-right">ניהול סידורי עבודה דיגיטל</h1>
      <DigitalWorkArrangementEditor />
    </div>
  );
};

export default DigitalWorkArrangement;
