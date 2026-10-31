const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
  p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('http://127.0.0.1:8769/carousel.html');await p.waitForFunction('window.READY===true',null,{timeout:60000});
  const sets=await p.evaluate(()=>Object.fromEntries(Object.entries(window.SETS).map(([k,v])=>[k,v.length])));
  for(const [k,n] of Object.entries(sets)){fs.mkdirSync('out/'+k,{recursive:true});
    for(let i=0;i<n;i++){const d=await p.evaluate(([k,i])=>window.renderSlide(k,i),[k,i]);fs.writeFileSync(`out/${k}/${k}_${i+1}.png`,Buffer.from(d.split(',')[1],'base64'));}}
  console.log(sets);await b.close();})();
