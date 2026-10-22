export function DemoEntry({className='auth-secondary'}:{className?:string}) {
  return <form method="post" action="/demo"><button type="submit" className={className}>Explore FU Bank</button></form>;
}
