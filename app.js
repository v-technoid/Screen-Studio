(function(){

  // ---------- small helpers ----------
  // Safe wrapper: site.js defines window.ssTrack. If it is missing, nothing breaks.
  function track(name, data){
    try{ if(window.ssTrack) window.ssTrack(name, data); }catch(e){}
  }
  // Friendly, non blocking messages instead of browser toast() boxes.
  function toast(message, kind){
    var host = document.getElementById('toastHost');
    if(!host){ return; }
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = message;
    host.appendChild(el);
    setTimeout(function(){ el.classList.add('out'); setTimeout(function(){ el.remove(); }, 350); }, kind === 'error' ? 6500 : 4200);
  }
  function fmtBytes(n){
    if(n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB';
    return (n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0) + ' MB';
  }
  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
  // OCR library is only fetched when someone actually uses text extraction.
  var tesseractPromise = null;
  function loadTesseract(){
    if(typeof Tesseract !== 'undefined') return Promise.resolve();
    if(tesseractPromise) return tesseractPromise;
    tesseractPromise = new Promise(function(resolve, reject){
      var el = document.createElement('script');
      el.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      el.onload = function(){ resolve(); };
      el.onerror = function(){ tesseractPromise = null; reject(new Error('Could not load the OCR library. Connect to the internet once and try again.')); };
      document.head.appendChild(el);
    });
    return tesseractPromise;
  }

  // ---------- strict capability detection ----------
  function handleMobileDeviceCapabilities(){
    var canRecordScreen = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    
    var recAudioOptions = document.getElementById('recAudioOptions');
    var recControlsRow = document.getElementById('recControlsRow');
    var recHintText = document.getElementById('recHintText');
    var mobileRecFallback = document.getElementById('mobileRecFallback');
    var securityRecFallback = document.getElementById('securityRecFallback');
    var recSettings = document.getElementById('recSettings');

    var shotButtonsRow = document.getElementById('shotButtonsRow');
    var shotHintText = document.getElementById('shotHintText');
    var mobileShotFallback = document.getElementById('mobileShotFallback');

    if(mobileRecFallback) mobileRecFallback.hidden = true;
    if(securityRecFallback) securityRecFallback.hidden = true;
    if(mobileShotFallback) mobileShotFallback.hidden = true;

    if(canRecordScreen){
      if(recAudioOptions) recAudioOptions.hidden = false;
      if(recControlsRow) recControlsRow.hidden = false;
      if(recSettings) recSettings.hidden = false;
      if(recHintText) recHintText.hidden = false;
      if(shotButtonsRow) shotButtonsRow.hidden = false;
      if(shotHintText) shotHintText.hidden = false;
      return;
    }

    if(recAudioOptions) recAudioOptions.hidden = true;
    if(recControlsRow) recControlsRow.hidden = true;
    if(recSettings) recSettings.hidden = true;
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

  function fmt(t){
    if(!isFinite(t)) return '0:00';
    var m = Math.floor(t/60), s = Math.floor(t%60);
    return m + ':' + (s < 10 ? '0' : '') + s;
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

  // ---- countdown, timer, pause ----
  var pauseRecBtn = document.getElementById('pauseRecBtn');
  var pauseRecLabel = document.getElementById('pauseRecLabel');
  var countdownOverlay = document.getElementById('countdownOverlay');
  var countdownNum = document.getElementById('countdownNum');
  var recTimerId = null, recElapsedMs = 0, recTickStart = 0, recPausedAt = 0;
  var recSaved = true;
  if(recDownloadLink) recDownloadLink.addEventListener('click', function(){ recSaved = true; track('recording_downloaded'); });
  // Warn before closing the tab while a recording is running or has not been downloaded yet.
  window.addEventListener('beforeunload', function(e){
    var live = mediaRecorder && mediaRecorder.state !== 'inactive';
    if(live || !recSaved){ e.preventDefault(); e.returnValue = ''; return ''; }
  });

  function runCountdown(seconds){
    return new Promise(function(resolve){
      if(!countdownOverlay){ resolve(); return; }
      var n = seconds;
      countdownOverlay.hidden = false;
      (function tick(){
        if(n <= 0){ countdownOverlay.hidden = true; resolve(); return; }
        countdownNum.textContent = n;
        countdownNum.classList.remove('pop'); void countdownNum.offsetWidth; countdownNum.classList.add('pop');
        n--;
        setTimeout(tick, 1000);
      })();
    });
  }
  function fmtClock(ms){
    var s = Math.floor(ms / 1000), m = Math.floor(s / 60);
    return (m < 10 ? '0' : '') + m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }
  function paintRecStatus(paused){
    if(!recStatus) return;
    var ms = recElapsedMs + (paused ? 0 : (performance.now() - recTickStart));
    recStatus.innerHTML = '<span class="rec-dot' + (paused ? '' : ' pulsing') + '"></span>' + (paused ? 'Paused ' : 'Recording ') + fmtClock(ms);
  }
  function startRecTimer(){
    recElapsedMs = 0; recTickStart = performance.now();
    clearInterval(recTimerId);
    recTimerId = setInterval(function(){ paintRecStatus(false); }, 500);
  }
  function stopRecTimer(){
    clearInterval(recTimerId); recTimerId = null; recElapsedMs = 0;
    if(pauseRecBtn){ pauseRecBtn.disabled = true; }
    if(pauseRecLabel) pauseRecLabel.textContent = 'Pause';
  }
  if(pauseRecBtn){
    pauseRecBtn.addEventListener('click', function(){
      if(!mediaRecorder) return;
      if(mediaRecorder.state === 'recording'){
        mediaRecorder.pause();
        recElapsedMs += performance.now() - recTickStart;
        recPausedAt = performance.now();
        clearInterval(recTimerId);
        paintRecStatus(true);
        if(pauseRecLabel) pauseRecLabel.textContent = 'Resume';
        track('recording_paused');
      } else if(mediaRecorder.state === 'paused'){
        mediaRecorder.resume();
        // keep live caption times in step with the video by skipping the paused gap
        recStartTime += performance.now() - recPausedAt;
        recTickStart = performance.now();
        recTimerId = setInterval(function(){ paintRecStatus(false); }, 500);
        paintRecStatus(false);
        if(pauseRecLabel) pauseRecLabel.textContent = 'Pause';
      }
    });
  }


  // ---- look: background, rounded corners, webcam bubble (one shared drawing routine) ----
  var BG_PRESETS = {
    aurora:   ['#6366f1', '#8b5cf6', '#06b6d4'],
    sunset:   ['#f97316', '#ec4899', '#8b5cf6'],
    ocean:    ['#0ea5e9', '#2563eb', '#1e1b4b'],
    mint:     ['#34d399', '#22d3ee', '#3b82f6'],
    candy:    ['#f9a8d4', '#c4b5fd', '#93c5fd'],
    midnight: ['#0f172a', '#1e293b', '#334155'],
    graphite: ['#18181b', '#3f3f46']
  };
  var PAD_VALUES = { small: 0.03, medium: 0.06, large: 0.10 };
  var RADIUS_VALUES = { none: 0, soft: 0.006, round: 0.014 };
  var CAM_SIZES = { small: 0.12, medium: 0.16, large: 0.22 };

  function elVal(id, fallback){ var el = document.getElementById(id); return el ? el.value : fallback; }
  function readLook(){
    var cam = document.getElementById('recCamMirror');
    return {
      bg: elVal('recBgSelect', 'none'),
      pad: PAD_VALUES[elVal('recPadSelect', 'medium')] || 0.06,
      radius: RADIUS_VALUES[elVal('recRadiusSelect', 'soft')] || 0,
      camPos: elVal('recCamPos', 'br'),
      camSize: CAM_SIZES[elVal('recCamSize', 'medium')] || 0.16,
      camShape: elVal('recCamShape', 'circle'),
      mirror: cam ? cam.checked : true
    };
  }
  function roundedPath(c, x, y, w, h, r){
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  // The output canvas is the screen size plus the padding, so the screen keeps its full sharpness.
  function lookLayout(vw, vh, look){
    var padPx = look.bg === 'none' ? 0 : Math.round(vw * look.pad);
    var W = vw + 2 * padPx, H = vh + 2 * padPx;
    var cap = 3840;
    if(W > cap){ var k = cap / W; W = cap; H = Math.round(H * k); padPx = Math.round(padPx * k); }
    return { W: W - (W % 2), H: H - (H % 2), pad: padPx };
  }
  // screen: { w, h, draw(x, y, w, h) }   cam: null or { draw(x, y, size, mirror) }
  function drawLook(c, lay, look, screen, cam){
    var W = lay.W, H = lay.H;
    if(look.bg !== 'none' && BG_PRESETS[look.bg]){
      var cols = BG_PRESETS[look.bg];
      var g = c.createLinearGradient(0, 0, W, H);
      cols.forEach(function(col, i){ g.addColorStop(i / (cols.length - 1), col); });
      c.fillStyle = g;
    } else {
      c.fillStyle = '#000';
    }
    c.fillRect(0, 0, W, H);

    var ix = lay.pad, iy = lay.pad, iw = W - 2 * lay.pad, ih = H - 2 * lay.pad;
    var sc = Math.min(iw / screen.w, ih / screen.h);
    var dw = screen.w * sc, dh = screen.h * sc;
    var dx = ix + (iw - dw) / 2, dy = iy + (ih - dh) / 2;
    var r = look.bg === 'none' ? 0 : W * look.radius;

    if(look.bg !== 'none'){
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.45)';
      c.shadowBlur = W * 0.03;
      c.shadowOffsetY = W * 0.01;
      c.fillStyle = '#000';
      roundedPath(c, dx, dy, dw, dh, r);
      c.fill();
      c.restore();
    }
    c.save();
    roundedPath(c, dx, dy, dw, dh, r);
    c.clip();
    screen.draw(dx, dy, dw, dh);
    c.restore();

    if(cam){
      var s = W * look.camSize, m = W * 0.025;
      var x = look.camPos.charAt(1) === 'l' ? m : W - s - m;
      var y = look.camPos.charAt(0) === 't' ? m : H - s - m;
      var cr = look.camShape === 'circle' ? s / 2 : s * 0.22;
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.4)';
      c.shadowBlur = W * 0.012;
      c.shadowOffsetY = W * 0.004;
      c.fillStyle = '#111';
      roundedPath(c, x, y, s, s, cr);
      c.fill();
      c.restore();
      c.save();
      roundedPath(c, x, y, s, s, cr);
      c.clip();
      cam.draw(x, y, s, look.mirror);
      c.restore();
      c.save();
      roundedPath(c, x, y, s, s, cr);
      c.strokeStyle = 'rgba(255,255,255,0.9)';
      c.lineWidth = Math.max(3, W * 0.004);
      c.stroke();
      c.restore();
    }
  }

  // Ticks come from a worker, because normal timers and animation frames slow down when this tab is in the background.
  function makeTicker(fps, fn){
    try{
      var src = 'var t=setInterval(function(){postMessage(0)},' + Math.round(1000 / fps) + ');onmessage=function(e){if(e.data==="stop"){clearInterval(t);close();}}';
      var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      var w = new Worker(url);
      w.onmessage = fn;
      return { stop: function(){ try{ w.postMessage('stop'); w.terminate(); }catch(e){} URL.revokeObjectURL(url); } };
    }catch(err){
      var id = setInterval(fn, Math.round(1000 / fps));
      return { stop: function(){ clearInterval(id); } };
    }
  }

  // ---- live preview of the look ----
  var lookPreview = document.getElementById('lookPreview');
  function paintLookPreview(){
    if(!lookPreview) return;
    var c = lookPreview.getContext('2d');
    var look = readLook();
    var camOn = recWebcamPipEl && recWebcamPipEl.checked;
    var lay = lookLayout(1600, 900, look);
    var k = lookPreview.width / lay.W;
    lookPreview.height = Math.round(lay.H * k);
    c.setTransform(k, 0, 0, k, 0, 0);
    var screen = { w: 1600, h: 900, draw: function(x, y, w, h){
      c.fillStyle = '#f8fafc'; c.fillRect(x, y, w, h);
      c.fillStyle = '#e2e8f0'; c.fillRect(x, y, w, h * 0.07);
      var dots = ['#f87171', '#fbbf24', '#34d399'];
      dots.forEach(function(col, i){ c.fillStyle = col; c.beginPath(); c.arc(x + w * (0.025 + i * 0.022), y + h * 0.035, h * 0.015, 0, 6.3); c.fill(); });
      c.fillStyle = '#cbd5e1';
      for(var i = 0; i < 6; i++){ c.fillRect(x + w * 0.06, y + h * (0.16 + i * 0.1), w * (0.5 - (i % 3) * 0.08), h * 0.035); }
      c.fillStyle = '#93c5fd'; c.fillRect(x + w * 0.66, y + h * 0.16, w * 0.28, h * 0.4);
    } };
    var cam = camOn ? { draw: function(x, y, s){
      c.fillStyle = '#94a3b8'; c.fillRect(x, y, s, s);
      c.fillStyle = '#e2e8f0'; c.beginPath(); c.arc(x + s / 2, y + s * 0.4, s * 0.2, 0, 6.3); c.fill();
      c.beginPath(); c.ellipse(x + s / 2, y + s * 1.0, s * 0.38, s * 0.3, 0, 0, 6.3); c.fill();
    } } : null;
    drawLook(c, lay, look, screen, cam);
  }
  var camOptsBox = document.getElementById('recCamOptions');
  function syncLookUi(){
    if(camOptsBox) camOptsBox.hidden = !(recWebcamPipEl && recWebcamPipEl.checked);
    paintLookPreview();
  }
  ['recBgSelect', 'recPadSelect', 'recRadiusSelect', 'recCamPos', 'recCamSize', 'recCamShape', 'recCamMirror', 'recWebcamPip'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.addEventListener('change', syncLookUi);
  });
  syncLookUi();

  // ---- save straight to disk (Chrome and Edge) ----
  var recDiskEl = document.getElementById('recSaveToDisk');
  var canSaveToDisk = typeof window.showSaveFilePicker === 'function';
  var recDiskBox = document.getElementById('recDiskBox');
  if(recDiskBox && !canSaveToDisk) recDiskBox.hidden = true;

  if(startRecBtn){
    startRecBtn.addEventListener('click', async function(){
      try{
        var wantsSystemAudio = recSystemAudioEl && recSystemAudioEl.checked;
        var wantsMicAudio = recMicAudioEl && recMicAudioEl.checked;
        var wantsWebcamPip = recWebcamPipEl && recWebcamPipEl.checked;
        var wantsAutoCaptions = recAutoCaptionsEl && recAutoCaptionsEl.checked;

        // The save dialog has to open straight from the click, so it comes before the screen picker.
        var saveHandle = null, diskWriter = null, writeChain = Promise.resolve(), writeFailed = false;
        if(canSaveToDisk && recDiskEl && recDiskEl.checked){
          var stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
          try{
            saveHandle = await window.showSaveFilePicker({
              suggestedName: 'recording-' + stamp + '.webm',
              types: [{ description: 'WebM video', accept: { 'video/webm': ['.webm'] } }]
            });
            diskWriter = await saveHandle.createWritable();
          }catch(diskErr){
            saveHandle = null; diskWriter = null;
            if(diskErr && diskErr.name === 'AbortError'){ recStatus.textContent = 'Save cancelled. Nothing was recorded.'; track('recording_cancelled', { reason: 'save_dialog' }); return; }
            toast('Could not open a file on your disk, so this recording will be kept in memory instead.');
          }
        }

        // Quality, frame rate and cursor are requests: the browser picks the closest it can do.
        var qualitySel = document.getElementById('recQualitySelect');
        var fpsSel = document.getElementById('recFpsSelect');
        var cursorEl = document.getElementById('recShowCursor');
        var wantFps = fpsSel ? parseInt(fpsSel.value, 10) || 30 : 30;
        var qualityVal = qualitySel ? qualitySel.value : 'best';
        var videoConstraints = { frameRate: { ideal: wantFps, max: wantFps } };
        if(qualityVal === '1080'){ videoConstraints.width = { ideal: 1920 }; videoConstraints.height = { ideal: 1080 }; }
        if(qualityVal === '720'){ videoConstraints.width = { ideal: 1280 }; videoConstraints.height = { ideal: 720 }; }
        if(cursorEl && !cursorEl.checked) videoConstraints.cursor = 'never';

        var displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: videoConstraints,
          audio: wantsSystemAudio ? { echoCancellation: true, noiseSuppression: true } : false
        });

        // Countdown happens after the screen is chosen, so the first seconds you record are what you want.
        var cdSel = document.getElementById('recCountdownSelect');
        var cdSeconds = cdSel ? parseInt(cdSel.value, 10) || 0 : 0;
        if(cdSeconds > 0) await runCountdown(cdSeconds);

        var micStream = null;
        var webcamStream = null;

        if(wantsMicAudio || wantsWebcamPip || wantsAutoCaptions){
          try{
            var userStream = await navigator.mediaDevices.getUserMedia({
              audio: (wantsMicAudio || wantsAutoCaptions) ? { echoCancellation: true, noiseSuppression: true } : false,
              video: wantsWebcamPip ? { width: { ideal: 640 }, height: { ideal: 480 } } : false
            });
            if((wantsMicAudio || wantsAutoCaptions) && userStream.getAudioTracks().length > 0) micStream = new MediaStream([userStream.getAudioTracks()[0]]);
            if(wantsWebcamPip && userStream.getVideoTracks().length > 0) webcamStream = new MediaStream([userStream.getVideoTracks()[0]]);
          }catch(userErr){
            toast('Could not access hardware: ' + userErr.message + '\nContinuing without mic/webcam overlay.');
          }
        }

        var videoTrackToRecord = displayStream.getVideoTracks()[0];
        var ticker = null, compCanvas = null;
        var look = readLook();
        var needsComposite = !!webcamStream || look.bg !== 'none';

        if(needsComposite){
          var screenVid = document.createElement('video');
          screenVid.srcObject = displayStream;
          screenVid.muted = true;
          await screenVid.play();
          var camVid = null;
          if(webcamStream){
            camVid = document.createElement('video');
            camVid.srcObject = webcamStream;
            camVid.muted = true;
            await camVid.play();
          }
          var baseW = screenVid.videoWidth || 1920, baseH = screenVid.videoHeight || 1080;
          var lay = lookLayout(baseW, baseH, look);
          compCanvas = document.createElement('canvas');
          compCanvas.width = lay.W; compCanvas.height = lay.H;
          var cc = compCanvas.getContext('2d');
          var screenSrc = {
            get w(){ return screenVid.videoWidth || baseW; },
            get h(){ return screenVid.videoHeight || baseH; },
            draw: function(x, y, w, h){ cc.drawImage(screenVid, x, y, w, h); }
          };
          var camSrc = camVid ? { draw: function(x, y, size, mirror){
            var cw = camVid.videoWidth, ch = camVid.videoHeight;
            if(!cw || !ch) return;
            var side = Math.min(cw, ch), sx = (cw - side) / 2, sy = (ch - side) / 2;
            if(mirror){
              cc.save(); cc.translate(x + size, y); cc.scale(-1, 1);
              cc.drawImage(camVid, sx, sy, side, side, 0, 0, size, size);
              cc.restore();
            } else {
              cc.drawImage(camVid, sx, sy, side, side, x, y, size, size);
            }
          } } : null;
          var paintComposite = function(){ drawLook(cc, lay, look, screenSrc, camSrc); };
          paintComposite();
          videoTrackToRecord = compCanvas.captureStream(wantFps).getVideoTracks()[0];
          ticker = makeTicker(wantFps, paintComposite);
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
            toast('Live speech recognition is not supported in this browser. Trying recording without auto-captions.');
          }
        }

        var mimeType = 'video/webm;codecs=vp9';
        if(!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: mimeType, videoBitsPerSecond: qualityVal === '720' ? 3500000 : 8000000 });
        
        mediaRecorder.ondataavailable = function(e){
          if(e.data.size <= 0) return;
          if(diskWriter){
            // Pieces go to the file as they arrive, one after the other, so a long recording never fills memory.
            writeChain = writeChain.then(function(){ if(!writeFailed) return diskWriter.write(e.data); }).catch(function(){ writeFailed = true; });
          } else {
            recordedChunks.push(e.data);
          }
        };
        
        mediaRecorder.onstop = async function(){
          var recMs = recElapsedMs + (recTimerId ? performance.now() - recTickStart : 0);
          stopRecTimer();
          if(ticker) ticker.stop();
          if(liveSpeechRecognition){ try{ liveSpeechRecognition.stop(); }catch(e){} liveSpeechRecognition = null; }
          if(liveTranscribeBox) liveTranscribeBox.hidden = true;
          
          var blob = null, savedName = '';
          if(diskWriter){
            await writeChain;
            try{ await diskWriter.close(); }catch(closeErr){ writeFailed = true; }
            if(!writeFailed){
              try{ blob = await saveHandle.getFile(); savedName = saveHandle.name; }catch(readErr){ writeFailed = true; }
            }
            if(writeFailed) toast('Writing to your disk failed part of the way. Check free space and try again.');
          }
          if(!blob) blob = new Blob(recordedChunks, { type: 'video/webm' });
          recordedBlobUrl = URL.createObjectURL(blob);
          recDownloadLink.href = recordedBlobUrl;
          recDownloadLink.download = savedName || 'recording.webm';
          recSaved = !!savedName;
          var infoEl = document.getElementById('recResultInfo');
          if(infoEl){
            infoEl.textContent = savedName
              ? fmtClock(recMs) + ' long, ' + fmtBytes(blob.size) + '. Already saved on your disk as ' + savedName + '.'
              : fmtClock(recMs) + ' long, ' + fmtBytes(blob.size) + '. It only exists in this tab until you download it.';
          }
          track('recording_finished');
          setTimeout(function(){ if(recResultPanel) recResultPanel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 150);
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

        if(diskWriter) mediaRecorder.start(1000); else mediaRecorder.start();
        startRecBtn.disabled = true;
        stopRecBtn.disabled = false;
        if(pauseRecBtn) pauseRecBtn.disabled = false;
        startRecTimer();
        paintRecStatus(false);
        track('recording_started', {
          webcam: !!wantsWebcamPip, system_audio: !!wantsSystemAudio,
          mic: !!wantsMicAudio, captions: !!wantsAutoCaptions,
          background: look.bg, to_disk: !!diskWriter
        });
      }catch(err){
        if(typeof diskWriter !== 'undefined' && diskWriter){ try{ diskWriter.abort(); }catch(e){} }
        if(typeof ticker !== 'undefined' && ticker) ticker.stop();
        if(countdownOverlay) countdownOverlay.hidden = true;
        recStatus.textContent = 'Could not start recording: ' + err.message;
        // Closing the browser's share picker is normal, so it is counted separately from real failures.
        track(err && (err.name === 'NotAllowedError' || err.name === 'AbortError') ? 'recording_cancelled' : 'recording_failed',
          { reason: (err && err.name) || 'unknown' });
      }
    });
  }

  if(stopRecBtn){
    stopRecBtn.addEventListener('click', function(){
      if(mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      startRecBtn.disabled = false;
      stopRecBtn.disabled = true;
      if(pauseRecBtn) pauseRecBtn.disabled = true;
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
    cropRect = null;
    if(resetCropBtn) resetCropBtn.hidden = true;
    setTrackStatus('');
    captions = initialCaptions ? initialCaptions.slice() : [];
    renderRegionList();
    renderCaptionList();
    sourceVideo.src = url;
    var initMeta = function(){
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
    sourceVideo.onloadedmetadata = function(){
      if(isFinite(sourceVideo.duration)){ initMeta(); return; }
      // Browser recordings often have no length stored. Jumping to the end makes the browser work it out.
      var fixed = false;
      sourceVideo.addEventListener('durationchange', function fix(){
        if(fixed || !isFinite(sourceVideo.duration)) return;
        fixed = true;
        sourceVideo.removeEventListener('durationchange', fix);
        sourceVideo.currentTime = 0;
        initMeta();
      });
      sourceVideo.currentTime = 1e7;
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

  // A box can carry a "track": keyframes {t, x, y} (top left corner). Between keyframes we interpolate.
  function regionRect(r, t){
    var k = r.track;
    if(!k || !k.length) return { x: r.x, y: r.y, w: r.w, h: r.h };
    if(t <= k[0].t) return { x: k[0].x, y: k[0].y, w: r.w, h: r.h };
    var last = k[k.length - 1];
    if(t >= last.t) return { x: last.x, y: last.y, w: r.w, h: r.h };
    var lo = 0, hi = k.length - 1;
    while(hi - lo > 1){
      var mid = (lo + hi) >> 1;
      if(k[mid].t <= t) lo = mid; else hi = mid;
    }
    var a = k[lo], b = k[hi];
    var f = (t - a.t) / ((b.t - a.t) || 1);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, w: r.w, h: r.h };
  }

  var trackingBusy = false;
  var cropRect = null; // {x, y, w, h} in video pixels, or null for the full picture

  function drawCurrentFrame(){
    if(!ctx || trackingBusy) return;
    ctx.filter = 'none';
    ctx.drawImage(sourceVideo, 0, 0, editCanvas.width, editCanvas.height);
    drawRegionsOnCanvas(ctx);
    if(watermarkImg) drawWatermarkOnCanvas(ctx);
    
    var burnEl = document.getElementById('exportBurnCaptions');
    if(burnEl && burnEl.checked && captions.length > 0){
      drawCaptionsOnCanvas(ctx);
    }
    
    if(cropRect){
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.rect(0, 0, editCanvas.width, editCanvas.height);
      ctx.rect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.fill('evenodd');
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3;
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.restore();
    }
    if(liveRect) drawLiveRectPreview();
    var readoutTime = document.getElementById('readoutTime');
    if(readoutTime) readoutTime.textContent = fmt(sourceVideo.currentTime) + ' / ' + fmt(sourceVideo.duration);
  }

  function drawRegionsOnCanvas(targetCtx){
    var curTime = sourceVideo.currentTime;

    regions.forEach(function(r){
      if(r.type === 'blur' && curTime >= r.startTime && curTime <= r.endTime){
        var rr = regionRect(r, curTime);
        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.rect(rr.x, rr.y, rr.w, rr.h);
        targetCtx.clip();
        targetCtx.filter = 'blur(18px)';
        targetCtx.drawImage(sourceVideo, 0, 0, editCanvas.width, editCanvas.height);
        targetCtx.restore();
      }
    });

    regions.forEach(function(r){
      if(r.type === 'mark' && curTime >= r.startTime && curTime <= r.endTime){
        var mr = regionRect(r, curTime);
        targetCtx.save();
        targetCtx.filter = 'none';
        targetCtx.strokeStyle = '#2563eb';
        targetCtx.lineWidth = 4;
        targetCtx.strokeRect(mr.x, mr.y, mr.w, mr.h);
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
    ctx.strokeStyle = activeTool === 'blur' ? '#d97706' : (activeTool === 'crop' ? '#22c55e' : '#2563eb');
    ctx.setLineDash([6,4]);
    ctx.lineWidth = 3;
    ctx.strokeRect(liveRect.x, liveRect.y, liveRect.w, liveRect.h);
    ctx.restore();
  }

  var markToolBtn = document.getElementById('markToolBtn');
  var blurToolBtn = document.getElementById('blurToolBtn');
  var noToolBtn = document.getElementById('noToolBtn');
  var cropToolBtn = document.getElementById('cropToolBtn');
  var resetCropBtn = document.getElementById('resetCropBtn');
  var undoRegionBtn = document.getElementById('undoRegionBtn');

  if(markToolBtn) markToolBtn.addEventListener('click', function(){ setTool('mark'); });
  if(blurToolBtn) blurToolBtn.addEventListener('click', function(){ setTool('blur'); });
  if(noToolBtn) noToolBtn.addEventListener('click', function(){ setTool(null); });
  if(cropToolBtn) cropToolBtn.addEventListener('click', function(){ setTool('crop'); });
  function setCrop(rect){
    cropRect = rect;
    if(resetCropBtn) resetCropBtn.hidden = !rect;
    if(typeof updateExportEstimate === 'function') updateExportEstimate();
    drawCurrentFrame();
  }
  if(resetCropBtn) resetCropBtn.addEventListener('click', function(){ setCrop(null); });
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
    if(cropToolBtn) cropToolBtn.classList.toggle('toggled', tool === 'crop');
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
      if(!activeTool){ beginMoveRegion(e); return; }
      drawing = true;
      drawStart = canvasCoords(e);
      liveRect = { x: drawStart.x, y: drawStart.y, w: 0, h: 0 };
    });
    editCanvas.addEventListener('mousemove', function(e){
      if(movingRegion){ moveRegionTo(e); return; }
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
      if(movingRegion){ movingRegion = null; renderRegionList(); return; }
      if(!drawing) return;
      drawing = false;
      if(activeTool === 'crop'){
        if(liveRect && liveRect.w > 24 && liveRect.h > 24){
          var cx0 = Math.max(0, Math.round(liveRect.x)), cy0 = Math.max(0, Math.round(liveRect.y));
          var cw0 = Math.min(editCanvas.width - cx0, Math.round(liveRect.w)), ch0 = Math.min(editCanvas.height - cy0, Math.round(liveRect.h));
          setCrop({ x: cx0, y: cy0, w: cw0, h: ch0 });
          toast('Crop set. It applies to the exported video and GIF.');
        }
        liveRect = null;
        setTool(null);
        drawCurrentFrame();
        return;
      }
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

  // ---- move a box by dragging it (only when no drawing tool is selected) ----
  var movingRegion = null;
  function beginMoveRegion(e){
    if(trackingBusy || !sourceVideo.duration) return;
    var p = canvasCoords(e), t = sourceVideo.currentTime;
    for(var i = regions.length - 1; i >= 0; i--){
      var r = regions[i];
      if(t < r.startTime || t > r.endTime) continue;
      var rr = regionRect(r, t);
      if(p.x >= rr.x && p.x <= rr.x + rr.w && p.y >= rr.y && p.y <= rr.y + rr.h){
        movingRegion = { r: r, dx: p.x - rr.x, dy: p.y - rr.y };
        e.preventDefault();
        return;
      }
    }
  }
  function moveRegionTo(e){
    var p = canvasCoords(e), m = movingRegion, r = m.r;
    var nx = Math.max(0, Math.min(editCanvas.width - r.w, p.x - m.dx));
    var ny = Math.max(0, Math.min(editCanvas.height - r.h, p.y - m.dy));
    var t = sourceVideo.currentTime;
    if(r.track && r.track.length){
      // Fix this moment of the track: replace a nearby keyframe or add one.
      var k = r.track, found = false;
      for(var i = 0; i < k.length; i++){
        if(Math.abs(k[i].t - t) < 0.04){ k[i].x = nx; k[i].y = ny; found = true; break; }
      }
      if(!found){ k.push({ t: t, x: nx, y: ny }); k.sort(function(a, b){ return a.t - b.t; }); }
    } else {
      r.x = nx; r.y = ny;
    }
    drawCurrentFrame();
  }

  // ---- motion tracking: follow what is inside a box through the video ----
  // Simple template matching on small grayscale frames (sum of absolute differences).
  var trackCancelFlag = false;
  var trackStatusEl = document.getElementById('trackStatus');

  function setTrackStatus(html){
    if(!trackStatusEl) return;
    trackStatusEl.hidden = !html;
    trackStatusEl.innerHTML = html || '';
    var c = trackStatusEl.querySelector('.track-cancel');
    if(c) c.addEventListener('click', function(){ trackCancelFlag = true; });
  }

  function seekVideo(t){
    return new Promise(function(resolve){
      if(Math.abs(sourceVideo.currentTime - t) < 0.0005){ resolve(); return; }
      var done = false;
      function finish(){
        if(done) return;
        done = true;
        sourceVideo.removeEventListener('seeked', finish);
        resolve();
      }
      sourceVideo.addEventListener('seeked', finish);
      setTimeout(finish, 2500);
      sourceVideo.currentTime = t;
    });
  }

  async function followRegion(idx){
    var r = regions[idx];
    if(!r || trackingBusy || !sourceVideo.duration) return;
    var origTime = sourceVideo.currentTime;
    var tEnd = Math.min(r.endTime, parseFloat(trimEnd.value) || sourceVideo.duration);
    var t0 = Math.max(origTime, r.startTime);
    if(tEnd - t0 < 0.2){
      setTrackStatus('Move the video to the moment where the object is, before this box\'s end time, then press Follow motion.');
      return;
    }

    trackingBusy = true; trackCancelFlag = false;
    sourceVideo.pause();
    var vw = sourceVideo.videoWidth, vh = sourceVideo.videoHeight;
    var scale = Math.min(1, 480 / vw);
    var gw = Math.max(16, Math.round(vw * scale)), gh = Math.max(16, Math.round(vh * scale));
    var gc = document.createElement('canvas'); gc.width = gw; gc.height = gh;
    var gx = gc.getContext('2d', { willReadFrequently: true });
    function grab(){
      gx.drawImage(sourceVideo, 0, 0, gw, gh);
      var d = gx.getImageData(0, 0, gw, gh).data, g = new Uint8Array(gw * gh);
      for(var i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
      return g;
    }

    var framesDone = 0, lostAt = null;
    try{
      await seekVideo(t0);
      var cur = regionRect(r, t0);
      var bw = Math.max(8, Math.min(gw - 1, Math.round(r.w * scale)));
      var bh = Math.max(8, Math.min(gh - 1, Math.round(r.h * scale)));
      var cx = Math.max(0, Math.min(gw - bw, Math.round(cur.x * scale)));
      var cy = Math.max(0, Math.min(gh - bh, Math.round(cur.y * scale)));

      var frame = grab();
      var tmpl = new Float32Array(bw * bh);
      for(var yy = 0; yy < bh; yy++) for(var xx = 0; xx < bw; xx++) tmpl[yy * bw + xx] = frame[(cy + yy) * gw + cx + xx];

      var stride = Math.max(1, Math.floor(Math.sqrt((bw * bh) / 1500)));
      var S = Math.max(12, Math.round(Math.max(bw, bh) * 0.4));
      var step = 1 / 15;

      // keep earlier keyframes, then restart the track from this moment
      var keep = (r.track || []).filter(function(k){ return k.t < t0 - 0.001; });
      keep.push({ t: t0, x: cx / scale, y: cy / scale });
      var newTrack = keep;
      var totalSteps = Math.max(1, Math.ceil((tEnd - t0) / step));

      for(var n = 1; n <= totalSteps; n++){
        if(trackCancelFlag) break;
        var t = Math.min(tEnd, t0 + n * step);
        await seekVideo(t);
        frame = grab();

        var best = Infinity, bx = cx, by = cy;
        var x0 = Math.max(0, cx - S), x1 = Math.min(gw - bw, cx + S);
        var y0 = Math.max(0, cy - S), y1 = Math.min(gh - bh, cy + S);
        for(var oy = y0; oy <= y1; oy++){
          for(var ox = x0; ox <= x1; ox++){
            var sad = 0, over = false;
            for(var ty = 0; ty < bh; ty += stride){
              var row = (oy + ty) * gw + ox, trow = ty * bw;
              for(var tx = 0; tx < bw; tx += stride){
                var df = frame[row + tx] - tmpl[trow + tx];
                sad += df < 0 ? -df : df;
              }
              if(sad >= best){ over = true; break; }
            }
            if(!over && sad < best){ best = sad; bx = ox; by = oy; }
          }
        }
        var samples = Math.ceil(bh / stride) * Math.ceil(bw / stride);
        var meanErr = best / samples;
        if(meanErr > 48){ lostAt = t; break; }

        // let the template slowly follow changes in how the object looks
        for(var uy = 0; uy < bh; uy++) for(var ux = 0; ux < bw; ux++){
          var ti = uy * bw + ux;
          tmpl[ti] = tmpl[ti] * 0.88 + frame[(by + uy) * gw + bx + ux] * 0.12;
        }
        cx = bx; cy = by; framesDone++;
        newTrack.push({ t: Math.round(t * 1000) / 1000, x: Math.round(cx / scale * 10) / 10, y: Math.round(cy / scale * 10) / 10 });

        if(n % 3 === 0){
          setTrackStatus('Following the object... ' + Math.round(n / totalSteps * 100) + '% <button type="button" class="track-cancel">Cancel</button>');
          await new Promise(function(res){ setTimeout(res, 0); });
        }
      }
      // never leave the box outside the picture
      newTrack.forEach(function(k){
        k.x = Math.max(0, Math.min(vw - r.w, k.x));
        k.y = Math.max(0, Math.min(vh - r.h, k.y));
      });
      r.track = newTrack;
      var msg = lostAt !== null
        ? 'Lost the object at ' + fmt(lostAt) + '. The box stays where it was last seen. Move the video to that point, drag the box back onto the object and press Follow motion again.'
        : (trackCancelFlag ? 'Stopped. The box follows the object up to where you cancelled.' : 'Done. The box now follows the object. Scrub through to check it.');
      setTrackStatus(msg);
      track('blur_follow_used', { frames: framesDone, lost: lostAt !== null, kind: r.type });
    }catch(err){
      setTrackStatus('Could not follow this object: ' + escapeHtml(err.message));
    }finally{
      trackingBusy = false;
      await seekVideo(origTime);
      renderRegionList();
      drawCurrentFrame();
    }
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
          '<button class="track-btn" data-i="' + i + '" title="Move this box along with what is inside it, from the current video time">Follow motion</button>' +
          (r.track && r.track.length > 1 ? '<button class="track-clear-btn" data-i="' + i + '" title="Remove the motion path and keep the box still">Clear track</button>' : '') +
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

    regionList.querySelectorAll('.track-btn').forEach(function(b){
      b.addEventListener('click', function(){ followRegion(parseInt(b.dataset.i)); });
    });
    regionList.querySelectorAll('.track-clear-btn').forEach(function(b){
      b.addEventListener('click', function(){
        var rg = regions[parseInt(b.dataset.i)];
        if(rg && rg.track && rg.track.length){
          var here = regionRect(rg, sourceVideo.currentTime);
          rg.x = here.x; rg.y = here.y;
          delete rg.track;
        }
        setTrackStatus('');
        renderRegionList();
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
          toast('Subtitles imported successfully!');
        }catch(err){
          toast('Could not parse subtitle file: ' + err.message);
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
      if(captions.length === 0){ toast('No subtitles to export!'); return; }
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
      if(!sourceVideo.src){ toast('No video loaded yet!'); return; }
      var projectData = {
        version: '1.0',
        trimStart: parseFloat(trimStart.value),
        trimEnd: parseFloat(trimEnd.value),
        regions: regions,
        captions: captions,
        crop: cropRect
      };
      var blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'recnook-project.json';
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
          setCrop(data.crop && data.crop.w > 0 ? data.crop : null);
          if(data.trimStart !== undefined) trimStart.value = data.trimStart;
          if(data.trimEnd !== undefined) trimEnd.value = data.trimEnd;
          updateLabels();
          renderRegionList();
          renderCaptionList();
          drawCurrentFrame();
          toast('Project settings loaded successfully!');
        }catch(err){
          toast('Invalid project file format.');
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
    } else if(e.key === 'c' || e.key === 'C'){
      setTool('crop');
    } else if(e.key === 'b' || e.key === 'B'){
      setTool('blur');
    } else if(e.key === 'z' || e.key === 'Z'){
      regions.pop();
      renderRegionList();
      drawCurrentFrame();
    }
  });

  // ---- export presets, format and size estimate ----
  var exportPresetSelect = document.getElementById('exportPresetSelect');
  var exportFormatSelect = document.getElementById('exportFormatSelect');
  var exportEstimateEl = document.getElementById('exportEstimate');
  var exportSpeedSelectEl = document.getElementById('exportSpeedSelect');
  var MP4_TYPES = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4'];
  var WEBM_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9', 'video/webm'];

  function firstSupported(list){
    if(typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return null;
    for(var i = 0; i < list.length; i++){ if(MediaRecorder.isTypeSupported(list[i])) return list[i]; }
    return null;
  }
  if(exportFormatSelect && firstSupported(MP4_TYPES)){
    var mp4Opt = document.createElement('option');
    mp4Opt.value = 'mp4';
    mp4Opt.textContent = 'MP4 (works in more apps)';
    exportFormatSelect.appendChild(mp4Opt);
  }

  // Decide the output size and bitrate for the chosen preset.
  function planExport(){
    var vw = sourceVideo.videoWidth || 1280, vh = sourceVideo.videoHeight || 720;
    if(cropRect){ vw = cropRect.w; vh = cropRect.h; }
    var start = parseFloat(trimStart && trimStart.value) || 0;
    var end = parseFloat(trimEnd && trimEnd.value) || sourceVideo.duration || 0;
    var speed = exportSpeedSelectEl ? parseFloat(exportSpeedSelectEl.value) || 1 : 1;
    var outSeconds = Math.max(0, (end - start) / speed);
    var preset = exportPresetSelect ? exportPresetSelect.value : 'original';
    var removeAudioEl = document.getElementById('exportRemoveAudio');
    var audioBps = (removeAudioEl && removeAudioEl.checked) || speed !== 1 ? 0 : 96000;
    var fps = 30, targetH = vh, bitrate;

    if(preset === 'youtube'){ targetH = Math.min(vh, 1080); }
    else if(preset === 'slack'){ targetH = Math.min(vh, 720); }

    if(preset === 'chat'){
      // aim for about 10 MB in total, leave a little room for container overhead
      var budgetBits = 10 * 1024 * 1024 * 8 * 0.9;
      bitrate = outSeconds > 0 ? Math.floor(budgetBits / outSeconds - audioBps) : 1500000;
      bitrate = Math.max(120000, Math.min(6000000, bitrate));
      targetH = bitrate >= 1500000 ? 720 : (bitrate >= 700000 ? 540 : (bitrate >= 350000 ? 360 : 270));
      targetH = Math.min(vh, targetH);
    }

    var ow = Math.round(vw * (targetH / vh)), oh = targetH;
    ow -= ow % 2; oh -= oh % 2;
    if(preset !== 'chat'){
      var bpp = preset === 'slack' ? 0.08 : (preset === 'youtube' ? 0.13 : 0.12);
      bitrate = Math.round(ow * oh * fps * bpp);
      bitrate = Math.max(500000, Math.min(20000000, bitrate));
    }
    return { w: ow, h: oh, bitrate: bitrate, audioBps: audioBps, seconds: outSeconds, preset: preset,
             resize: (!!cropRect || ow !== vw || oh !== vh) };
  }

  function updateExportEstimate(){
    if(!exportEstimateEl) return;
    if(!sourceVideo.duration || !sourceVideo.videoWidth){ exportEstimateEl.textContent = ''; return; }
    var plan = planExport();
    var bytes = (plan.bitrate + plan.audioBps) * plan.seconds / 8;
    var mb = bytes / (1024 * 1024);
    exportEstimateEl.textContent = 'Export plan: ' + plan.w + ' × ' + plan.h + ', about ' +
      (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + ' MB (an estimate, real size varies with how busy the video is).';
  }
  [exportPresetSelect, exportFormatSelect, exportSpeedSelectEl,
   document.getElementById('exportRemoveAudio'), trimStart, trimEnd].forEach(function(el){
    if(el) el.addEventListener('input', updateExportEstimate);
    if(el) el.addEventListener('change', updateExportEstimate);
  });
  if(sourceVideo) sourceVideo.addEventListener('loadedmetadata', updateExportEstimate);

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

      var plan = planExport();
      var outCanvas = editCanvas, outCtx = null;
      if(plan.resize){
        outCanvas = document.createElement('canvas');
        outCanvas.width = plan.w; outCanvas.height = plan.h;
        outCtx = outCanvas.getContext('2d');
      }
      var stream = outCanvas.captureStream(30);
      
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

      var wantMp4 = exportFormatSelect && exportFormatSelect.value === 'mp4';
      var mimeType = (wantMp4 ? firstSupported(MP4_TYPES) : null) || firstSupported(WEBM_TYPES) || 'video/webm';
      var recOptions = { mimeType: mimeType, videoBitsPerSecond: plan.bitrate };
      var rec;
      try{
        rec = new MediaRecorder(stream, recOptions);
      }catch(recErr){
        // Some browsers refuse a combination (for example MP4 with this audio). Fall back to WebM.
        mimeType = 'video/webm';
        wantMp4 = false;
        rec = new MediaRecorder(stream, { mimeType: mimeType, videoBitsPerSecond: plan.bitrate });
      }
      var isMp4 = /mp4/.test(rec.mimeType || mimeType);
      var chunks = [];
      rec.ondataavailable = function(e){ if(e.data.size > 0) chunks.push(e.data); };

      var finished = new Promise(function(resolve){
        rec.onstop = function(){ resolve(new Blob(chunks, { type: isMp4 ? 'video/mp4' : 'video/webm' })); };
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
        if(outCtx){
          if(cropRect) outCtx.drawImage(editCanvas, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, plan.w, plan.h);
          else outCtx.drawImage(editCanvas, 0, 0, plan.w, plan.h);
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
      var dlName = ((shouldRemoveAudio || speedMult !== 1) ? 'pro-video' : 'edited-video') + (isMp4 ? '.mp4' : '.webm');
      track('video_exported', { preset: plan.preset, format: isMp4 ? 'mp4' : 'webm', speed: speedMult });
      exportResult.innerHTML = '<a class="link-btn" href="' + url + '" download="' + dlName + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download final video (' + speedMult + 'x)</a>';
      exportProgressBar.style.width = '100%';
      exportBtn.disabled = false;
    });
  }

  // ---------- GIF export (own encoder, nothing is uploaded) ----------
  // Palette: median cut over 15 bit colours. Size trick: pixels that did not change since the last frame
  // are written as "transparent", which makes screen recordings far smaller.
  function buildGifPalette(hist, maxColors){
    var cols = [];
    for(var i = 0; i < 32768; i++) if(hist[i]) cols.push(i);
    function chan(c, axis){ return axis === 0 ? (c >> 10) & 31 : (axis === 1 ? (c >> 5) & 31 : c & 31); }
    var boxes = [{ cols: cols }];
    while(boxes.length < maxColors){
      var bi = -1, bestRange = 0, bestAxis = 0;
      for(var b = 0; b < boxes.length; b++){
        var bc = boxes[b].cols;
        if(bc.length < 2) continue;
        for(var ax = 0; ax < 3; ax++){
          var mn = 31, mx = 0;
          for(var k = 0; k < bc.length; k++){ var v = chan(bc[k], ax); if(v < mn) mn = v; if(v > mx) mx = v; }
          if(mx - mn > bestRange){ bestRange = mx - mn; bi = b; bestAxis = ax; }
        }
      }
      if(bi < 0) break;
      var box = boxes[bi].cols;
      box.sort(function(a, b2){ return chan(a, bestAxis) - chan(b2, bestAxis); });
      var total = 0; for(var t = 0; t < box.length; t++) total += hist[box[t]];
      var run = 0, cut = 1;
      for(var s = 0; s < box.length - 1; s++){ run += hist[box[s]]; if(run >= total / 2){ cut = s + 1; break; } cut = s + 1; }
      boxes.splice(bi, 1, { cols: box.slice(0, cut) }, { cols: box.slice(cut) });
    }
    var pal = new Uint8Array(256 * 3);
    boxes.forEach(function(bx, idx){
      var r = 0, g = 0, bl = 0, w = 0;
      bx.cols.forEach(function(c){ var n = hist[c]; r += ((c >> 10) & 31) * n; g += ((c >> 5) & 31) * n; bl += (c & 31) * n; w += n; });
      if(!w) w = 1;
      pal[idx * 3] = Math.round(r / w * 255 / 31);
      pal[idx * 3 + 1] = Math.round(g / w * 255 / 31);
      pal[idx * 3 + 2] = Math.round(bl / w * 255 / 31);
    });
    return { pal: pal, count: boxes.length };
  }

  function gifLzw(indices, out){
    var minCode = 8, clear = 256, eoi = 257;
    var next = 258, size = 9, bits = 0, nbits = 0;
    var table = gifLzw.table || (gifLzw.table = new Int32Array(1 << 20));
    var stamp = gifLzw.stamp || (gifLzw.stamp = new Int32Array(1 << 20));
    gifLzw.gen = (gifLzw.gen || 0) + 1;
    var gen = gifLzw.gen;
    var bytes = [];
    var block = new Uint8Array(255), blen = 0;
    function flushByte(v){
      block[blen++] = v;
      if(blen === 255){ out.push(new Uint8Array([255]), block.slice(0, 255)); blen = 0; }
    }
    function emit(code){
      bits |= code << nbits; nbits += size;
      while(nbits >= 8){ flushByte(bits & 255); bits >>>= 8; nbits -= 8; }
    }
    out.push(new Uint8Array([minCode]));
    emit(clear);
    var prefix = indices[0];
    for(var i = 1; i < indices.length; i++){
      var k = indices[i], key = (prefix << 8) | k;
      if(stamp[key] === gen){ prefix = table[key]; continue; }
      emit(prefix);
      if(next < 4096){
        stamp[key] = gen; table[key] = next++;
        if(next > (1 << size) && size < 12) size++;
      } else {
        emit(clear);
        gifLzw.gen++; gen = gifLzw.gen;
        next = 258; size = 9;
      }
      prefix = k;
    }
    emit(prefix);
    emit(eoi);
    if(nbits > 0) flushByte(bits & 255);
    if(blen > 0) out.push(new Uint8Array([blen]), block.slice(0, blen));
    out.push(new Uint8Array([0]));
  }

  function encodeGif(frames, w, h, delayCs, hist, onProgress){
    var parts = [];
    function u16(v){ return [v & 255, (v >> 8) & 255]; }
    var pal = buildGifPalette(hist, 255);
    var head = [0x47,0x49,0x46,0x38,0x39,0x61].concat(u16(w), u16(h), [0xF7, 0, 0]);
    parts.push(new Uint8Array(head), pal.pal);
    parts.push(new Uint8Array([0x21,0xFF,0x0B,0x4E,0x45,0x54,0x53,0x43,0x41,0x50,0x45,0x32,0x2E,0x30,0x03,0x01,0,0,0]));
    var lut = new Int16Array(32768).fill(-1);
    function nearest(c){
      var v = lut[c];
      if(v >= 0) return v;
      var r = ((c >> 10) & 31) * 255 / 31, g = ((c >> 5) & 31) * 255 / 31, b = (c & 31) * 255 / 31;
      var best = 0, bd = 1e12;
      for(var p = 0; p < pal.count; p++){
        var dr = pal.pal[p*3] - r, dg = pal.pal[p*3+1] - g, db = pal.pal[p*3+2] - b;
        var d = dr*dr*0.3 + dg*dg*0.59 + db*db*0.11;
        if(d < bd){ bd = d; best = p; if(d === 0) break; }
      }
      lut[c] = best;
      return best;
    }
    var prev = null;
    return (async function(){
      for(var f = 0; f < frames.length; f++){
        var src = frames[f], cur = new Uint8Array(src.length);
        for(var i = 0; i < src.length; i++) cur[i] = nearest(src[i]);
        var outIdx = cur;
        if(prev){
          outIdx = new Uint8Array(cur.length);
          for(var j = 0; j < cur.length; j++) outIdx[j] = cur[j] === prev[j] ? 255 : cur[j];
        }
        parts.push(new Uint8Array([0x21,0xF9,0x04, 0x04 | (prev ? 1 : 0), delayCs & 255, (delayCs >> 8) & 255, 255, 0]));
        parts.push(new Uint8Array([0x2C].concat(u16(0), u16(0), u16(w), u16(h), [0])));
        gifLzw(outIdx, parts);
        prev = cur;
        frames[f] = null;
        if(onProgress) onProgress(f + 1, frames.length);
        await new Promise(function(res){ setTimeout(res, 0); });
      }
      parts.push(new Uint8Array([0x3B]));
      return new Blob(parts, { type: 'image/gif' });
    })();
  }

  var exportGifBtn = document.getElementById('exportGifBtn');
  if(exportGifBtn){
    exportGifBtn.addEventListener('click', async function(){
      if(trackingBusy || !sourceVideo.duration) return;
      var start = parseFloat(trimStart.value), end = parseFloat(trimEnd.value);
      var speedSel2 = document.getElementById('exportSpeedSelect');
      var speed = speedSel2 ? parseFloat(speedSel2.value) || 1 : 1;
      var fps = parseInt(document.getElementById('gifFpsSelect').value, 10) || 10;
      var outW = parseInt(document.getElementById('gifWidthSelect').value, 10) || 480;
      var srcW = cropRect ? cropRect.w : editCanvas.width, srcH = cropRect ? cropRect.h : editCanvas.height;
      outW = Math.min(outW, srcW);
      var outH = Math.max(2, Math.round(srcH * outW / srcW));
      var outSeconds = (end - start) / speed;
      var totalFrames = Math.max(1, Math.floor(outSeconds * fps));
      if(totalFrames > 300){
        toast('That is too long for a GIF (about ' + Math.round(300 / fps) + ' seconds at this frame rate). Trim the clip, speed it up, or lower the frame rate.', 'error');
        return;
      }
      var wasBusyUi = exportBtn ? exportBtn.disabled : false;
      exportBtn.disabled = true; exportGifBtn.disabled = true;
      exportResult.innerHTML = '';
      exportProgressWrap.classList.add('show');
      exportProgressBar.style.width = '0%';
      sourceVideo.pause();
      var origTime = sourceVideo.currentTime;
      trackingBusy = true;
      var frames = [], hist = new Uint32Array(32768);
      var g = document.createElement('canvas'); g.width = outW; g.height = outH;
      var gctx = g.getContext('2d', { willReadFrequently: true });
      try{
        var step = speed / fps;
        for(var n = 0; n < totalFrames; n++){
          await seekVideo(Math.min(end, start + n * step));
          ctx.filter = 'none';
          ctx.drawImage(sourceVideo, 0, 0, editCanvas.width, editCanvas.height);
          drawRegionsOnCanvas(ctx);
          if(watermarkImg) drawWatermarkOnCanvas(ctx);
          var burn = document.getElementById('exportBurnCaptions');
          if(burn && burn.checked && captions.length > 0) drawCaptionsOnCanvas(ctx);
          if(cropRect) gctx.drawImage(editCanvas, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, outW, outH);
          else gctx.drawImage(editCanvas, 0, 0, outW, outH);
          var d = gctx.getImageData(0, 0, outW, outH).data;
          var q = new Uint16Array(outW * outH);
          for(var p = 0, o = 0; o < q.length; p += 4, o++){
            var c15 = ((d[p] >> 3) << 10) | ((d[p+1] >> 3) << 5) | (d[p+2] >> 3);
            q[o] = c15; hist[c15]++;
          }
          frames.push(q);
          exportProgressBar.style.width = (n / totalFrames * 70) + '%';
        }
        var delay = Math.max(2, Math.round(100 / fps));
        var blob = await encodeGif(frames, outW, outH, delay, hist, function(done, all){
          exportProgressBar.style.width = (70 + done / all * 30) + '%';
        });
        var url = URL.createObjectURL(blob);
        exportResult.innerHTML = '<a class="link-btn" href="' + url + '" download="recnook.gif">Download GIF (' + outW + ' × ' + outH + ', ' + totalFrames + ' frames, ' + fmtBytes(blob.size) + ')</a>' +
          '<img class="gif-preview" alt="GIF preview" src="' + url + '">';
        exportProgressBar.style.width = '100%';
        track('gif_exported', { width: outW, fps: fps, frames: totalFrames });
      }catch(err){
        toast('Could not make the GIF: ' + err.message, 'error');
      }finally{
        trackingBusy = false;
        await seekVideo(origTime);
        drawCurrentFrame();
        exportBtn.disabled = wasBusyUi; exportGifBtn.disabled = false;
      }
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
        toast('Could not capture the screen: ' + err.message);
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
        toast('Could not capture the screen: ' + err.message);
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
      if(!areaRect || areaRect.w < 6 || areaRect.h < 6){ toast('Drag out an area first.'); return; }
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
        toast('Please capture or upload a screenshot first.');
        return;
      }
      shotExtractTextBtn.disabled = true;
      if(ocrStatus) ocrStatus.innerHTML = '<span class="rec-dot pulsing"></span>Loading the text reader...';
      try{
        await loadTesseract();
      }catch(loadErr){
        if(ocrStatus) ocrStatus.textContent = loadErr.message;
        shotExtractTextBtn.disabled = false;
        return;
      }
      track('ocr_used');
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
          toast('Could not copy to clipboard: ' + err.message);
        });
      } catch(e) {
        toast('Clipboard API is not supported in this browser or requires a secure HTTPS connection.');
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
        '<span class="label">' + escapeHtml(f.name) + '</span>' +
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
        '<span class="label">' + escapeHtml(f.name) + '</span>' +
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