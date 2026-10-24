import {expect,it,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {HumanSupport} from '../../src/features/copilot/human-support';

it('clears a demo support message without making a delivery request',()=>{
  HTMLDialogElement.prototype.showModal=vi.fn(function(this:HTMLDialogElement){this.open=true;});
  HTMLDialogElement.prototype.close=vi.fn(function(this:HTMLDialogElement){this.open=false;});
  const fetchSpy=vi.spyOn(globalThis,'fetch');
  render(<HumanSupport summary="" demo/>);
  fireEvent.click(screen.getByRole('button',{name:'Contact a human operator'}));
  const message=screen.getByLabelText('Your message');
  fireEvent.change(message,{target:{value:'Please help me with my account.'}});
  fireEvent.click(screen.getByRole('button',{name:'Send message'}));
  expect(message).toHaveValue('');
  expect(screen.getByRole('status')).toHaveTextContent('Demo message sent.');
  expect(screen.getByText('Demo only. Messages are not delivered to an operator.')).toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});
