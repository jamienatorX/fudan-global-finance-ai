import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { LanguageProvider, LanguageSwitcher, LANGUAGE_STORAGE_KEY } from '../../src/i18n/language-provider';
import { LocalizedButton, LocalizedInput, LocalizedP } from '../../src/i18n/localized';
import { translateText } from '../../src/i18n/translate';

it('switches visible and accessible copy, preserves values and remembers the selection', () => {
  localStorage.clear();
  const view=render(<LanguageProvider><LanguageSwitcher/><LocalizedButton>View transactions</LocalizedButton><LocalizedInput aria-label="Amount" placeholder="Amount" defaultValue="18650.00"/><LocalizedP>Available {'CNY 18,650.00'}</LocalizedP></LanguageProvider>);
  expect(screen.getByRole('button',{name:'View transactions'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'简体中文'}));
  expect(screen.getByRole('button',{name:'查看交易'})).toBeInTheDocument();
  expect(screen.getByRole('textbox',{name:'金额'})).toHaveValue('18650.00');
  expect(screen.getByText('可用余额 CNY 18,650.00')).toBeInTheDocument();
  expect(document.documentElement.lang).toBe('zh-CN');
  expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh-CN');
  view.unmount();
  render(<LanguageProvider><LanguageSwitcher/><LocalizedButton>View transactions</LocalizedButton></LanguageProvider>);
  expect(screen.getByRole('button',{name:'查看交易'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'English'}));
  expect(screen.getByRole('button',{name:'View transactions'})).toBeInTheDocument();
  expect(document.documentElement.lang).toBe('en');
});
it('preserves IDs, currencies, merchants, and dynamic amounts',()=>{
 expect(translateText('CNY 18,650.00','zh-CN')).toBe('CNY 18,650.00');
 expect(translateText('Campus Video','zh-CN')).toBe('Campus Video');
 expect(translateText('Good evening, Ayu','zh-CN')).toBe('晚上好，Ayu');
});

it('translates account actions without changing account links or balances', async()=>{
  const {AccountList}=await import('../../src/features/accounts/account-list');
  const {createSeedSnapshot}=await import('../../src/demo/seed');
  localStorage.setItem(LANGUAGE_STORAGE_KEY,'zh-CN');
  render(<LanguageProvider><LanguageSwitcher/><AccountList accounts={createSeedSnapshot('v1').accounts} reportingBalances={[]}/></LanguageProvider>);
  expect(screen.getAllByRole('link',{name:'查看交易'})).toHaveLength(5);
  expect(screen.getAllByRole('link',{name:'查看交易'})[0]).toHaveAttribute('href','/transactions?account=00000000-0000-4000-8000-000000000010&currency=CNY');
  expect(screen.getByRole('heading',{name:/CNY\s18,650\.00/})).toBeInTheDocument();
  expect(screen.getByText('CNY / 日常账户')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'English'}));
});

it('still switches language when browser storage writes are blocked',()=>{
  localStorage.clear();
  const blocked=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('blocked');});
  render(<LanguageProvider><LanguageSwitcher/><LocalizedButton>View transactions</LocalizedButton></LanguageProvider>);
  fireEvent.click(screen.getByRole('button',{name:'简体中文'}));
  expect(screen.getByRole('button',{name:'查看交易'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'English'}));
  expect(screen.getByRole('button',{name:'View transactions'})).toBeInTheDocument();
  blocked.mockRestore();
});

it('finds the same fictional records using translated category names', async()=>{
  const {indexDemoBanking,searchBankingRecords}=await import('../../src/features/search/banking-search');
  const {createSeedSnapshot}=await import('../../src/demo/seed');
  const index=indexDemoBanking(createSeedSnapshot('v1'));
  expect(searchBankingRecords(index,'学费').some(row=>row.category==='Tuition')).toBe(true);
  expect(searchBankingRecords(index,'餐饮').some(row=>row.category==='Transactions')).toBe(true);
});
