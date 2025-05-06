
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import WorkerDivisionsManager from '../workers/WorkerDivisionsManager';

interface WorkerDivisionsTabProps {
  workerId: string;
}

const WorkerDivisionsTab: React.FC<WorkerDivisionsTabProps> = ({ workerId }) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <WorkerDivisionsManager workerId={workerId} />
      </CardContent>
    </Card>
  );
};

export default WorkerDivisionsTab;
