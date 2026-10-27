'use client';
import { useEffect, useState } from 'react';
import { useValuationSnapshot } from '../fx/use-valuation-snapshot';
import { DEMO_USER_ID } from '../../demo/seed';
import type { FinancialRepository } from '../../domain/financial-repository';
import { getOverviewModel, type OverviewModel } from './overview-queries';
export function useDemoOverview(selectedAccount?: string) {
  const snapshot = useValuationSnapshot();
  const [overview,setOverview] = useState<OverviewModel|null>(null);
  useEffect(() => {
    let active=true;
    const repository={getSnapshot:async()=>snapshot} as unknown as FinancialRepository;
    void getOverviewModel(repository,DEMO_USER_ID,selectedAccount).then(value=>{if(active)setOverview(value);});
    return()=>{active=false;};
  },[snapshot,selectedAccount]);
  return overview;
}
