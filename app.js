(() => {
  const IMG = window.CASH_LANA_IMAGE || './assets/loader.jpg';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);

  const loader = $('loader');
  const hero = $('hero');
  const softLoad = $('softLoad');
  const card = $('chromaticCard');
  const enterText = $('enterText');
  const loaderFallback = $('loaderFallback');
  const heroVideo = $('heroVideo');
  const heartCursor = $('heartCursor');

  if (IMG) loaderFallback.src = IMG;

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function approach(current, target, speed, delta) {
    return current + (target - current) * (1 - Math.exp(-speed * delta));
  }

  const chromaticCanvas = $('chromaticCanvas');
  const cgl = chromaticCanvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
  if (cgl && IMG) {
    const vertSource = `attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
    const fragSource = `precision highp float;
      uniform sampler2D uImage;uniform vec2 uPointer;uniform float uImageAspect;uniform float uCanvasAspect;
      uniform float uProgress;uniform float uZoom;uniform float uWarp;uniform float uChromatic;varying vec2 vUv;
      vec2 cover(vec2 uv){if(uImageAspect>uCanvasAspect){uv.x=(uv.x-.5)*uCanvasAspect/uImageAspect+.5;}else{uv.y=(uv.y-.5)*uImageAspect/uCanvasAspect+.5;}return uv;}
      void main(){float strength=uProgress;vec2 movement=(uPointer-vec2(.5))*vec2(uCanvasAspect,1.);vec2 direction=movement/max(length(movement),.2);
      vec2 baseUv=mix(vUv,vec2(.5),uZoom*uProgress*.28);float band=sin(vUv.y*24.+uPointer.x*5.);float fineBand=sin(vUv.y*71.-uPointer.y*4.);
      baseUv.x+=(band*.72+fineBand*.28)*uWarp*strength*.16;baseUv.y+=direction.y*uWarp*strength*.12;baseUv=cover(baseUv);
      vec2 split=direction*uChromatic*strength;split.x+=band*uChromatic*strength*.35;
      float r=texture2D(uImage,clamp(baseUv+split,0.,1.)).r;float g=texture2D(uImage,clamp(baseUv,0.,1.)).g;float b=texture2D(uImage,clamp(baseUv-split,0.,1.)).b;
      gl_FragColor=vec4(r,g,b,1.);}`;
    const vs = compile(cgl, cgl.VERTEX_SHADER, vertSource);
    const fs = compile(cgl, cgl.FRAGMENT_SHADER, fragSource);
    if (vs && fs) {
      const program = cgl.createProgram();
      cgl.attachShader(program, vs); cgl.attachShader(program, fs); cgl.linkProgram(program);
      if (cgl.getProgramParameter(program, cgl.LINK_STATUS)) {
        cgl.useProgram(program);
        const pos = cgl.getAttribLocation(program, 'aPosition');
        const buffer = cgl.createBuffer();
        cgl.bindBuffer(cgl.ARRAY_BUFFER, buffer);
        cgl.bufferData(cgl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), cgl.STATIC_DRAW);
        cgl.enableVertexAttribArray(pos); cgl.vertexAttribPointer(pos, 2, cgl.FLOAT, false, 0, 0);
        const u = {
          image: cgl.getUniformLocation(program,'uImage'), pointer: cgl.getUniformLocation(program,'uPointer'),
          imageAspect: cgl.getUniformLocation(program,'uImageAspect'), canvasAspect: cgl.getUniformLocation(program,'uCanvasAspect'),
          progress: cgl.getUniformLocation(program,'uProgress'), zoom: cgl.getUniformLocation(program,'uZoom'),
          warp: cgl.getUniformLocation(program,'uWarp'), chromatic: cgl.getUniformLocation(program,'uChromatic')
        };
        cgl.uniform1i(u.image,0); cgl.uniform1f(u.zoom,.2); cgl.uniform1f(u.warp,.05); cgl.uniform1f(u.chromatic,.01);
        cgl.pixelStorei(cgl.UNPACK_FLIP_Y_WEBGL,1);
        const texture = cgl.createTexture();
        cgl.activeTexture(cgl.TEXTURE0); cgl.bindTexture(cgl.TEXTURE_2D,texture);
        cgl.texParameteri(cgl.TEXTURE_2D,cgl.TEXTURE_WRAP_S,cgl.CLAMP_TO_EDGE);
        cgl.texParameteri(cgl.TEXTURE_2D,cgl.TEXTURE_WRAP_T,cgl.CLAMP_TO_EDGE);
        cgl.texParameteri(cgl.TEXTURE_2D,cgl.TEXTURE_MIN_FILTER,cgl.LINEAR);
        cgl.texParameteri(cgl.TEXTURE_2D,cgl.TEXTURE_MAG_FILTER,cgl.LINEAR);
        const pointer={x:.5,y:.5}, target={x:.5,y:.5}; let progress=0, progressTarget=0, rendering=false, previous=performance.now(), imageLoaded=false;
        const resize=()=>{const r=card.getBoundingClientRect(); if(!r.width||!r.height)return; const d=Math.min(devicePixelRatio||1,2),w=Math.round(r.width*d),h=Math.round(r.height*d); if(chromaticCanvas.width!==w||chromaticCanvas.height!==h){chromaticCanvas.width=w;chromaticCanvas.height=h;cgl.viewport(0,0,w,h);} cgl.uniform1f(u.canvasAspect,r.width/r.height);};
        const render=(now)=>{const dt=Math.min((now-previous)/1000,.05);previous=now;progress=approach(progress,progressTarget,10,dt);pointer.x=approach(pointer.x,target.x,30,dt);pointer.y=approach(pointer.y,target.y,30,dt);cgl.uniform1f(u.progress,reduceMotion?0:progress);cgl.uniform2f(u.pointer,pointer.x,pointer.y);if(imageLoaded)cgl.drawArrays(cgl.TRIANGLES,0,3);const rx=reduceMotion?0:(.5-pointer.y)*5.4,ry=reduceMotion?0:(pointer.x-.5)*5.4;chromaticCanvas.style.transform=`perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.025)`;const settled=Math.abs(progress-progressTarget)<.001&&Math.abs(pointer.x-target.x)<.001&&Math.abs(pointer.y-target.y)<.001;if(settled)rendering=false;else requestAnimationFrame(render);};
        const requestRender=()=>{if(rendering)return;rendering=true;previous=performance.now();requestAnimationFrame(render);};
        const move=(e)=>{const r=card.getBoundingClientRect(),x=Math.max(0,Math.min(r.width,e.clientX-r.left)),y=Math.max(0,Math.min(r.height,e.clientY-r.top));target.x=x/r.width;target.y=1-y/r.height;progressTarget=1;heartCursor.style.left=x+'px';heartCursor.style.top=y+'px';card.classList.add('cursor-active');requestRender();};
        const reset=()=>{target.x=.5;target.y=.5;progressTarget=0;card.classList.remove('cursor-active');requestRender();};
        const image=new Image();image.onload=()=>{cgl.bindTexture(cgl.TEXTURE_2D,texture);cgl.texImage2D(cgl.TEXTURE_2D,0,cgl.RGBA,cgl.RGBA,cgl.UNSIGNED_BYTE,image);cgl.uniform1f(u.imageAspect,image.naturalWidth/image.naturalHeight);imageLoaded=true;card.classList.add('ready');resize();requestRender();};image.src=IMG;
        new ResizeObserver(()=>{resize();requestRender();}).observe(card);
        card.addEventListener('pointermove',move,{passive:true});card.addEventListener('pointerdown',move,{passive:true});card.addEventListener('pointerup',reset,{passive:true});card.addEventListener('pointerleave',reset,{passive:true});resize();
      }
    }
  }

  const cloudCanvas = $('cloudCanvas');
  const gl = cloudCanvas.getContext('webgl', { alpha:false, antialias:false, premultipliedAlpha:false });
  if (gl) {
    const V=`attribute vec2 a_pos;varying vec2 v_uv;void main(){v_uv=a_pos*.5+.5;gl_Position=vec4(a_pos,0.,1.);}`;
    const F=`precision highp float;varying vec2 v_uv;uniform vec2 u_res;uniform float u_time;uniform float u_count;uniform vec3 u_cloud;uniform vec3 u_skyTop;uniform vec3 u_skyBottom;const mat2 R=mat2(.80,.60,-.60,.80);
    float hash(vec2 p){return fract(sin(dot(p,vec2(41.31,289.17)))*26737.367);}float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vnoise(p);p=R*p*2.03+19.19;a*=.5;}return s;}float billow(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*(1.-abs(2.*vnoise(p)-1.));p=R*p*2.11+13.37;a*=.5;}return s;}
    float den(vec2 p,vec2 c,vec2 r,float seed,float t){vec2 q=p-c;float ry=q.y>0.?r.y:r.y*.42;float env=1.-length(vec2(q.x/r.x,q.y/ry));if(env<-.35)return 0.;vec2 dp=q*(2.4/r.x)+seed;dp+=.6*vec2(fbm(dp*1.4+t*.04),fbm(dp*1.4+7.7-t*.03));return env+(billow(dp*1.6)-.62)*.62;}
    vec3 shade(vec3 color,vec3 sky,vec2 p,vec2 c,vec2 r,float seed,float t,float dist){float d=den(p,c,r,seed,t);if(d<.02)return color;float du=den(p+vec2(0.,r.y*.55),c,r,seed,t);float occl=clamp((du-d)*1.1+d*.55,0.,1.);vec3 col=mix(u_cloud*1.04,mix(u_cloud*.60,sky,.38),occl*.85);float a=smoothstep(.02,.38,d),rim=smoothstep(.02,.14,d)*(1.-smoothstep(.14,.40,d));col+=rim*.10;col=mix(col,sky,dist*.35);a*=mix(1.,.8,dist);return mix(color,col,a);}
    vec3 pass(vec3 color,vec3 sky,vec2 p,float aspect,float t,float spd,float phase,float y,vec2 r,float seed,float dist){float cx=mix(-r.x-.25,aspect+r.x+.25,fract(t*spd+phase));float cy=y+sin(t*.05+phase*6.2831)*.012;return shade(color,sky,p,vec2(cx,cy),r,seed,t,dist);}
    void main(){float aspect=u_res.x/u_res.y;vec2 p=vec2(v_uv.x*aspect,v_uv.y);float t=u_time;vec3 sky=mix(u_skyBottom,u_skyTop,v_uv.y),color=sky;color=mix(color,u_skyBottom*1.06,smoothstep(.35,0.,v_uv.y)*.5);vec2 sun=vec2(aspect*.78,.92);float sd=length(p-sun);color+=vec3(1.,.95,.82)*exp(-sd*sd*5.)*.28;float cb=smoothstep(.55,.8,v_uv.y)*(1.-smoothstep(.9,1.,v_uv.y));if(cb>.01){float streak=fbm(vec2(p.x*1.6-t*.006,p.y*12.));color=mix(color,u_cloud*.98,smoothstep(.52,.78,streak)*cb*.35);}if(u_count>5.5)color=pass(color,sky,p,aspect,t,.006,.10,.84,vec2(.20,.10),43.7,1.);if(u_count>4.5)color=pass(color,sky,p,aspect,t,.008,.62,.73,vec2(.24,.12),71.3,.85);if(u_count>3.5)color=pass(color,sky,p,aspect,t,.011,.33,.60,vec2(.34,.16),17.3,.55);if(u_count>2.5)color=pass(color,sky,p,aspect,t,.013,.80,.47,vec2(.30,.15),29.9,.45);if(u_count>1.5)color=pass(color,sky,p,aspect,t,.016,.05,.35,vec2(.46,.20),91.1,.15);color=pass(color,sky,p,aspect,t,.020,.48,.20,vec2(.56,.24),57.2,0.);gl_FragColor=vec4(color,1.);}`;
    const vs=compile(gl,gl.VERTEX_SHADER,V),fs=compile(gl,gl.FRAGMENT_SHADER,F);
    if(vs&&fs){const p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.bindAttribLocation(p,0,'a_pos');gl.linkProgram(p);if(gl.getProgramParameter(p,gl.LINK_STATUS)){gl.useProgram(p);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);const loc={res:gl.getUniformLocation(p,'u_res'),time:gl.getUniformLocation(p,'u_time'),count:gl.getUniformLocation(p,'u_count'),cloud:gl.getUniformLocation(p,'u_cloud'),skyTop:gl.getUniformLocation(p,'u_skyTop'),skyBottom:gl.getUniformLocation(p,'u_skyBottom')};const start=performance.now();const draw=(now)=>{const d=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.floor(innerWidth*d)),h=Math.max(1,Math.floor(innerHeight*d));if(cloudCanvas.width!==w||cloudCanvas.height!==h){cloudCanvas.width=w;cloudCanvas.height=h;}gl.viewport(0,0,w,h);gl.uniform2f(loc.res,w,h);gl.uniform1f(loc.time,reduceMotion?0:(now-start)/1000);gl.uniform1f(loc.count,6);gl.uniform3f(loc.cloud,.984,.973,.949);gl.uniform3f(loc.skyTop,.30,.53,.76);gl.uniform3f(loc.skyBottom,.67,.82,.92);gl.drawArrays(gl.TRIANGLES,0,3);requestAnimationFrame(draw);};requestAnimationFrame(draw);}}
  }

  const dateText=$('dateText'),timeText=$('timeText'),weatherText=$('weatherText');
  const tick=()=>{const now=new Date();dateText.textContent=new Intl.DateTimeFormat(undefined,{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(now);timeText.textContent=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(now);};tick();setInterval(tick,1000);
  const weatherNames={0:'clear sky',1:'mainly clear',2:'partly cloudy',3:'overcast',45:'fog',48:'rime fog',51:'light drizzle',53:'drizzle',55:'heavy drizzle',61:'light rain',63:'rain',65:'heavy rain',71:'light snow',73:'snow',75:'heavy snow',80:'rain showers',81:'showers',82:'heavy showers',95:'thunderstorm',96:'storm + hail',99:'storm + hail'};
  function loadWeather(){if(!navigator.geolocation){weatherText.textContent='weather · unavailable';return;}navigator.geolocation.getCurrentPosition(async({coords})=>{try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code&timezone=auto`);const d=await r.json(),c=d.current||{};weatherText.textContent=`${Math.round(c.temperature_2m)}° · ${weatherNames[c.weather_code]||'weather'}`;}catch{weatherText.textContent='weather · unavailable';}},()=>weatherText.textContent='weather · location off',{timeout:8000,maximumAge:600000});}

  heroVideo.addEventListener('loadeddata',()=>{heroVideo.style.display='block';if (entered) heroVideo.play().catch(()=>{});});
  heroVideo.addEventListener('error',()=>console.warn('Hero video failed to load'));

  const audio=$('audio'),prev=$('prevBtn'),play=$('playBtn'),next=$('nextBtn'),toast=$('trackToast');let tracks=[],trackIndex=0,entered=false,toastTimer;
  const showTrack=(name)=>{toast.textContent=name;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2200);};
  const setTrack=(i,autoplay=false)=>{if(!tracks.length)return;trackIndex=(i+tracks.length)%tracks.length;const t=tracks[trackIndex];audio.src=t.previewUrl;audio.volume=.55;showTrack(t.trackName);if(autoplay)audio.play().then(()=>play.textContent='❚❚').catch(()=>play.textContent='▶');};
  window.__cashLanaMusic=(data)=>{const seen=new Set();tracks=(data.results||[]).filter(x=>x.previewUrl&&/^lana del rey$/i.test((x.artistName||'').trim())).filter(x=>{const k=(x.trackName||'').toLowerCase();if(!k||seen.has(k))return false;seen.add(k);return true;}).slice(0,40);if(tracks.length){[prev,play,next].forEach(b=>b.disabled=false);setTrack(0,entered);}};
  const script=document.createElement('script');script.async=true;script.src='https://itunes.apple.com/search?term=lana%20del%20rey&entity=song&attribute=artistTerm&limit=100&country=US&callback=__cashLanaMusic';document.head.appendChild(script);
  prev.addEventListener('click',()=>setTrack(trackIndex-1,true));next.addEventListener('click',()=>setTrack(trackIndex+1,true));play.addEventListener('click',()=>{if(!tracks.length)return;if(audio.paused)audio.play().then(()=>play.textContent='❚❚').catch(()=>{});else{audio.pause();play.textContent='▶';}});audio.addEventListener('ended',()=>setTrack(trackIndex+1,true));audio.addEventListener('pause',()=>{if(!audio.ended)play.textContent='▶';});audio.addEventListener('play',()=>play.textContent='❚❚');

  const flowers=['❀','✿','❁','🌸','♡','❊'];
  function showerFlowers(count=38){for(let i=0;i<count;i++){const f=document.createElement('span');f.className='falling-flower';f.textContent=flowers[(Math.random()*flowers.length)|0];f.style.left=(Math.random()*100)+'vw';f.style.setProperty('--drift',((Math.random()-.5)*240)+'px');f.style.setProperty('--spin',((Math.random()-.5)*900)+'deg');f.style.animationDuration=(4+Math.random()*4)+'s';f.style.animationDelay=(Math.random()*.8)+'s';f.style.fontSize=(14+Math.random()*18)+'px';document.body.appendChild(f);setTimeout(()=>f.remove(),9000);}}
  $('flowerButton').addEventListener('click',()=>showerFlowers(48));

  let entering=false;
  function enter(){if(entering)return;entering=true;entered=true;softLoad.classList.add('active');if(tracks.length)setTrack(trackIndex,true);setTimeout(()=>{loader.classList.add('leaving');softLoad.classList.add('opening');setTimeout(()=>{loader.hidden=true;hero.classList.add('visible');hero.setAttribute('aria-hidden','false');softLoad.classList.remove('active','opening');loadWeather();showerFlowers(20);heroVideo.play().catch(()=>{});},650);},650);}
  card.addEventListener('click',enter);enterText.addEventListener('click',enter);
})();
