import {NextRequest,NextResponse} from 'next/server';
import {fetchReferenceQuote} from '../../../../src/features/fx/reference-quote';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const base=request.nextUrl.searchParams.get('base')?.toUpperCase()??'',quote=request.nextUrl.searchParams.get('quote')?.toUpperCase()??'';
 const result=await fetchReferenceQuote(base,quote);
 return NextResponse.json(result.data??{error:result.error},{status:result.status,headers:{'Cache-Control':result.status===200?'public, max-age=300, s-maxage=3600, stale-while-revalidate=3600':'no-store'}});
}
