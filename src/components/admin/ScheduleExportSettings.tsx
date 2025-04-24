import React from 'react';
import { ScheduleExportOffset } from './ScheduleExportOffset';
import { FtpSettings } from './FtpSettings';
import { EmailSettings } from './EmailSettings';
import { JsonTemplateSettings } from './JsonTemplateSettings';
import { XmlTemplateSettings } from './XmlTemplateSettings';

export function ScheduleExportSettings() {
  return (
    <div className="space-y-6">
      <ScheduleExportOffset />
      <FtpSettings />
      <EmailSettings />
      <JsonTemplateSettings />
      <XmlTemplateSettings />
    </div>
  );
}
