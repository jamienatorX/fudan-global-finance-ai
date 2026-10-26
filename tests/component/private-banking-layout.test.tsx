import {render,screen} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {PrivateCopilot} from '../../src/features/copilot/private-copilot';
import {AuthShell} from '../../src/components/auth/auth-shell';
vi.mock('../../src/features/copilot/private-conversation',()=>({PrivateConversation:()=> <textarea aria-label="Message Fufu"/>}));
vi.mock('../../src/features/copilot/agent-panel',()=>({AgentPanel:()=> <textarea aria-label="Your banking request"/>}));
it('provides one Fufu composer without a second legacy chat',()=>{render(<PrivateCopilot version={0} refresh={async()=>{}}/>);expect(screen.getAllByRole('textbox')).toHaveLength(1);});
it('introduces the bank and mascot on account access',()=>{render(<AuthShell><p>Sign in</p></AuthShell>);expect(screen.getByRole('heading',{name:/Welcome to 福 Bank/i})).toBeVisible();expect(screen.getByRole('img',{name:/Fufu/})).toBeVisible();});
