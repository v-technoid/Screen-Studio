(function(){

  // ---------- strict capability detection ----------
  function handleMobileDeviceCapabilities(){
    var canRecordScreen = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    
    var recAudioOptions = document.getElementById('recAudioOptions');
    var recControlsRow = document.getElementById('recControlsRow');
    var recHintText = document.getElementById('recHintText');
    var mobileRecFallback = document.getElementById('mobileRecFallback');
    var securityRecFallback = document.getElementById('securityRecFallback');

    var shotButtonsRow = document.getElementById('shotButtonsRow');
    var shotHintText = document.getElementById('shotHintText');
    var mobileShotFallback = document.getElementById('mobileShotFallback');

    if(mobileRecFallback) mobileRecFallback.hidden = true;
    if(securityRecFallback) securityRecFallback.hidden = true;
    if(mobileShotFallback) mobileShotFallback.hidden = true;

    if(canRecordScreen){
      if(recAudioOptions) recAudioOptions.hidden = false;
      if(recControlsRow) recControlsRow.hidden = false;
      if(recHintText) recHintText.hidden = false;
      if(shotButtonsRow) shotButtonsRow.hidden = false;
      if(shotHintText) shotHintText.hidden = false;
      return;
    }

    if(recAudioOptions) recAudioOptions.hidden = true;
    if(recControlsRow) recControlsRow.hidden = true;
    if(recHintText) recHintText.hidden = true;
    if(shotButtonsRow) shotButtonsRow.hidden = true;
    if(shotHintText) shotHintText.hidden = true;

    var isInsecure = (window.location.protocol === 'file:' || !window.isSecureContext);
    if(isInsecure){
      if(securityRecFallback) securityRecFallback.hidden = false;
    } else {
      if(mobileRecFallback) mobileRecFallback.hidden = false;
      if(mobileShotFallback) mobileShotFallback.hidden = false;
    }
  }
  
  handleMobileDeviceCapabilities();

  // ---------- mobile menu ----------
  var hamburgerBtn = document.getElementById('hamburgerBtn');
  var mobileNav = document.getElementById('mobileNav');
  if(hamburgerBtn){
    hamburgerBtn.addEventListener('click', function(){
      mobileNav.classList.toggle('open');
    });
    mobileNav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ mobileNav.classList.remove('open'); });
    });
  }

  // ---------- scroll reveal ----------
  if('IntersectionObserver' in window){
    var revealObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function(el){ revealObserver.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('is-visible'); });
  }

  // ---------- side nav active link ----------
  var sideLinks = document.querySelectorAll('.side-nav a');
  if(sideLinks.length && 'IntersectionObserver' in window){
    var sectionMap = {};
    sideLinks.forEach(function(a){ sectionMap[a.dataset.target] = a; });
    var navObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        var link = sectionMap[entry.target.id];
        if(!link) return;
        if(entry.isIntersecting){
          sideLinks.forEach(function(a){ a.classList.remove('active'); });
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    document.querySelectorAll('.tool-section').forEach(function(sec){ navObserver.observe(sec); });
  }

  function fmt(t){
    if(!isFinite(t)) return '0:00';
    var m = Math.floor(t/60), s = Math.floor(t%60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ---------- dark mode ----------
  var themeToggleBtn = document.getElementById('themeToggleBtn');
  var sunIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  var moonIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function applyTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    try{ localStorage.setItem('ss-theme', t); }catch(e){}
    if(themeToggleBtn) themeToggleBtn.innerHTML = t === 'dark' ? sunIcon : moonIcon;
  }
  var savedTheme = 'light';
  try{ savedTheme = localStorage.getItem('ss-theme') || 'light'; }catch(e){}
  applyTheme(savedTheme);
  if(themeToggleBtn){
    themeToggleBtn.addEventListener('click', function(){
      var cur = document.documentElement.getAttribute('data-theme');
      applyTheme(cur === 'dark' ? 'light' : 'dark');
    });
  }

  // ---------- hero word stagger ----------
  var heroTitle = document.getElementById('heroTitle');
  if(heroTitle){
    var heroWords = heroTitle.querySelectorAll('.hero-word');
    heroWords.forEach(function(w, i){ w.style.transitionDelay = (i * 0.045) + 's'; });
    if('IntersectionObserver' in window){
      var heroObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            heroObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      heroObserver.observe(heroTitle);
    } else {
      heroTitle.classList.add('is-visible');
    }
  }

  // ---------- local visit counter ----------
  var visitCounterEl = document.getElementById('visitCounter');
  if(visitCounterEl){
    try{
      var visits = parseInt(localStorage.getItem('ss-visits') || '0', 10) + 1;
      localStorage.setItem('ss-visits', visits);
      visitCounterEl.textContent = 'Opened on this device ' + visits + (visits === 1 ? ' time' : ' times');
    }catch(e){
      visitCounterEl.textContent = '';
    }
  }

  // ================= RECORD TAB =================
  var mediaRecorder, recordedChunks = [], recordedBlobUrl = null;
  var startRecBtn = document.getElementById('startRecBtn');
  var stopRecBtn = document.getElementById('stopRecBtn');
  var recStatus = document.getElementById('recStatus');
  var recResultPanel = document.getElementById('recResultPanel');
  var recDownloadLink = document.getElementById('recDownloadLink');
  var sendToEditorBtn = document.getElementById('sendToEditorBtn');

  var recSystemAudioEl = document.getElementById('recSystemAudio');
  var recMicAudioEl = document.getElementById('recMicAudio');
  var recWebcamPipEl = document.getElementById('recWebcamPip');
  var recAutoCaptionsEl = document.getElementById('recAutoCaptions');

  var liveTranscribeBox = document.getElementById('liveTranscribeBox');
  var liveTranscribeText = document.getElementById('liveTranscribeText');

  var liveSpeechRecognition = null;
  var recordedSpeechCaptions = [];
  var recStartTime = 0;
  var phraseStartTime = 0;

  if(startRecBtn){
    startRecBtn.addEventListener('click', async function(){
      try{
        var wantsSystemAudio = recSystemAudioEl && recSystemAudioEl.checked;
        var wantsMicAudio = recMicAudioEl && recMicAudioEl.checked;
        var wantsWebcamPip = recWebcamPipEl && recWebcamPipEl.checked;
        var wantsAutoCaptions = recAutoCaptionsEl && recAutoCaptionsEl.checked;

        var displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: wantsSystemAudio ? { echoCancellation: true, noiseSuppression: true } : false
        });

        var micStream = null;
        var webcamStream = null;

        if(wantsMicAudio || wantsWebcamPip || wantsAutoCaptions){
          try{
            var userStream = await navigator.mediaDevices.getUserMedia({
              audio: (wantsMicAudio || wantsAutoCaptions) ? { echoCancellation: true, noiseSuppression: true } : false,
              video: wantsWebcamPip ? { width: 400, height: 400 } : false
            });
            if((wantsMicAudio || wantsAutoCaptions) && userStream.getAudioTracks().length > 0) micStream = new MediaStream([userStream.getAudioTracks()[0]]);
            if(wantsWebcamPip && userStream.getVideoTracks().length > 0) webcamStream = new MediaStream([userStream.getVideoTracks()[0]]);
          }catch(userErr){
            alert('Could not access hardware: ' + userErr.message + '\nContinuing without mic/webcam overlay.');
          }
        }

        var videoTrackToRecord = displayStream.getVideoTracks()[0];
        var pipCanvas = null, pipCtx = null, pipAnimId = null;
        var tempScreenVid = null, tempCamVid = null;

        if(webcamStream){
          pipCanvas = document.createElement('canvas');
          pipCtx = pipCanvas.getContext('2d');
          
          tempScreenVid = document.createElement('video');
          tempScreenVid.srcObject = displayStream;
          tempScreenVid.muted = true;
          await tempScreenVid.play();

          tempCamVid = document.createElement('video');
          tempCamVid.srcObject = webcamStream;
          tempCamVid.muted = true;
          await tempCamVid.play();

          pipCanvas.width = tempScreenVid.videoWidth || 1920;
          pipCanvas.height = tempScreenVid.videoHeight || 1080;

          function renderPipLoop(){
            if(!pipCtx) return;
            pipCtx.drawImage(tempScreenVid, 0, 0, pipCanvas.width, pipCanvas.height);
            
            var pipSize = Math.floor(pipCanvas.width * 0.16);
            var pad = Math.floor(pipCanvas.width * 0.02);
            var cx = pipCanvas.width - pipSize/2 - pad;
            var cy = pipCanvas.height - pipSize/2 - pad;

            pipCtx.save();
            pipCtx.beginPath();
            pipCtx.arc(cx, cy, pipSize/2, 0, Math.PI * 2);
            pipCtx.clip();
            pipCtx.drawImage(tempCamVid, cx - pipSize/2, cy - pipSize/2, pipSize, pipSize);
            pipCtx.restore();

            pipCtx.save();
            pipCtx.beginPath();
            pipCtx.arc(cx, cy, pipSize/2, 0, Math.PI * 2);
            pipCtx.strokeStyle = '#2563eb';
            pipCtx.lineWidth = Math.max(4, pipCanvas.width * 0.004);
            pipCtx.stroke();
            pipCtx.restore();

            pipAnimId = requestAnimationFrame(renderPipLoop);
          }
          renderPipLoop();
          videoTrackToRecord = pipCanvas.captureStream(30).getVideoTracks()[0];
        }

        var combinedStream = new MediaStream([videoTrackToRecord]);
        var audioTracksToMix = [];
        if(displayStream.getAudioTracks().length > 0) audioTracksToMix.push(displayStream.getAudioTracks()[0]);
        if(wantsMicAudio && micStream && micStream.getAudioTracks().length > 0) audioTracksToMix.push(micStream.getAudioTracks()[0]);

        var audioCtx = null;
        if(audioTracksToMix.length === 1){
          combinedStream.addTrack(audioTracksToMix[0]);
        } else if(audioTracksToMix.length > 1){
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          var dest = audioCtx.createMediaStreamDestination();
          audioTracksToMix.forEach(function(track){
            var source = audioCtx.createMediaStreamSource(new MediaStream([track]));
            source.connect(dest);
          });
          if(dest.stream.getAudioTracks().length > 0){
            combinedStream.addTrack(dest.stream.getAudioTracks()[0]);
          }
        }

        recordedChunks = [];
        recordedSpeechCaptions = [];
        recStartTime = performance.now();
        phraseStartTime = 0;

        if(wantsAutoCaptions){
          var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
          if(SpeechRec){
            liveSpeechRecognition = new SpeechRec();
            liveSpeechRecognition.continuous = true;
            liveSpeechRecognition.interimResults = true;
            liveSpeechRecognition.lang = 'en-US';
            
            if(liveTranscribeBox) liveTranscribeBox.hidden = false;
            if(liveTranscribeText) liveTranscribeText.textContent = 'Listening...';

            liveSpeechRecognition.onresult = function(e){
              var interimTranscript = '';
              var finalTranscript = '';

              for(var i = e.resultIndex; i < e.results.length; ++i){
                if(e.results[i].isFinal){
                  finalTranscript += e.results[i][0].transcript.trim();
                } else {
                  interimTranscript += e.results[i][0].transcript;
                }
              }

              if(phraseStartTime === 0 && (interimTranscript || finalTranscript)){
                phraseStartTime = (performance.now() - recStartTime) / 1000;
              }

              if(liveTranscribeText){
                liveTranscribeText.textContent = finalTranscript || interimTranscript || 'Listening...';
              }

              if(finalTranscript){
                var nowSec = (performance.now() - recStartTime) / 1000;
                var duration = Math.max(1, nowSec - phraseStartTime);
                var words = finalTranscript.split(/\s+/);
                
                var chunkSize = 4;
                var totalChunks = Math.ceil(words.length / chunkSize);
                var chunkDur = duration / totalChunks;

                for(var c = 0; c < totalChunks; c++){
                  var chunkWords = words.slice(c * chunkSize, (c + 1) * chunkSize).join(' ');
                  var chunkStart = phraseStartTime + (c * chunkDur);
                  var chunkEnd = chunkStart + chunkDur;
                  recordedSpeechCaptions.push({
                    startTime: Math.max(0, chunkStart),
                    endTime: chunkEnd,
                    text: chunkWords
                  });
                }
                phraseStartTime = 0;
              }
            };
            try{ liveSpeechRecognition.start(); }catch(e){}
          } else {
            alert('Live speech recognition is not supported in this browser. Trying recording without auto-captions.');
          }
        }

        var mimeType = 'video/webm;codecs=vp9';
        if(!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: mimeType });
        
        mediaRecorder.ondataavailable = function(e){ if(e.data.size > 0) recordedChunks.push(e.data); };
        
        mediaRecorder.onstop = function(){
          if(pipAnimId) cancelAnimationFrame(pipAnimId);
          if(liveSpeechRecognition){ try{ liveSpeechRecognition.stop(); }catch(e){} liveSpeechRecognition = null; }
          if(liveTranscribeBox) liveTranscribeBox.hidden = true;
          
          var blob = new Blob(recordedChunks, { type: 'video/webm' });
          recordedBlobUrl = URL.createObjectURL(blob);
          recDownloadLink.href = recordedBlobUrl;
          recResultPanel.hidden = false;
          recStatus.innerHTML = '';
          
          displayStream.getTracks().forEach(function(t){ t.stop(); });
          if(micStream) micStream.getTracks().forEach(function(t){ t.stop(); });
          if(webcamStream) webcamStream.getTracks().forEach(function(t){ t.stop(); });
          combinedStream.getTracks().forEach(function(t){ t.stop(); });
          if(audioCtx && audioCtx.state !== 'closed') { try{ audioCtx.close(); }catch(e){} }
        };

        displayStream.getVideoTracks()[0].addEventListener('ended', function(){
          if(mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        });

        mediaRecorder.start();
        startRecBtn.disabled = true;
        stopRecBtn.disabled = false;
        recStatus.innerHTML = '<span class="rec-dot pulsing"></span>Recording...';
      }catch(err){
        recStatus.textContent = 'Could not start recording: ' + err.message;
      }
    });
  }

  if(stopRecBtn){
    stopRecBtn.addEventListener('click', function(){
      if(mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      startRecBtn.disabled = false;
      stopRecBtn.disabled = true;
    });
  }

  if(sendToEditorBtn){
    sendToEditorBtn.addEventListener('click', function(){
      if(recordedBlobUrl){
        loadVideoIntoEditor(recordedBlobUrl, recordedSpeechCaptions);
        document.getElementById('editor').scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // ================= EDITOR TAB =================
  var videoFileInput = document.getElementById('videoFileInput');
  var sourceVideo = document.getElementById('sourceVideo');
  var editCanvas = document.getElementById('editCanvas');
  var ctx = editCanvas ? editCanvas.getContext('2d') : null;
  var editorEmpty = document.getElementById('editorEmpty');
  var editorWork = document.getElementById('editorWork');
  var removeVideoBtn = document.getElementById('removeVideoBtn');

  var trimStart = document.getElementById('trimStart');
  var trimEnd = document.getElementById('trimEnd');
  var scrub = document.getElementById('scrub');
  var trimStartLabel = document.getElementById('trimStartLabel');
  var trimEndLabel = document.getElementById('trimEndLabel');
  var scrubLabel = document.getElementById('scrubLabel');

  var regions = []; // {type:'mark'|'blur', x, y, w, h, startTime, endTime}
  var regionList = document.getElementById('regionList');
  var activeTool = null;
  var drawing = false, drawStart = null, liveRect = null;

  var captions = []; // {startTime, endTime, text}
  var captionList = document.getElementById('captionList');
  var subtitleFileInput = document.getElementById('subtitleFileInput');
  var addCaptionBtn = document.getElementById('addCaptionBtn');
  var exportSrtBtn = document.getElementById('exportSrtBtn');
  var clearCaptionsBtn = document.getElementById('clearCaptionsBtn');

  var watermarkImg = null;
  var watermarkInput = document.getElementById('watermarkInput');
  if(watermarkInput){
    watermarkInput.addEventListener('change', function(){
      var f = watermarkInput.files[0];
      if(!f){ watermarkImg = null; return; }
      var img = new Image();
      img.onload = function(){ watermarkImg = img; drawCurrentFrame(); };
      img.src = URL.createObjectURL(f);
    });
  }

  if(videoFileInput){
    videoFileInput.addEventListener('change', function(){
      var f = videoFileInput.files[0];
      if(f) loadVideoIntoEditor(URL.createObjectURL(f), []);
    });
  }

  function loadVideoIntoEditor(url, initialCaptions){
    regions = [];
    captions = initialCaptions ? initialCaptions.slice() : [];
    renderRegionList();
    renderCaptionList();
    sourceVideo.src = url;
    sourceVideo.onloadedmetadata = function(){
      editCanvas.width = sourceVideo.videoWidth;
      editCanvas.height = sourceVideo.videoHeight;
      var readoutRes = document.getElementById('readoutRes');
      if(readoutRes) readoutRes.textContent = sourceVideo.videoWidth + ' × ' + sourceVideo.videoHeight;
      trimStart.max = trimEnd.max = scrub.max = sourceVideo.duration;
      trimStart.value = 0;
      trimEnd.value = sourceVideo.duration;
      scrub.value = 0;
      updateLabels();
      editorEmpty.hidden = true;
      editorWork.hidden = false;
      if(removeVideoBtn) removeVideoBtn.hidden = false;
      sourceVideo.currentTime = 0;
      sourceVideo.addEventListener('seeked', drawCurrentFrame, { once: false });
      drawCurrentFrame();
    };
  }

  if(removeVideoBtn){
    removeVideoBtn.addEventListener('click', function(){
      sourceVideo.pause();
      sourceVideo.src = '';
      sourceVideo.removeAttribute('src');
      sourceVideo.load();
      regions = [];
      captions = [];
      renderRegionList();
      renderCaptionList();
      if(videoFileInput) videoFileInput.value = '';
      if(projectFileInput) projectFileInput.value = '';
      if(subtitleFileInput) subtitleFileInput.value = '';
      editorWork.hidden = true;
      editorEmpty.hidden = false;
      removeVideoBtn.hidden = true;
      var exportResult = document.getElementById('exportResult');
      if(exportResult) exportResult.innerHTML = '';
      var exportProgressWrap = document.getElementById('exportProgressWrap');
      if(exportProgressWrap) exportProgressWrap.classList.remove('show');
    });
  }

  function updateLabels(){
    if(trimStartLabel) trimStartLabel.textContent = fmt(parseFloat(trimStart.value));
    if(trimEndLabel) trimEndLabel.textContent = fmt(parseFloat(trimEnd.value));
    if(scrubLabel) scrubLabel.textContent = fmt(parseFloat(scrub.value));
  }

  if(trimStart){
    trimStart.addEventListener('input', function(){
      if(parseFloat(trimStart.value) > parseFloat(trimEnd.value)) trimStart.value = trimEnd.value;
      updateLabels();
      sourceVideo.currentTime = parseFloat(trimStart.value);
    });
  }
  if(trimEnd){
    trimEnd.addEventListener('input', function(){
      if(parseFloat(trimEnd.value) < parseFloat(trimStart.value)) trimEnd.value = trimStart.value;
      updateLabels();
      sourceVideo.currentTime = parseFloat(trimEnd.value);
    });
  }
  if(scrub){
    scrub.addEventListener('input', function(){
      updateLabels();
      sourceVideo.currentTime = parseFloat(scrub.value);
    });
  }

  function drawCurrentFrame(){
    if(!ctx) return;
    ctx.filter = 'none';
    ctx.drawImage(sourceVideo, 0, 0, editCanvas.width, editCanvas.height);
    drawRegionsOnCanvas(ctx);
    if(watermarkImg) drawWatermarkOnCanvas(ctx);
    
    var burnEl = document.getElementById('exportBurnCaptions');
    if(burnEl && burnEl.checked && captions.length > 0){
      drawCaptionsOnCanvas(ctx);
    }
    
    if(liveRect) drawLiveRectPreview();
    var readoutTime = document.getElementById('readoutTime');
    if(readoutTime) readoutTime.textContent = fmt(sourceVideo.currentTime) + ' / ' + fmt(sourceVideo.duration);
  }

  function drawRegionsOnCanvas(targetCtx){
    var curTime = sourceVideo.currentTime;

    regions.forEach(function(r){
      if(r.type === 'blur' && curTime >= r.startTime && curTime <= r.endTime){
        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.rect(r.x, r.y, r.w, r.h);
        targetCtx.clip();
        targetCtx.filter = 'blur(18px)';
        targetCtx.drawImage(sourceVideo, 0, 0, editCanvas.width, editCanvas.height);
        targetCtx.restore();
      }
    });

    regions.forEach(function(r){
      if(r.type === 'mark' && curTime >= r.startTime && curTime <= r.endTime){
        targetCtx.save();
        targetCtx.filter = 'none';
        targetCtx.strokeStyle = '#2563eb';
        targetCtx.lineWidth = 4;
        targetCtx.strokeRect(r.x, r.y, r.w, r.h);
        targetCtx.restore();
      }
    });
  }

  function drawWatermarkOnCanvas(targetCtx){
    if(!watermarkImg) return;
    var posSel = document.getElementById('watermarkPosSelect');
    var pos = posSel ? posSel.value : 'bottom-right';
    var maxW = Math.floor(editCanvas.width * 0.15);
    var scale = Math.min(1, maxW / watermarkImg.width);
    var w = Math.floor(watermarkImg.width * scale);
    var h = Math.floor(watermarkImg.height * scale);
    var pad = Math.floor(editCanvas.width * 0.02);

    var x = pad, y = pad;
    if(pos.indexOf('right') !== -1) x = editCanvas.width - w - pad;
    if(pos.indexOf('bottom') !== -1) y = editCanvas.height - h - pad;

    targetCtx.save();
    targetCtx.globalAlpha = 0.85;
    targetCtx.drawImage(watermarkImg, x, y, w, h);
    targetCtx.restore();
  }

  function drawCaptionsOnCanvas(targetCtx){
    var curTime = sourceVideo.currentTime;
    var activeCue = null;
    for(var i = 0; i < captions.length; i++){
      if(curTime >= captions[i].startTime && curTime <= captions[i].endTime){
        activeCue = captions[i];
        break;
      }
    }
    if(!activeCue || !activeCue.text) return;

    var fontSize = Math.max(22, Math.floor(editCanvas.width * 0.032));
    targetCtx.save();
    targetCtx.font = '700 ' + fontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';

    var words = activeCue.text.split(' ');
    var lines = [];
    var currentLine = '';
    var maxLineW = Math.floor(editCanvas.width * 0.85);

    for(var w = 0; w < words.length; w++){
      var testLine = currentLine ? (currentLine + ' ' + words[w]) : words[w];
      if(targetCtx.measureText(testLine).width > maxLineW && currentLine){
        lines.push(currentLine);
        currentLine = words[w];
      } else {
        currentLine = testLine;
      }
    }
    if(currentLine) lines.push(currentLine);

    var padX = fontSize * 0.8;
    var padY = fontSize * 0.4;
    var lineHeight = fontSize * 1.35;
    var totalTextW = 0;
    lines.forEach(function(l){ totalTextW = Math.max(totalTextW, targetCtx.measureText(l).width); });
    
    var boxW = Math.min(editCanvas.width * 0.9, totalTextW + padX * 2);
    var boxH = (lines.length * lineHeight) + padY * 2 - (lineHeight - fontSize);
    var cx = editCanvas.width / 2;
    var cy = editCanvas.height - boxH/2 - Math.floor(editCanvas.height * 0.06);

    targetCtx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    targetCtx.beginPath();
    if(targetCtx.roundRect) targetCtx.roundRect(cx - boxW/2, cy - boxH/2, boxW, boxH, 12);
    else targetCtx.rect(cx - boxW/2, cy - boxH/2, boxW, boxH);
    targetCtx.fill();

    targetCtx.fillStyle = '#facc15';
    var startY = cy - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach(function(line, idx){
      targetCtx.fillText(line, cx, startY + (idx * lineHeight));
    });
    targetCtx.restore();
  }

  function drawLiveRectPreview(){
    ctx.save();
    ctx.strokeStyle = activeTool === 'blur' ? '#d97706' : '#2563eb';
    ctx.setLineDash([6,4]);
    ctx.lineWidth = 3;
    ctx.strokeRect(liveRect.x, liveRect.y, liveRect.w, liveRect.h);
    ctx.restore();
  }

  var markToolBtn = document.getElementById('markToolBtn');
  var blurToolBtn = document.getElementById('blurToolBtn');
  var noToolBtn = document.getElementById('noToolBtn');
  var undoRegionBtn = document.getElementById('undoRegionBtn');

  if(markToolBtn) markToolBtn.addEventListener('click', function(){ setTool('mark'); });
  if(blurToolBtn) blurToolBtn.addEventListener('click', function(){ setTool('blur'); });
  if(noToolBtn) noToolBtn.addEventListener('click', function(){ setTool(null); });
  if(undoRegionBtn){
    undoRegionBtn.addEventListener('click', function(){
      regions.pop();
      renderRegionList();
      drawCurrentFrame();
    });
  }

  function setTool(tool){
    activeTool = tool;
    if(markToolBtn) markToolBtn.classList.remove('toggled');
    if(blurToolBtn) blurToolBtn.classList.remove('toggled', 'blur-mode');
    if(tool === 'mark' && markToolBtn) markToolBtn.classList.add('toggled');
    if(tool === 'blur' && blurToolBtn) blurToolBtn.classList.add('toggled', 'blur-mode');
  }

  function canvasCoords(e){
    var rect = editCanvas.getBoundingClientRect();
    var scaleX = editCanvas.width / rect.width;
    var scaleY = editCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  if(editCanvas){
    editCanvas.addEventListener('mousedown', function(e){
      if(!activeTool) return;
      drawing = true;
      drawStart = canvasCoords(e);
      liveRect = { x: drawStart.x, y: drawStart.y, w: 0, h: 0 };
    });
    editCanvas.addEventListener('mousemove', function(e){
      if(!drawing) return;
      var p = canvasCoords(e);
      liveRect = {
        x: Math.min(p.x, drawStart.x),
        y: Math.min(p.y, drawStart.y),
        w: Math.abs(p.x - drawStart.x),
        h: Math.abs(p.y - drawStart.y)
      };
      drawCurrentFrame();
    });
    window.addEventListener('mouseup', function(){
      if(!drawing) return;
      drawing = false;
      if(liveRect && liveRect.w > 6 && liveRect.h > 6){
        regions.push({ 
          type: activeTool, 
          x: liveRect.x, 
          y: liveRect.y, 
          w: liveRect.w, 
          h: liveRect.h,
          startTime: 0,
          endTime: sourceVideo.duration || 100
        });
        renderRegionList();
      }
      liveRect = null;
      drawCurrentFrame();
    });
  }

  function renderRegionList(){
    if(!regionList) return;
    regionList.innerHTML = '';
    regions.forEach(function(r, i){
      var div = document.createElement('div');
      div.className = 'region-item';
      div.innerHTML = 
        '<span class="swatch" style="background:' + (r.type === 'blur' ? '#d97706' : '#2563eb') + '"></span>' +
        '<span class="label">' + (r.type === 'blur' ? 'Blur box' : 'Mark box') + ' ' + (i + 1) + '</span>' +
        '<div class="region-time-controls">' +
          '<div class="region-time-group">' +
            'Start: <input type="number" class="region-time-input start-input" data-i="' + i + '" min="0" max="' + (sourceVideo.duration || 100) + '" step="0.1" value="' + (r.startTime.toFixed(1)) + '">s' +
          '</div>' +
          '<div class="region-time-group">' +
            'End: <input type="number" class="region-time-input end-input" data-i="' + i + '" min="0" max="' + (sourceVideo.duration || 100) + '" step="0.1" value="' + (r.endTime.toFixed(1)) + '">s' +
          '</div>' +
          '<button class="remove-btn" data-i="' + i + '">Remove</button>' +
        '</div>';
      regionList.appendChild(div);
    });

    regionList.querySelectorAll('.start-input').forEach(function(inp){
      inp.addEventListener('change', function(){
        var idx = parseInt(inp.dataset.i);
        var val = parseFloat(inp.value) || 0;
        regions[idx].startTime = Math.max(0, Math.min(val, regions[idx].endTime));
        inp.value = regions[idx].startTime.toFixed(1);
        drawCurrentFrame();
      });
    });

    regionList.querySelectorAll('.end-input').forEach(function(inp){
      inp.addEventListener('change', function(){
        var idx = parseInt(inp.dataset.i);
        var val = parseFloat(inp.value) || 0;
        var maxDur = sourceVideo.duration || 100;
        regions[idx].endTime = Math.max(regions[idx].startTime, Math.min(val, maxDur));
        inp.value = regions[idx].endTime.toFixed(1);
        drawCurrentFrame();
      });
    });

    regionList.querySelectorAll('.remove-btn').forEach(function(b){
      b.addEventListener('click', function(){
        regions.splice(parseInt(b.dataset.i), 1);
        renderRegionList();
        drawCurrentFrame();
      });
    });
  }

  // ---------- Subtitle / Caption Management ----------
  if(addCaptionBtn){
    addCaptionBtn.addEventListener('click', function(){
      var curTime = sourceVideo.currentTime || 0;
      var maxDur = sourceVideo.duration || 100;
      captions.push({
        startTime: curTime,
        endTime: Math.min(curTime + 3, maxDur),
        text: 'New Subtitle Cue'
      });
      captions.sort(function(a, b){ return a.startTime - b.startTime; });
      renderCaptionList();
      drawCurrentFrame();
    });
  }

  if(clearCaptionsBtn){
    clearCaptionsBtn.addEventListener('click', function(){
      captions = [];
      renderCaptionList();
      drawCurrentFrame();
    });
  }

  if(subtitleFileInput){
    subtitleFileInput.addEventListener('change', function(){
      var f = subtitleFileInput.files[0];
      if(!f) return;
      var reader = new FileReader();
      reader.onload = function(e){
        try{
          parseSubtitleFile(e.target.result);
          renderCaptionList();
          drawCurrentFrame();
          alert('Subtitles imported successfully!');
        }catch(err){
          alert('Could not parse subtitle file: ' + err.message);
        }
      };
      reader.readAsText(f);
      subtitleFileInput.value = '';
    });
  }

  function parseSubtitleFile(text){
    captions = [];
    var lines = text.replace(/\r\n/g, '\n').split('\n');
    var cue = null;
    for(var i = 0; i < lines.length; i++){
      var line = lines[i].trim();
      if(line.indexOf('-->') !== -1){
        var parts = line.split('-->');
        if(parts.length === 2){
          cue = { startTime: parseTimecode(parts[0].trim()), endTime: parseTimecode(parts[1].trim()), text: '' };
          captions.push(cue);
        }
      } else if(cue && line !== '' && !/^\d+$/.test(line) && line !== 'WEBVTT'){
        cue.text = cue.text ? (cue.text + ' ' + line) : line;
      } else if(line === ''){
        cue = null;
      }
    }
  }

  function parseTimecode(tc){
    var parts = tc.replace(',', '.').split(':');
    if(parts.length === 3){
      return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    } else if(parts.length === 2){
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return 0;
  }

  function formatSrtTimecode(sec){
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = Math.floor(sec % 60);
    var ms = Math.floor((sec % 1) * 1000);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + ',' + (ms < 100 ? (ms < 10 ? '00' : '0') : '') + ms;
  }

  if(exportSrtBtn){
    exportSrtBtn.addEventListener('click', function(){
      if(captions.length === 0){ alert('No subtitles to export!'); return; }
      var srtText = '';
      captions.forEach(function(c, i){
        srtText += (i + 1) + '\r\n';
        srtText += formatSrtTimecode(c.startTime) + ' --> ' + formatSrtTimecode(c.endTime) + '\r\n';
        srtText += c.text + '\r\n\r\n';
      });
      var blob = new Blob([srtText], { type: 'text/plain' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'subtitles.srt';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
  }

  function renderCaptionList(){
    if(!captionList) return;
    captionList.innerHTML = '';
    if(clearCaptionsBtn) clearCaptionsBtn.hidden = (captions.length === 0);

    captions.forEach(function(c, i){
      var div = document.createElement('div');
      div.className = 'caption-item';
      div.innerHTML = 
        '<span class="swatch" style="background:#facc15"></span>' +
        '<input type="text" class="caption-text-input" data-i="' + i + '" value="' + c.text.replace(/"/g, '&quot;') + '" placeholder="Subtitle text...">' +
        '<div class="caption-time-controls">' +
          '<div class="caption-time-group">' +
            'Start: <input type="number" class="caption-time-input start-input" data-i="' + i + '" min="0" max="' + (sourceVideo.duration || 100) + '" step="0.1" value="' + (c.startTime.toFixed(1)) + '">s' +
          '</div>' +
          '<div class="caption-time-group">' +
            'End: <input type="number" class="caption-time-input end-input" data-i="' + i + '" min="0" max="' + (sourceVideo.duration || 100) + '" step="0.1" value="' + (c.endTime.toFixed(1)) + '">s' +
          '</div>' +
          '<button class="remove-btn" data-i="' + i + '">Remove</button>' +
        '</div>';
      captionList.appendChild(div);
    });

    captionList.querySelectorAll('.caption-text-input').forEach(function(inp){
      inp.addEventListener('input', function(){
        var idx = parseInt(inp.dataset.i);
        captions[idx].text = inp.value;
        drawCurrentFrame();
      });
    });

    captionList.querySelectorAll('.start-input').forEach(function(inp){
      inp.addEventListener('change', function(){
        var idx = parseInt(inp.dataset.i);
        var val = parseFloat(inp.value) || 0;
        captions[idx].startTime = Math.max(0, Math.min(val, captions[idx].endTime));
        inp.value = captions[idx].startTime.toFixed(1);
        drawCurrentFrame();
      });
    });

    captionList.querySelectorAll('.end-input').forEach(function(inp){
      inp.addEventListener('change', function(){
        var idx = parseInt(inp.dataset.i);
        var val = parseFloat(inp.value) || 0;
        var maxDur = sourceVideo.duration || 100;
        captions[idx].endTime = Math.max(captions[idx].startTime, Math.min(val, maxDur));
        inp.value = captions[idx].endTime.toFixed(1);
        drawCurrentFrame();
      });
    });

    captionList.querySelectorAll('.remove-btn').forEach(function(b){
      b.addEventListener('click', function(){
        captions.splice(parseInt(b.dataset.i), 1);
        renderCaptionList();
        drawCurrentFrame();
      });
    });
  }

  var exportBurnCaptionsEl = document.getElementById('exportBurnCaptions');
  if(exportBurnCaptionsEl){
    exportBurnCaptionsEl.addEventListener('change', function(){ drawCurrentFrame(); });
  }

  // ---------- save & load project (.json) ----------
  var saveProjectBtn = document.getElementById('saveProjectBtn');
  var loadProjectBtn = document.getElementById('loadProjectBtn');
  var projectFileInput = document.getElementById('projectFileInput');

  if(saveProjectBtn){
    saveProjectBtn.addEventListener('click', function(){
      if(!sourceVideo.src){ alert('No video loaded yet!'); return; }
      var projectData = {
        version: '1.0',
        trimStart: parseFloat(trimStart.value),
        trimEnd: parseFloat(trimEnd.value),
        regions: regions,
        captions: captions
      };
      var blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'screen-studio-project.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
  }

  if(loadProjectBtn && projectFileInput){
    loadProjectBtn.addEventListener('click', function(){ projectFileInput.click(); });
    projectFileInput.addEventListener('change', function(){
      var f = projectFileInput.files[0];
      if(!f) return;
      var reader = new FileReader();
      reader.onload = function(e){
        try{
          var data = JSON.parse(e.target.result);
          if(data.regions) regions = data.regions;
          if(data.captions) captions = data.captions;
          if(data.trimStart !== undefined) trimStart.value = data.trimStart;
          if(data.trimEnd !== undefined) trimEnd.value = data.trimEnd;
          updateLabels();
          renderRegionList();
          renderCaptionList();
          drawCurrentFrame();
          alert('Project settings loaded successfully!');
        }catch(err){
          alert('Invalid project file format.');
        }
      };
      reader.readAsText(f);
    });
  }

  // ---------- pro keyboard shortcuts ----------
  window.addEventListener('keydown', function(e){
    if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    var editorSec = document.getElementById('editor');
    if(!editorSec || editorSec.getBoundingClientRect().top > window.innerHeight || editorSec.getBoundingClientRect().bottom < 0) return;
    if(!sourceVideo.src) return;

    if(e.code === 'Space'){
      e.preventDefault();
      if(sourceVideo.paused) sourceVideo.play();
      else sourceVideo.pause();
    } else if(e.code === 'ArrowLeft'){
      e.preventDefault();
      sourceVideo.currentTime = Math.max(0, sourceVideo.currentTime - (1/30));
      if(scrub) scrub.value = sourceVideo.currentTime;
      updateLabels();
    } else if(e.code === 'ArrowRight'){
      e.preventDefault();
      sourceVideo.currentTime = Math.min(sourceVideo.duration, sourceVideo.currentTime + (1/30));
      if(scrub) scrub.value = sourceVideo.currentTime;
      updateLabels();
    } else if(e.key === 'm' || e.key === 'M'){
      setTool('mark');
    } else if(e.key === 'b' || e.key === 'B'){
      setTool('blur');
    } else if(e.key === 'z' || e.key === 'Z'){
      regions.pop();
      renderRegionList();
      drawCurrentFrame();
    }
  });

  // ---- export ----
  var exportBtn = document.getElementById('exportBtn');
  var exportProgressWrap = document.getElementById('exportProgressWrap');
  var exportProgressBar = document.getElementById('exportProgressBar');
  var exportResult = document.getElementById('exportResult');

  if(exportBtn){
    exportBtn.addEventListener('click', async function(){
      exportBtn.disabled = true;
      exportResult.innerHTML = '';
      exportProgressWrap.classList.add('show');
      exportProgressBar.style.width = '0%';

      var start = parseFloat(trimStart.value);
      var end = parseFloat(trimEnd.value);
      var duration = end - start;

      var speedSel = document.getElementById('exportSpeedSelect');
      var speedMult = speedSel ? parseFloat(speedSel.value) : 1;

      var stream = editCanvas.captureStream(30);
      
      var removeAudioEl = document.getElementById('exportRemoveAudio');
      var shouldRemoveAudio = removeAudioEl && removeAudioEl.checked;

      if(!shouldRemoveAudio && speedMult === 1){
        try{
          var vidStream = sourceVideo.captureStream ? sourceVideo.captureStream() : (sourceVideo.mozCaptureStream ? sourceVideo.mozCaptureStream() : null);
          if(vidStream && vidStream.getAudioTracks().length > 0){
            vidStream.getAudioTracks().forEach(function(track){
              stream.addTrack(track);
            });
          }
        }catch(err){
          console.warn('Could not copy audio track:', err);
        }
      }

      var mimeType = 'video/webm;codecs=vp9';
      if(!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
      var rec = new MediaRecorder(stream, { mimeType: mimeType });
      var chunks = [];
      rec.ondataavailable = function(e){ if(e.data.size > 0) chunks.push(e.data); };

      var finished = new Promise(function(resolve){
        rec.onstop = function(){ resolve(new Blob(chunks, { type: 'video/webm' })); };
      });

      sourceVideo.currentTime = start;
      await new Promise(function(res){ sourceVideo.onseeked = res; });

      rec.start();
      sourceVideo.play();
      sourceVideo.playbackRate = speedMult;

      function step(){
        ctx.filter = 'none';
        ctx.drawImage(sourceVideo, 0, 0, editCanvas.width, editCanvas.height);
        drawRegionsOnCanvas(ctx);
        if(watermarkImg) drawWatermarkOnCanvas(ctx);
        
        var burnEl = document.getElementById('exportBurnCaptions');
        if(burnEl && burnEl.checked && captions.length > 0){
          drawCaptionsOnCanvas(ctx);
        }
        
        var progress = Math.min(100, ((sourceVideo.currentTime - start) / duration) * 100);
        exportProgressBar.style.width = progress + '%';
        var readoutTime = document.getElementById('readoutTime');
        if(readoutTime) readoutTime.textContent = fmt(sourceVideo.currentTime) + ' / ' + fmt(sourceVideo.duration);
        
        if(sourceVideo.currentTime < end && !sourceVideo.paused){
          requestAnimationFrame(step);
        } else {
          sourceVideo.pause();
          sourceVideo.playbackRate = 1;
          rec.stop();
        }
      }
      requestAnimationFrame(step);

      var blob = await finished;
      var url = URL.createObjectURL(blob);
      var dlName = (shouldRemoveAudio || speedMult !== 1) ? 'pro-video.webm' : 'edited-video.webm';
      exportResult.innerHTML = '<a class="link-btn" href="' + url + '" download="' + dlName + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download final video (' + speedMult + 'x)</a>';
      exportProgressBar.style.width = '100%';
      exportBtn.disabled = false;
    });
  }

  // ================= AUDIO TAB =================
  var audioFileInput = document.getElementById('audioFileInput');
  var audioEmpty = document.getElementById('audioEmpty');
  var audioWork = document.getElementById('audioWork');
  var audioStart = document.getElementById('audioStart');
  var audioEnd = document.getElementById('audioEnd');
  var audioStartLabel = document.getElementById('audioStartLabel');
  var audioEndLabel = document.getElementById('audioEndLabel');
  var audioResult = document.getElementById('audioResult');
  var removeAudioBtn = document.getElementById('removeAudioBtn');
  var audioCtx = null, audioBuffer = null, playingSource = null;

  if(audioFileInput){
    audioFileInput.addEventListener('change', async function(){
      var f = audioFileInput.files[0];
      if(!f) return;
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var arrayBuf = await f.arrayBuffer();
      audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
      audioStart.max = audioEnd.max = audioBuffer.duration;
      audioStart.value = 0;
      audioEnd.value = audioBuffer.duration;
      updateAudioLabels();
      audioEmpty.hidden = true;
      audioWork.hidden = false;
      if(removeAudioBtn) removeAudioBtn.hidden = false;
      audioResult.innerHTML = '';
    });
  }

  if(removeAudioBtn){
    removeAudioBtn.addEventListener('click', function(){
      if(playingSource){ try{ playingSource.stop(); }catch(e){} }
      audioBuffer = null;
      if(audioFileInput) audioFileInput.value = '';
      audioWork.hidden = true;
      audioEmpty.hidden = false;
      removeAudioBtn.hidden = true;
      if(audioResult) audioResult.innerHTML = '';
    });
  }

  function updateAudioLabels(){
    if(audioStartLabel) audioStartLabel.textContent = fmt(parseFloat(audioStart.value));
    if(audioEndLabel) audioEndLabel.textContent = fmt(parseFloat(audioEnd.value));
  }
  if(audioStart){
    audioStart.addEventListener('input', function(){
      if(parseFloat(audioStart.value) > parseFloat(audioEnd.value)) audioStart.value = audioEnd.value;
      updateAudioLabels();
    });
  }
  if(audioEnd){
    audioEnd.addEventListener('input', function(){
      if(parseFloat(audioEnd.value) < parseFloat(audioStart.value)) audioEnd.value = audioStart.value;
      updateAudioLabels();
    });
  }

  var audioPreviewBtn = document.getElementById('audioPreviewBtn');
  if(audioPreviewBtn){
    audioPreviewBtn.addEventListener('click', function(){
      if(!audioBuffer) return;
      if(playingSource){ try{ playingSource.stop(); }catch(e){} }
      var s = parseFloat(audioStart.value), e = parseFloat(audioEnd.value);
      playingSource = audioCtx.createBufferSource();
      playingSource.buffer = audioBuffer;
      playingSource.connect(audioCtx.destination);
      playingSource.start(0, s, e - s);
    });
  }

  var audioExportBtn = document.getElementById('audioExportBtn');
  if(audioExportBtn){
    audioExportBtn.addEventListener('click', function(){
      if(!audioBuffer) return;
      var s = parseFloat(audioStart.value), e = parseFloat(audioEnd.value);
      var sampleRate = audioBuffer.sampleRate;
      var startSample = Math.floor(s * sampleRate);
      var endSample = Math.floor(e * sampleRate);
      var frameCount = endSample - startSample;
      var numChannels = audioBuffer.numberOfChannels;

      var trimmed = audioCtx.createBuffer(numChannels, frameCount, sampleRate);
      for(var ch = 0; ch < numChannels; ch++){
        var srcData = audioBuffer.getChannelData(ch).subarray(startSample, endSample);
        trimmed.copyToChannel(srcData, ch);
      }

      var wavBlob = encodeWAV(trimmed);
      var url = URL.createObjectURL(wavBlob);
      audioResult.innerHTML = '<a class="link-btn" href="' + url + '" download="trimmed-audio.wav"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download trimmed WAV</a>';
    });
  }

  function encodeWAV(buffer){
    var numChannels = buffer.numberOfChannels;
    var sampleRate = buffer.sampleRate;
    var length = buffer.length * numChannels * 2 + 44;
    var arrBuf = new ArrayBuffer(length);
    var view = new DataView(arrBuf);

    function writeString(offset, str){
      for(var i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + buffer.length * numChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, buffer.length * numChannels * 2, true);

    var offset = 44;
    var channels = [];
    for(var ch = 0; ch < numChannels; ch++) channels.push(buffer.getChannelData(ch));

    for(var i = 0; i < buffer.length; i++){
      for(var ch = 0; ch < numChannels; ch++){
        var sample = Math.max(-1, Math.min(1, channels[ch][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }
    return new Blob([view], { type: 'audio/wav' });
  }

  // ================= SCREENSHOT & FORMAT CONVERTER TAB =================
  var captureShotBtn = document.getElementById('captureShotBtn');
  var captureAreaBtn = document.getElementById('captureAreaBtn');
  var shotFileInput = document.getElementById('shotFileInput');
  var shotFileInputMobile = document.getElementById('shotFileInputMobile');
  var shotEmpty = document.getElementById('shotEmpty');
  var shotWork = document.getElementById('shotWork');
  var shotCanvas = document.getElementById('shotCanvas');
  var removeShotBtn = document.getElementById('removeShotBtn');
  var sctx = shotCanvas ? shotCanvas.getContext('2d') : null;

  var shotFormatSelect = document.getElementById('shotFormatSelect');
  var shotQuality = document.getElementById('shotQuality');
  var shotQualityLabel = document.getElementById('shotQualityLabel');
  var shotQualityBox = document.getElementById('shotQualityBox');

  var shotImage = null;
  var shotAnnotations = [];
  var shotColor = '#e35d5d';
  var shotTool = null;
  var shotDrawing = false, shotStart = null, shotLive = null;

  // ---------- Global Paste Listener (Ctrl+V / Cmd+V) ----------
  window.addEventListener('paste', function(e){
    var items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for(var i = 0; i < items.length; i++){
      if(items[i].type.indexOf('image') !== -1){
        var file = items[i].getAsFile();
        if(file){
          handleImageUpload(file);
          var shotSec = document.getElementById('screenshot');
          if(shotSec) shotSec.scrollIntoView({ behavior: 'smooth' });
          break;
        }
      }
    }
  });

  if(shotFormatSelect && shotQualityBox){
    shotFormatSelect.addEventListener('change', function(){
      var fmt = shotFormatSelect.value;
      if(fmt === 'image/jpeg' || fmt === 'image/webp'){
        shotQualityBox.style.display = 'flex';
      } else {
        shotQualityBox.style.display = 'none';
      }
    });
  }

  if(shotQuality && shotQualityLabel){
    shotQualityLabel.textContent = Math.round(parseFloat(shotQuality.value) * 100) + '%';
    shotQuality.addEventListener('input', function(){
      shotQualityLabel.textContent = Math.round(parseFloat(shotQuality.value) * 100) + '%';
    });
  }

  async function captureFullFrame(){
    var stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    var track = stream.getVideoTracks()[0];
    var tempVideo = document.createElement('video');
    tempVideo.srcObject = stream;
    tempVideo.muted = true;
    await tempVideo.play();
    await new Promise(function(res){ setTimeout(res, 250); });
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = tempVideo.videoWidth;
    tmpCanvas.height = tempVideo.videoHeight;
    tmpCanvas.getContext('2d').drawImage(tempVideo, 0, 0);
    track.stop();
    stream.getTracks().forEach(function(t){ t.stop(); });
    return tmpCanvas.toDataURL('image/png');
  }

  if(captureShotBtn){
    captureShotBtn.addEventListener('click', async function(){
      try{
        var dataUrl = await captureFullFrame();
        var img = new Image();
        img.onload = function(){ loadShotImage(img); };
        img.src = dataUrl;
      }catch(err){
        alert('Could not capture the screen: ' + err.message);
      }
    });
  }

  var areaPicker = document.getElementById('shotAreaPicker');
  var areaCanvas = document.getElementById('areaPickCanvas');
  var actx = areaCanvas ? areaCanvas.getContext('2d') : null;
  var areaImage = null, areaDrawing = false, areaStart = null, areaRect = null;

  if(captureAreaBtn){
    captureAreaBtn.addEventListener('click', async function(){
      try{
        var dataUrl = await captureFullFrame();
        var img = new Image();
        img.onload = function(){
          areaImage = img;
          areaCanvas.width = img.width;
          areaCanvas.height = img.height;
          areaRect = null;
          drawAreaPicker();
          areaPicker.hidden = false;
          areaPicker.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        img.src = dataUrl;
      }catch(err){
        alert('Could not capture the screen: ' + err.message);
      }
    });
  }

  function drawAreaPicker(){
    if(!areaImage || !actx) return;
    actx.clearRect(0, 0, areaCanvas.width, areaCanvas.height);
    actx.drawImage(areaImage, 0, 0);
    if(areaRect){
      actx.save();
      actx.strokeStyle = '#2563eb';
      actx.lineWidth = 3;
      actx.setLineDash([8,5]);
      actx.strokeRect(areaRect.x, areaRect.y, areaRect.w, areaRect.h);
      actx.restore();
    }
  }
  function areaCoords(e){
    var rect = areaCanvas.getBoundingClientRect();
    var scaleX = areaCanvas.width / rect.width;
    var scaleY = areaCanvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }
  if(areaCanvas){
    areaCanvas.addEventListener('mousedown', function(e){
      areaDrawing = true;
      areaStart = areaCoords(e);
      areaRect = { x: areaStart.x, y: areaStart.y, w: 0, h: 0 };
    });
    areaCanvas.addEventListener('mousemove', function(e){
      if(!areaDrawing) return;
      var p = areaCoords(e);
      areaRect = { x: Math.min(p.x, areaStart.x), y: Math.min(p.y, areaStart.y), w: Math.abs(p.x - areaStart.x), h: Math.abs(p.y - areaStart.y) };
      drawAreaPicker();
    });
    window.addEventListener('mouseup', function(){
      if(!areaDrawing) return;
      areaDrawing = false;
    });
  }

  var areaConfirmBtn = document.getElementById('areaConfirmBtn');
  var areaCancelBtn = document.getElementById('areaCancelBtn');

  if(areaConfirmBtn){
    areaConfirmBtn.addEventListener('click', function(){
      if(!areaRect || areaRect.w < 6 || areaRect.h < 6){ alert('Drag out an area first.'); return; }
      var cropped = document.createElement('canvas');
      cropped.width = areaRect.w; cropped.height = areaRect.h;
      cropped.getContext('2d').drawImage(areaImage, areaRect.x, areaRect.y, areaRect.w, areaRect.h, 0, 0, areaRect.w, areaRect.h);
      var img = new Image();
      img.onload = function(){ loadShotImage(img); areaPicker.hidden = true; };
      img.src = cropped.toDataURL('image/png');
    });
  }
  if(areaCancelBtn){
    areaCancelBtn.addEventListener('click', function(){
      areaPicker.hidden = true;
    });
  }

  function handleImageUpload(f){
    if(!f) return;
    var img = new Image();
    img.onload = function(){ loadShotImage(img); };
    img.src = URL.createObjectURL(f);
  }

  if(shotFileInput){
    shotFileInput.addEventListener('change', function(){ handleImageUpload(shotFileInput.files[0]); });
  }
  if(shotFileInputMobile){
    shotFileInputMobile.addEventListener('change', function(){ handleImageUpload(shotFileInputMobile.files[0]); });
  }

  function loadShotImage(img){
    shotImage = img;
    shotAnnotations = [];
    shotCanvas.width = img.width;
    shotCanvas.height = img.height;
    shotEmpty.hidden = true;
    shotWork.hidden = false;
    if(removeShotBtn) removeShotBtn.hidden = false;
    redrawShot();
  }

  if(removeShotBtn){
    removeShotBtn.addEventListener('click', function(){
      shotImage = null;
      shotAnnotations = [];
      if(shotFileInput) shotFileInput.value = '';
      if(shotFileInputMobile) shotFileInputMobile.value = '';
      shotWork.hidden = true;
      shotEmpty.hidden = false;
      removeShotBtn.hidden = true;
      var ocrResultText = document.getElementById('ocrResultText');
      var ocrStatus = document.getElementById('ocrStatus');
      if(ocrResultText) ocrResultText.value = '';
      if(ocrStatus) ocrStatus.textContent = '';
      if(areaPicker) areaPicker.hidden = true;
    });
  }

  function redrawShot(){
    if(!shotImage || !sctx) return;
    sctx.clearRect(0, 0, shotCanvas.width, shotCanvas.height);
    sctx.drawImage(shotImage, 0, 0, shotCanvas.width, shotCanvas.height);
    shotAnnotations.forEach(function(a){ drawShotAnnotation(sctx, a); });
    if(shotLive) drawShotAnnotation(sctx, shotLive, true);
  }

  function drawShotAnnotation(targetCtx, a, isPreview){
    targetCtx.save();
    targetCtx.strokeStyle = a.color;
    targetCtx.fillStyle = a.color;
    targetCtx.lineWidth = 4;
    targetCtx.lineCap = 'round';
    if(isPreview){ targetCtx.globalAlpha = 0.7; }

    if(a.type === 'rect'){
      targetCtx.strokeRect(Math.min(a.x1,a.x2), Math.min(a.y1,a.y2), Math.abs(a.x2-a.x1), Math.abs(a.y2-a.y1));
    } else if(a.type === 'circle'){
      var cx = (a.x1 + a.x2) / 2, cy = (a.y1 + a.y2) / 2;
      var rx = Math.abs(a.x2 - a.x1) / 2, ry = Math.abs(a.y2 - a.y1) / 2;
      targetCtx.beginPath();
      targetCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      targetCtx.stroke();
    } else if(a.type === 'arrow'){
      drawArrow(targetCtx, a.x1, a.y1, a.x2, a.y2);
    } else if(a.type === 'text'){
      targetCtx.font = '600 26px -apple-system, sans-serif';
      targetCtx.textBaseline = 'top';
      targetCtx.fillText(a.text, a.x1, a.y1);
    }
    targetCtx.restore();
  }

  function drawArrow(targetCtx, x1, y1, x2, y2){
    var headLen = 16;
    var angle = Math.atan2(y2 - y1, x2 - x1);
    targetCtx.beginPath();
    targetCtx.moveTo(x1, y1);
    targetCtx.lineTo(x2, y2);
    targetCtx.stroke();
    targetCtx.beginPath();
    targetCtx.moveTo(x2, y2);
    targetCtx.lineTo(x2 - headLen * Math.cos(angle - Math.PI/6), y2 - headLen * Math.sin(angle - Math.PI/6));
    targetCtx.lineTo(x2 - headLen * Math.cos(angle + Math.PI/6), y2 - headLen * Math.sin(angle + Math.PI/6));
    targetCtx.closePath();
    targetCtx.fill();
  }

  function setShotTool(tool){
    shotTool = tool;
    ['shotArrowBtn','shotRectBtn','shotCircleBtn','shotTextBtn'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.classList.remove('toggled');
    });
    var map = { arrow: 'shotArrowBtn', rect: 'shotRectBtn', circle: 'shotCircleBtn', text: 'shotTextBtn' };
    if(tool && map[tool] && document.getElementById(map[tool])){
      document.getElementById(map[tool]).classList.add('toggled');
    }
  }

  var shotArrowBtn = document.getElementById('shotArrowBtn');
  var shotRectBtn = document.getElementById('shotRectBtn');
  var shotCircleBtn = document.getElementById('shotCircleBtn');
  var shotTextBtn = document.getElementById('shotTextBtn');
  var shotNoToolBtn = document.getElementById('shotNoToolBtn');

  if(shotArrowBtn) shotArrowBtn.addEventListener('click', function(){ setShotTool('arrow'); });
  if(shotRectBtn) shotRectBtn.addEventListener('click', function(){ setShotTool('rect'); });
  if(shotCircleBtn) shotCircleBtn.addEventListener('click', function(){ setShotTool('circle'); });
  if(shotTextBtn) shotTextBtn.addEventListener('click', function(){ setShotTool('text'); });
  if(shotNoToolBtn) shotNoToolBtn.addEventListener('click', function(){ setShotTool(null); });

  var shotColorRow = document.getElementById('shotColorRow');
  if(shotColorRow){
    shotColorRow.querySelectorAll('.color-swatch').forEach(function(btn){
      btn.addEventListener('click', function(){
        shotColor = btn.dataset.color;
        shotColorRow.querySelectorAll('.color-swatch').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
      });
    });
  }

  var shotUndoBtn = document.getElementById('shotUndoBtn');
  var shotClearBtn = document.getElementById('shotClearBtn');

  if(shotUndoBtn){
    shotUndoBtn.addEventListener('click', function(){
      shotAnnotations.pop();
      redrawShot();
    });
  }
  if(shotClearBtn){
    shotClearBtn.addEventListener('click', function(){
      shotAnnotations = [];
      redrawShot();
    });
  }

  function shotCanvasCoords(e){
    var rect = shotCanvas.getBoundingClientRect();
    var scaleX = shotCanvas.width / rect.width;
    var scaleY = shotCanvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  if(shotCanvas){
    shotCanvas.addEventListener('mousedown', function(e){
      if(!shotTool || !shotImage) return;
      var p = shotCanvasCoords(e);
      if(shotTool === 'text'){
        var text = window.prompt('Type the label to place here:');
        if(text){
          shotAnnotations.push({ type: 'text', x1: p.x, y1: p.y, color: shotColor, text: text });
          redrawShot();
        }
        return;
      }
      shotDrawing = true;
      shotStart = p;
      shotLive = { type: shotTool, x1: p.x, y1: p.y, x2: p.x, y2: p.y, color: shotColor };
    });
    shotCanvas.addEventListener('mousemove', function(e){
      if(!shotDrawing) return;
      var p = shotCanvasCoords(e);
      shotLive.x2 = p.x; shotLive.y2 = p.y;
      redrawShot();
    });
    window.addEventListener('mouseup', function(){
      if(!shotDrawing) return;
      shotDrawing = false;
      var dist = Math.hypot(shotLive.x2 - shotLive.x1, shotLive.y2 - shotLive.y1);
      if(dist > 6) shotAnnotations.push(shotLive);
      shotLive = null;
      redrawShot();
    });
  }

  // ---------- Client-Side OCR (Text Extractor) ----------
  var shotExtractTextBtn = document.getElementById('shotExtractTextBtn');
  var ocrStatus = document.getElementById('ocrStatus');
  var ocrResultText = document.getElementById('ocrResultText');
  var ocrCopyBtn = document.getElementById('ocrCopyBtn');

  if(shotExtractTextBtn){
    shotExtractTextBtn.addEventListener('click', async function(){
      if(!shotImage){
        alert('Please capture or upload a screenshot first.');
        return;
      }
      if(typeof Tesseract === 'undefined'){
        alert('OCR library (Tesseract.js) failed to load. Please check your internet connection for the initial load.');
        return;
      }

      shotExtractTextBtn.disabled = true;
      if(ocrCopyBtn) ocrCopyBtn.disabled = true;
      if(ocrResultText) ocrResultText.value = '';

      var rectAnn = null;
      for(var i = shotAnnotations.length - 1; i >= 0; i--){
        if(shotAnnotations[i].type === 'rect'){
          rectAnn = shotAnnotations[i];
          break;
        }
      }

      var scanCanvas = document.createElement('canvas');
      var sCtx = scanCanvas.getContext('2d');

      if(rectAnn && Math.abs(rectAnn.x2 - rectAnn.x1) > 10 && Math.abs(rectAnn.y2 - rectAnn.y1) > 10){
        var rx = Math.max(0, Math.min(rectAnn.x1, rectAnn.x2));
        var ry = Math.max(0, Math.min(rectAnn.y1, rectAnn.y2));
        var rw = Math.min(shotImage.width - rx, Math.abs(rectAnn.x2 - rectAnn.x1));
        var rh = Math.min(shotImage.height - ry, Math.abs(rectAnn.y2 - rectAnn.y1));

        scanCanvas.width = rw;
        scanCanvas.height = rh;
        sCtx.drawImage(shotImage, rx, ry, rw, rh, 0, 0, rw, rh);
        if(ocrStatus) ocrStatus.innerHTML = '<span class="rec-dot pulsing"></span>Scanning highlighted box region...';
      } else {
        scanCanvas.width = shotImage.width;
        scanCanvas.height = shotImage.height;
        sCtx.drawImage(shotImage, 0, 0);
        if(ocrStatus) ocrStatus.innerHTML = '<span class="rec-dot pulsing"></span>Scanning entire screenshot...';
      }

      try{
        var worker = await Tesseract.createWorker("eng");
        if(ocrStatus) ocrStatus.innerHTML = '<span class="rec-dot pulsing"></span>Extracting text...';
        var ret = await worker.recognize(scanCanvas);
        await worker.terminate();

        var extractedText = ret && ret.data && ret.data.text ? ret.data.text.trim() : '';
        if(!extractedText){
          if(ocrResultText) ocrResultText.value = 'No text could be recognized in this image or selected region.';
        } else {
          if(ocrResultText) ocrResultText.value = extractedText;
          if(ocrCopyBtn) ocrCopyBtn.disabled = false;
        }
        if(ocrStatus) ocrStatus.textContent = '✓ Scan complete!';
      }catch(err){
        if(ocrStatus) ocrStatus.textContent = 'OCR Error: ' + err.message;
        if(ocrResultText) ocrResultText.value = 'Failed to extract text. Please try again.';
      } finally {
        shotExtractTextBtn.disabled = false;
      }
    });
  }

  if(ocrCopyBtn && ocrResultText){
    ocrCopyBtn.addEventListener('click', function(){
      if(!ocrResultText.value) return;
      navigator.clipboard.writeText(ocrResultText.value).then(function(){
        var origText = ocrCopyBtn.innerHTML;
        ocrCopyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied to Clipboard!';
        ocrCopyBtn.classList.add('primary');
        setTimeout(function(){
          ocrCopyBtn.innerHTML = origText;
          ocrCopyBtn.classList.remove('primary');
        }, 2000);
      }).catch(function(){
        ocrResultText.select();
        document.execCommand('copy');
      });
    });
  }

  // ---------- Copy & Format Conversion Helpers ----------
  function getSelectedImageFormat(){
    var sel = document.getElementById('shotFormatSelect');
    var q = document.getElementById('shotQuality');
    var mime = sel ? sel.value : 'image/png';
    var quality = q ? parseFloat(q.value) : 0.92;
    var ext = '.png';
    if(mime === 'image/jpeg') ext = '.jpg';
    else if(mime === 'image/webp') ext = '.webp';
    else if(mime === 'image/bmp') ext = '.bmp';
    return { mime: mime, quality: quality, ext: ext };
  }

  function copyCanvasToClipboard(canvasEl, btnEl, defaultLabel){
    var fmt = getSelectedImageFormat();
    // Browsers natively require image/png in ClipboardItem constructor for stability
    canvasEl.toBlob(function(blob){
      try {
        var item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(function(){
          btnEl.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied to Clipboard!';
          btnEl.classList.add('primary');
          setTimeout(function(){
            btnEl.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> ' + defaultLabel;
            btnEl.classList.remove('primary');
          }, 2000);
        }).catch(function(err){
          alert('Could not copy to clipboard: ' + err.message);
        });
      } catch(e) {
        alert('Clipboard API is not supported in this browser or requires a secure HTTPS connection.');
      }
    }, 'image/png');
  }

  function downloadCanvasFormatted(canvasEl, filenameBase){
    var fmt = getSelectedImageFormat();
    canvasEl.toBlob(function(blob){
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filenameBase + fmt.ext;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, fmt.mime, fmt.quality);
  }

  var shotCopyOriginalBtn = document.getElementById('shotCopyOriginalBtn');
  var shotCopyEditedBtn = document.getElementById('shotCopyEditedBtn');

  if(shotCopyOriginalBtn){
    shotCopyOriginalBtn.addEventListener('click', function(){
      if(!shotImage) return;
      var c = document.createElement('canvas');
      c.width = shotImage.width; c.height = shotImage.height;
      c.getContext('2d').drawImage(shotImage, 0, 0);
      copyCanvasToClipboard(c, shotCopyOriginalBtn, 'Copy Original');
    });
  }

  if(shotCopyEditedBtn){
    shotCopyEditedBtn.addEventListener('click', function(){
      copyCanvasToClipboard(shotCanvas, shotCopyEditedBtn, 'Copy Converted');
    });
  }

  var shotDownloadOriginalBtn = document.getElementById('shotDownloadOriginalBtn');
  var shotDownloadEditedBtn = document.getElementById('shotDownloadEditedBtn');

  if(shotDownloadOriginalBtn){
    shotDownloadOriginalBtn.addEventListener('click', function(){
      if(!shotImage) return;
      var c = document.createElement('canvas');
      c.width = shotImage.width; c.height = shotImage.height;
      c.getContext('2d').drawImage(shotImage, 0, 0);
      downloadCanvasFormatted(c, 'image-original');
    });
  }
  if(shotDownloadEditedBtn){
    shotDownloadEditedBtn.addEventListener('click', function(){
      downloadCanvasFormatted(shotCanvas, 'image-converted');
    });
  }

  // ================= COMBINE MEDIA TAB =================
  var combineVideoInput = document.getElementById('combineVideoInput');
  var combineVideoList = document.getElementById('combineVideoList');
  var combineVideoClearBtn = document.getElementById('combineVideoClearBtn');
  var combineVideos = [];

  if(combineVideoInput){
    combineVideoInput.addEventListener('change', function(){
      Array.from(combineVideoInput.files).forEach(function(f){ combineVideos.push(f); });
      renderCombineVideos();
      combineVideoInput.value = '';
    });
  }

  if(combineVideoClearBtn){
    combineVideoClearBtn.addEventListener('click', function(){
      combineVideos = [];
      renderCombineVideos();
    });
  }

  function renderCombineVideos(){
    if(!combineVideoList) return;
    combineVideoList.innerHTML = '';
    if(combineVideoClearBtn) combineVideoClearBtn.hidden = (combineVideos.length === 0);
    
    combineVideos.forEach(function(f, i){
      var div = document.createElement('div');
      div.className = 'combine-item';
      div.innerHTML = 
        '<span class="combine-index">' + (i + 1) + '</span>' +
        '<span class="label">' + f.name + '</span>' +
        '<button title="Move Up" data-i="' + i + '" class="up-btn">&uarr;</button>' +
        '<button title="Move Down" data-i="' + i + '" class="down-btn">&darr;</button>' +
        '<button title="Remove" data-i="' + i + '" class="remove-btn">&times;</button>';
      combineVideoList.appendChild(div);
    });

    combineVideoList.querySelectorAll('.up-btn').forEach(function(b){
      b.addEventListener('click', function(){
        var i = parseInt(b.dataset.i);
        if(i > 0){ var tmp = combineVideos[i-1]; combineVideos[i-1] = combineVideos[i]; combineVideos[i] = tmp; renderCombineVideos(); }
      });
    });
    combineVideoList.querySelectorAll('.down-btn').forEach(function(b){
      b.addEventListener('click', function(){
        var i = parseInt(b.dataset.i);
        if(i < combineVideos.length - 1){ var tmp = combineVideos[i+1]; combineVideos[i+1] = combineVideos[i]; combineVideos[i] = tmp; renderCombineVideos(); }
      });
    });
    combineVideoList.querySelectorAll('.remove-btn').forEach(function(b){
      b.addEventListener('click', function(){
        combineVideos.splice(parseInt(b.dataset.i), 1);
        renderCombineVideos();
      });
    });
  }

  var combineImageInput = document.getElementById('combineImageInput');
  var combineImageList = document.getElementById('combineImageList');
  var combineImageClearBtn = document.getElementById('combineImageClearBtn');
  var combineImages = [];

  if(combineImageInput){
    combineImageInput.addEventListener('change', function(){
      Array.from(combineImageInput.files).forEach(function(f){ combineImages.push(f); });
      renderCombineImages();
      combineImageInput.value = '';
    });
  }

  if(combineImageClearBtn){
    combineImageClearBtn.addEventListener('click', function(){
      combineImages = [];
      renderCombineImages();
    });
  }

  function renderCombineImages(){
    if(!combineImageList) return;
    combineImageList.innerHTML = '';
    if(combineImageClearBtn) combineImageClearBtn.hidden = (combineImages.length === 0);

    combineImages.forEach(function(f, i){
      var div = document.createElement('div');
      div.className = 'combine-item';
      div.innerHTML = 
        '<span class="combine-index">' + (i + 1) + '</span>' +
        '<span class="label">' + f.name + '</span>' +
        '<button title="Move Up" data-i="' + i + '" class="up-btn">&uarr;</button>' +
        '<button title="Move Down" data-i="' + i + '" class="down-btn">&darr;</button>' +
        '<button title="Remove" data-i="' + i + '" class="remove-btn">&times;</button>';
      combineImageList.appendChild(div);
    });

    combineImageList.querySelectorAll('.up-btn').forEach(function(b){
      b.addEventListener('click', function(){
        var i = parseInt(b.dataset.i);
        if(i > 0){ var tmp = combineImages[i-1]; combineImages[i-1] = combineImages[i]; combineImages[i] = tmp; renderCombineImages(); }
      });
    });
    combineImageList.querySelectorAll('.down-btn').forEach(function(b){
      b.addEventListener('click', function(){
        var i = parseInt(b.dataset.i);
        if(i < combineImages.length - 1){ var tmp = combineImages[i+1]; combineImages[i+1] = combineImages[i]; combineImages[i] = tmp; renderCombineImages(); }
      });
    });
    combineImageList.querySelectorAll('.remove-btn').forEach(function(b){
      b.addEventListener('click', function(){
        combineImages.splice(parseInt(b.dataset.i), 1);
        renderCombineImages();
      });
    });
  }

})();