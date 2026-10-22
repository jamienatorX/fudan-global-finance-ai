import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createSeedSnapshot, DEFAULT_SEED_VERSION } from '../../src/demo/seed';
const request=vi.fn();
vi.mock('../../src/demo/demo-context',()=>({useOptionalDemo:()=>({snapshot:createSeedSnapshot(DEFAULT_SEED_VERSION),pending:null,request})}));
import { CsvImportPreview } from '../../src/features/transactions/csv-preview';
const csv='date,merchant,amount,currency\n2026-10-12,Test Cafe,-2.50,CNY';
describe('wallet import preview approval',()=>{
 it('previews without mutation and requests approval for selected CNY history',()=>{
   render(<CsvImportPreview/>);
   fireEvent.change(screen.getByLabelText('CSV contents'),{target:{value:csv}});
   fireEvent.click(screen.getByRole('button',{name:'Validate and preview'}));
   expect(request).not.toHaveBeenCalled();
   expect(screen.getByText(/1 valid \/ 0 invalid/)).toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:'Review history import'}));
   expect(request).toHaveBeenCalledWith(expect.objectContaining({type:'import-transactions',rows:[expect.objectContaining({merchant:'Test Cafe',amountMinor:'250'})]}));
 });
 it('clears a previous preview and text when a new upload fails',async()=>{
   render(<CsvImportPreview/>);
   fireEvent.change(screen.getByLabelText('CSV contents'),{target:{value:csv}});
   fireEvent.click(screen.getByRole('button',{name:'Validate and preview'}));
   const file=new File(['x'],'broken.csv',{type:'text/csv'});
   Object.defineProperty(file,'arrayBuffer',{value:()=>Promise.reject(new Error('read failed'))});
   fireEvent.change(screen.getByLabelText('Choose a CSV file'),{target:{files:[file]}});
   await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Could not read this file'));
   expect(screen.queryByRole('button',{name:'Review history import'})).not.toBeInTheDocument();
   expect(screen.getByLabelText('CSV contents')).toHaveValue('');
 });
});
