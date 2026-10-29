import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {ExecutionEvidence} from '../../src/features/banking/execution-evidence';
it('shows recorded approval and outcome without inventing missing verification',()=>{
 render(<ExecutionEvidence value={{action_id:'example',policy:{tier:'Red',reason:'DAILY_TRANSFER_THRESHOLD'},decision:'approved',result:{status:'executed'},events:[],securityEvents:[{category:'EXECUTED_Red',created_at:'2026-10-29T08:17:06Z'}]}}/>);
 expect(screen.getByText('Red')).toBeInTheDocument();expect(screen.getByText('executed')).toBeInTheDocument();
 expect(screen.getByText('No action verification reference recorded')).toBeInTheDocument();
 expect(screen.getByText('EXECUTED_Red')).toBeInTheDocument();
});

