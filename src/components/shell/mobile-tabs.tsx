'use client';
import { LocalizedButton, LocalizedNav, LocalizedSpan } from '../../i18n/localized';
import type {RefObject} from 'react';
import {usePathname} from 'next/navigation';
import {LayoutDashboard,WalletCards,ArrowLeftRight,CreditCard,Ellipsis} from 'lucide-react';
import {AccountLink as Link} from './account-link';
export function MobileTabs({onMore,expanded,buttonRef}:{onMore:()=>void;expanded:boolean;buttonRef:RefObject<HTMLButtonElement|null>}){
 const pathname=usePathname();
 const tabs=[{href:'/overview',name:'Home',label:'Open overview',icon:LayoutDashboard},{href:'/accounts',name:'Accounts',label:'Open accounts',icon:WalletCards},{href:'/transfers',name:'Send / Receive',label:'Open transfers',icon:ArrowLeftRight},{href:'/cards',name:'Cards',label:'Open cards',icon:CreditCard}];
 return <LocalizedNav className="mobile-bottom-tabs" aria-label="Mobile bottom navigation">{tabs.map(({href,name,label,icon:Icon})=><Link key={href} href={href} aria-label={label} aria-current={pathname===href?'page':undefined}><Icon size={20} aria-hidden/><LocalizedSpan>{name}</LocalizedSpan></Link>)}<LocalizedButton ref={buttonRef} type="button" aria-label="More banking tools" aria-expanded={expanded} onClick={onMore}><Ellipsis size={20} aria-hidden/><LocalizedSpan>More</LocalizedSpan></LocalizedButton></LocalizedNav>;
}
