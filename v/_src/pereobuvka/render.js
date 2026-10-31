const {chromium}=require('playwright');const fs=require('fs');const {spawn}=require('child_process');
(async()=>{
  const mode=process.argv[2]; // 'preview' t1,t2,... | 'video'
  const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:1080,height:1920}});
  p.on('console',m=>console.log('console:',m.text()));p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('http://127.0.0.1:8768/index.html');
  await p.waitForFunction('window.READY===true',null,{timeout:120000});
  if(mode==='preview'){
    for(const t of process.argv[3].split(',').map(Number)){
      const d=await p.evaluate(t=>window.renderAt(t),t);
      fs.writeFileSync(`prev/p_${t.toFixed(2)}.jpg`,Buffer.from(d.split(',')[1],'base64'));
    }
  }else{
    const total=await p.evaluate('window.TOTAL');const fps=30;const n=Math.round(total*fps);
    const ff=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','video_only.mp4'],{stdio:['pipe','inherit','inherit']});
    const t0=Date.now();
    for(let i=0;i<n;i++){
      const d=await p.evaluate(t=>window.renderAt(t),i/fps);
      if(!ff.stdin.write(Buffer.from(d.split(',')[1],'base64')))await new Promise(r=>ff.stdin.once('drain',r));
      if(i%60===0)console.log(`frame ${i}/${n} ${((Date.now()-t0)/1000).toFixed(0)}s`);
    }
    ff.stdin.end();await new Promise(r=>ff.on('close',r));
  }
  await b.close();
})();
