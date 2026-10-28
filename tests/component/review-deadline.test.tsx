import {act,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {useReviewDeadline} from '../../src/features/banking/review-deadline';
afterEach(()=>vi.useRealTimers());
function Clock({deadline}:{deadline:number}){const seconds=useReviewDeadline(deadline);return <button disabled={seconds===0}>{seconds}</button>;}
it('counts down against wall time and disables at the exact deadline',()=>{
 vi.useFakeTimers();vi.setSystemTime(10000);render(<Clock deadline={12000}/>);
 expect(screen.getByRole('button')).toHaveTextContent('2');
 act(()=>vi.advanceTimersByTime(1000));expect(screen.getByRole('button')).toHaveTextContent('1');
 act(()=>vi.advanceTimersByTime(1000));expect(screen.getByRole('button')).toBeDisabled();
});
it('fails closed for missing or invalid deadlines and updates for a fresh draft',()=>{
 vi.useFakeTimers();vi.setSystemTime(10000);const view=render(<Clock deadline={NaN}/>);
 expect(screen.getByRole('button')).toBeDisabled();view.rerender(<Clock deadline={13000}/>);
 expect(screen.getByRole('button')).toHaveTextContent('3');
});

