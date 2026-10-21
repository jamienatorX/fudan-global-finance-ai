'use client';

import { LocalizedButton, LocalizedDiv, LocalizedInput } from '../../i18n/localized';
import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';

export function PasswordField(props: Omit<ComponentProps<'input'>, 'type' | 'className'>) {
  const [visible, setVisible] = useState(false);
  return (
    <LocalizedDiv className="auth-input-wrap">
      <LockKeyhole className="auth-input-icon" size={18} aria-hidden />
      <LocalizedInput {...props} type={visible ? 'text' : 'password'} className="auth-input auth-password-input" />
      <LocalizedButton type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} aria-controls={props.id} className="auth-password-toggle" onClick={() => setVisible((value) => !value)}>
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </LocalizedButton>
    </LocalizedDiv>
  );
}
