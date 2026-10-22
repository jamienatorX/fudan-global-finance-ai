import Image from 'next/image';

/** Shared 3D-rendered Fufu artwork for public and signed-in banking assistants. */
export function FufuMascot({state='idle'}:{state?:'idle'|'thinking'|'success'|'decline'}){
 return <span className="relative inline-flex h-32 w-24 shrink-0 items-center justify-center sm:h-40 sm:w-28">
  <Image src="/brand/fufu-3d.webp" alt={`Fufu, your banking buddy${state==='thinking'?', thinking':''}`} width={512} height={612} sizes="(min-width: 640px) 112px, 96px" className={'h-full w-full object-contain drop-shadow-[0_8px_8px_rgba(16,43,50,0.15)]'+(state==='thinking'?' motion-safe:animate-pulse':'')} />
  {state==='success'&&<span aria-hidden="true" className="absolute bottom-1 right-0 flex size-7 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white shadow-sm">✓</span>}
  {state==='decline'&&<span aria-hidden="true" className="absolute bottom-1 right-0 flex size-7 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-700 shadow-sm">?</span>}
 </span>;
}

