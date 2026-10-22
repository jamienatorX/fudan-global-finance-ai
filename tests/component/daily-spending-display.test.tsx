import {render,screen,fireEvent} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {DemoProvider} from '../../src/demo/demo-context';
import {SafeToSpendHero} from '../../src/features/overview/safe-to-spend-hero';
import {LanguageProvider,LanguageSwitcher} from '../../src/i18n/language-provider';
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams()}));
vi.mock('../../src/features/overview/use-shanghai-clock',()=>({useShanghaiClock:()=>Date.UTC(2026,9,21,8)}));
it('separates the daily budget from available cash and localizes the distinction',()=>{
 localStorage.clear();
 render(<LanguageProvider><LanguageSwitcher/><DemoProvider><SafeToSpendHero/></DemoProvider></LanguageProvider>);
 expect(screen.getByText('CNY 33,669.36')).toBeInTheDocument();
 expect(screen.getByText(/Daily budget remaining: CNY 0.00 \/ day/)).toBeInTheDocument();
 fireEvent.click(screen.getByText('How safe-to-spend is calculated'));
 expect(screen.getByText('This is not your spending budget. Savings remain included.')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'简体中文'}));
 expect(screen.getByText(/每日剩余预算：CNY 0.00 \/ 天/)).toBeInTheDocument();
 expect(screen.getByText('扣除已知账单后的可用金额')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'English'}));
});
