
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import WorkerDivisionsManager from './WorkerDivisionsManager';

interface WorkerDivisionsTabProps {
  workerId: string;
}

const WorkerDivisionsTab: React.FC<WorkerDivisionsTabProps> = React.memo(({ workerId }) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <WorkerDivisionsManager workerId={workerId} />
      </CardContent>
    </Card>
  );
});

WorkerDivisionsTab.displayName = 'WorkerDivisionsTab';

export default WorkerDivisionsTab;
