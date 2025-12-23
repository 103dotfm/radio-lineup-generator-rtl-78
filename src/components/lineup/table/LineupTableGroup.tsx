import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import LineupItem from '../../LineupItem';
import DividerItem from '../DividerItem';
import LineupTableHeader from './LineupTableHeader';
import LineupTableFooter from './LineupTableFooter';

interface LineupTableGroupProps {
  group: any[];
  groupIndex: number;
  isLastGroup: boolean;
  showMinutes: boolean;
  isAuthenticated: boolean;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string, updatedItem: any) => Promise<void>;
  onBreakTextChange: (id: string, text: string) => void;
  onDetailsChange: (id: string, details: string) => void;
  calculateTotalMinutes: () => number;
  isBackupShow?: boolean;
}

const LineupTableGroup: React.FC<LineupTableGroupProps> = ({
  group,
  groupIndex,
  isLastGroup,
  showMinutes,
  isAuthenticated,
  onDelete,
  onDurationChange,
  onEdit,
  onBreakTextChange,
  onDetailsChange,
  calculateTotalMinutes,
  isBackupShow
}) => {
  // CRITICAL: Strictly check for boolean true
  const startsWithDivider = group[0]?.is_divider === true;
  
  return (
    <div key={`group-${groupIndex}`} className="table-section mb-4 sm:mb-8">
      {startsWithDivider && (
        <Draggable draggableId={group[0].id} index={group[0].index}>
          {(dividerProvided) => (
            <table 
              ref={dividerProvided.innerRef}
              {...dividerProvided.draggableProps}
              {...dividerProvided.dragHandleProps}
              className="w-full table-fixed border-collapse mb-2"
            >
              <tbody>
                <DividerItem 
                  id={group[0].id}
                  name={group[0].name}
                  index={group[0].index}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  isAuthenticated={isAuthenticated}
                  showMinutes={showMinutes}
                  isBackupShow={isBackupShow}
                />
              </tbody>
            </table>
          )}
        </Draggable>
      )}
      
      <table className="w-full table-fixed border-collapse text-sm sm:text-base">
        <colgroup>
          <col className="w-[20%] sm:w-[20%]" />
          <col className="w-[15%] sm:w-[15%]" />
          <col className="w-[35%] sm:w-[35%]" />
          {isAuthenticated && <col className="w-[15%] sm:w-[15%]" />}
          {showMinutes && <col className="w-[7%] sm:w-[8%]" />}
          <col className="w-[8%] sm:w-[10%]" />
        </colgroup>
        
        <LineupTableHeader 
          isAuthenticated={isAuthenticated} 
          showMinutes={showMinutes} 
        />
        
        <tbody>
          {group.slice(startsWithDivider ? 1 : 0).map((item) => (
            <LineupItem 
              key={item.id} 
              {...item} 
              index={item.index} 
              onDelete={onDelete} 
              onDurationChange={onDurationChange} 
              onEdit={onEdit} 
              onBreakTextChange={onBreakTextChange}
              onDetailsChange={onDetailsChange}
              showMinutes={showMinutes}
              isBackupShow={isBackupShow}
            />
          ))}
        </tbody>
        
        {showMinutes && isLastGroup && (
          <LineupTableFooter 
            isAuthenticated={isAuthenticated}
            totalMinutes={calculateTotalMinutes()}
          />
        )}
      </table>
    </div>
  );
};

export default LineupTableGroup;
