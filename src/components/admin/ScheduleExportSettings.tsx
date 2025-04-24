
import React from 'react';
import { ScheduleExportOffset } from './ScheduleExportOffset';
import ScheduleXMLSettings from './ScheduleXMLSettings';
import FTPXMLSettings from './FTPXMLSettings';

const ScheduleExportSettings = () => {
  return (
    <div className="space-y-6">
      <ScheduleExportOffset />
      <ScheduleXMLSettings />
      <FTPXMLSettings />
    </div>
  );
};

export default ScheduleExportSettings;
