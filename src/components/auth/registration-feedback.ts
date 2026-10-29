export function registrationFeedback(error: {code?:string;status?:number}|null):string {
 if(!error)return 'Request received. If this email is eligible, check your inbox and spam folder for a confirmation link, then sign in. If you already registered, use Sign in instead.';
 if(error.code==='over_email_send_rate_limit'||error.status===429)return 'We could not send a confirmation email right now. Please try again later.';
 if(error.code==='user_already_exists'||error.code==='email_exists')return 'Use Sign in for an existing account. If you still need to confirm your email, choose Resend confirmation email.';
 if(error.code==='captcha_failed')return 'Security verification expired or failed. Complete the new verification, then try again.';
 if(error.code==='weak_password')return 'Choose a stronger, unique password with at least 12 characters.';
 if(error.code==='email_address_invalid')return 'Check your email address, then try again.';
 return 'Registration could not be completed. Check your details and try again later. If you already requested an account, use Resend confirmation email instead.';
}

