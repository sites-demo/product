const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
 p.on('pageerror',e=>console.log('ERR',e.message));
 await p.goto('http://127.0.0.1:8769/cover.html');await p.waitForFunction('window.READY===true');
 for(const [k,name] of [['zag','cover_zagruzka_99.png'],['per','cover_pereobuvka_short.png']]){const d=await p.evaluate(k=>window.make(k),k);fs.writeFileSync('covers/'+name,Buffer.from(d.split(',')[1],'base64'));}
 await b.close();})();
