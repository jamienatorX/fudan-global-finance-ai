import {expect,it,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {HumanSupport} from '../../src/features/copilot/human-support';

it('directs public visitors to authenticated support without pretending to send a message',()=>{
  HTMLDialogElement.prototype.showModal=vi.fn(function(this:HTMLDialogElement){this.open=true;});
  HTMLDialogElement.prototype.close=vi.fn(function(this:HTMLDialogElement){this.open=false;});
  const fetchSpy=vi.spyOn(globalThis,'fetch');
  render(<HumanSupport summary="" demo/>);
  fireEvent.click(screen.getByRole('button',{name:'Contact a human operator'}));
  expect(screen.getByRole('link',{name:'Sign in for secure support'})).toHaveAttribute('href','/support');
  expect(screen.queryByRole('button',{name:'Send message'})).toBeNull();
  expect(screen.queryByText('Demo message sent.')).toBeNull();
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});
