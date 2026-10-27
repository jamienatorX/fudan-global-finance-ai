export const securityMessage=(code:string)=>({
 INVALID_PERIOD:'Enter a year (YYYY) or a month (YYYY-MM).',
 INVALID_ACTION_FIELDS:'This action contains unsupported fields. Review a fresh draft.',
 JOB_NOT_FOUND:'This scheduled task is unavailable for your account.',
 JOB_NOT_READY:'This scheduled task is not ready for payment.',
 INVALID_JOB_COMMAND:'Refresh the task before changing its status.',
 MANDATE_SESSION_REVOKED:'The session that authorised this schedule was revoked. Create a fresh schedule.',
 SAFETY_LOCKED:'Changes are temporarily locked. You can still view your accounts and contact support.',
 ACTION_VERIFICATION_REQUIRED:'Verify this exact action with your authenticator, then confirm it.',
 FRESH_CHALLENGE_REQUIRED:'A new authenticator verification is needed. Please try a fresh code.',
 OPERATOR_REVIEW_REQUIRED:'An operator must review this security hold before you can unlock changes.',
 STALE_STATE:'Your account changed. Review a fresh action before continuing.',
 STALE_WORKFLOW:'This workflow changed. Refresh it before continuing.',
 HUMAN_TAKEOVER_ACTIVE:'An operator is reviewing this workflow. It must be released before you resume.',
 MANUAL_REVIEW_REQUIRED:'This change cannot be safely reversed automatically. Contact an operator.',
 NO_RECOVERY_AVAILABLE:'There are no remaining supported changes to reverse.',
 PAUSE_WORKFLOW_FIRST:'Pause the workflow before preparing a reversal.',
 OPERATOR_REQUIRED:'Operator access requires an assigned team role and recent authenticator verification.',
 AUTH_REQUIRED:'Please sign in to continue.',SESSION_EXPIRED:'Your session ended. Please sign in again.',
 SERVICE_UNAVAILABLE:'This service is not available yet. Please try again later or contact support.',
} as Record<string,string>)[code]??'This request could not be completed. Refresh the details and try again.';
export async function securePost<T>(path:string,body:Record<string,unknown>):Promise<T>{
 const response=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 const r=await response.json();if(!response.ok||r.code||r.status==='denied')throw new Error(securityMessage(String(r.error??r.code??'SERVICE_UNAVAILABLE')));return r as T;
}
