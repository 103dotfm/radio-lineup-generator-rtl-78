
import React, { useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import WorkerDivisionsManager from './WorkerDivisionsManager';

interface WorkerDivisionsTabProps {
  workerId: string;
}

const WorkerDivisionsTab: React.FC<WorkerDivisionsTabProps> = ({ workerId }) => {
  // Log when this component mounts to track usage
  useEffect(() => {
    console.log(`WorkerDivisionsTab mounted for worker ID: ${workerId}`);
  }, [workerId]);

  return (
    <Card>
      <CardContent className="pt-6">
        <WorkerDivisionsManager workerId={workerId} />
      </CardContent>
    </Card>
  );
};

export default WorkerDivisionsTab;
