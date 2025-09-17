// Minimal smoke tests (pseudo, adapt to your test runner)
function magicPrice({bonusTotal, flats}:{bonusTotal:number, flats:number[]}):number{
  return (bonusTotal*bonusTotal)*1000 + flats.reduce((a,b)=>a+b,0);
}
// canonicalName is illustrative
function canonicalName(item:any):string{
  const pre = [];
  if(item.enhancement>0) pre.push(`+${item.enhancement}`);
  const prefixAdj = (item.abilities||[]).filter((a:any)=>['glamered','shadow','slick','animated','bashing'].includes(a.id)).map((a:any)=>a.id==='fort_light'?'':(a.tier||a.id));
  pre.push(...prefixAdj.filter(Boolean));
  if(item.material) pre.push(item.material);
  pre.push(item.base);
  const suffix = (item.abilities||[]).filter((a:any)=>['fort_light','fort_med','fort_heavy','arrow_deflection'].includes(a.id)).map((a:any)=>{
    if(a.id==='fort_light') return 'light fortification';
    if(a.id==='fort_med') return 'medium fortification';
    if(a.id==='fort_heavy') return 'heavy fortification';
    if(a.id==='arrow_deflection') return 'arrow deflection';
  });
  return pre.join(' ') + (suffix.length?` of ${suffix.join(' and ')}`:'');
}

// Tests:
console.assert(magicPrice({bonusTotal:3, flats:[1800,3750]}) === 9000+1800+3750, 'Pricing failed');
console.assert(canonicalName({slot:'armor', base:'full plate', material:'adamantine', enhancement:1, abilities:[{id:'glamered'},{id:'fort_light'}]}) === '+1 glamered adamantine full plate of light fortification', 'Naming failed');
