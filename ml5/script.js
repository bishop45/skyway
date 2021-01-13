const Peer = window.Peer;
const voiceURL = "../shared/voice/"//"http://localhost:8080/shared/voice/"
let model, webcam, labelContainer, maxPredictions;


function ChangeVideoTxt(txt) {
  document.getElementById("js-video-status").innerHTML=txt;
}

function ChangeAudioTxt(txt) {
  document.getElementById("js-audio-status").innerHTML=txt;
}

async function createModel() {
  //voice Command
  const voiceModelURL = voiceURL + "model.json"; // model topology
  const voiceMetadataURL = voiceURL +  "metadata.json";

  const recognizer = speechCommands.create(
      "BROWSER_FFT", // fourier transform type, not useful to change
      undefined, // speech commands vocabulary feature, not useful for your models
      voiceModelURL,
      voiceMetadataURL);

  // check that model and metadata are loaded via HTTPS requests.
  await recognizer.ensureModelLoaded();
  return recognizer;
}

(async function main() {
  const localVideo = document.getElementById('js-local-stream');
  const videoOnTrigger = document.getElementById("js-video-on");
  const videoOffTrigger = document.getElementById("js-video-off");
  const audioOnTrigger = document.getElementById("js-audio-on");
  const audioOffTrigger = document.getElementById("js-audio-off");
  const peerTrigger = document.getElementById("js-peer-trigger");
  const joinTrigger = document.getElementById('js-join-trigger');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id');
  const handleName = document.getElementById("js-handle-name");
  //const roomMode = document.getElementById('js-room-mode');
  const localText = document.getElementById('js-local-text');
  const sendTrigger = document.getElementById('js-send-trigger');
  const messages = document.getElementById('js-messages');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');

  const stOkTrigger = document.getElementById("js-st-ok");
  const stNgTrigger = document.getElementById("js-st-ng");
  const stKikoenaiTrigger = document.getElementById("js-st-kikoenai");
  const stKyoshuTrigger = document.getElementById("js-st-kyoshu");
  const stResetTrigger = document.getElementById("js-st-reset");
  const myStatus = document.getElementById("js-my-status");


  const modelURL = '../shared/model.json';
  const metadataURL = '../shared/metadata.json';

  model = await tmImage.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();
  webcam = new tmImage.Webcam(200, 200, true); // width, height, flip
  await webcam.setup(); // request access to the webcam
  webcam.play();



  let localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: { width: 320, height: 240} , //false,
    })
    .catch(console.error);


  //voice Command
  const recognizer = await createModel();
  const classLabels = recognizer.wordLabels(); // get class labels
  const labelContainer = document.getElementById("label-container");
  for (let i = 0; i < classLabels.length; i++) {
      labelContainer.appendChild(document.createElement("div"));
  }


  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);

// Video ON
  videoOnTrigger.addEventListener('click', () => {
    localStream.getVideoTracks()[0].enabled = true;
    ChangeVideoTxt("ON");
  });

// Video OFF
  videoOffTrigger.addEventListener('click', () => {
    localStream.getVideoTracks()[0].enabled = false;
    ChangeVideoTxt("OFF");
  });

// Audio ON
  audioOnTrigger.addEventListener('click', () => {
    localStream.getAudioTracks()[0].enabled = true;
    ChangeAudioTxt("ON");
  });

// Audio OFF
  audioOffTrigger.addEventListener('click', () => {
    localStream.getAudioTracks()[0].enabled = false;
    ChangeAudioTxt("OFF");
  });

  peerTrigger.addEventListener('click', () => {
    // eslint-disable-next-line require-atomic-updates
    const peer = (window.peer = new Peer(handleName.value,{
      key: window.__SKYWAY_KEY__,
      debug: 3,
    }));
  });

  // Register join handler
  joinTrigger.addEventListener('click', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {//!peer.open
      messages.textContent += `Please enter your handle name\n`;
      return;
    }
    if (!roomId.value) {
      messages.textContent += `Please enter room name\n`;
      return;
    }

    const room = peer.joinRoom(roomId.value, {
      mode: "sfu",//getRoomModeByHash(),
      stream: localStream,
    });

    room.once('open', () => {
      messages.textContent += '=== '+`${peer.id}`+' (You) joined ===\n';
    });
    room.on('peerJoin', peerId => {
      messages.textContent += `=== ${peerId} joined ===\n`;
    });

    // Render remote stream for new peer join in the room
    room.on('stream', async stream => {
      const newVideo = document.createElement('video');
      newVideo.srcObject = stream;
      newVideo.playsInline = true;
      // mark peerId to find it later at peerLeave event
      newVideo.setAttribute('data-peer-id', stream.peerId);
      remoteVideos.append(newVideo);

      let peerHandleName = document.createElement('a');
      peerHandleName.textContent = stream.peerId;
      peerHandleName.setAttribute('peer-id', stream.peerId);
      peerHandleName.style.cssText = "font-size: 30pt"+"color: #00ff00";//"font-weight: bold;"+
      remoteVideos.append(peerHandleName);
      let peerStatus = document.createElement('img');
      peerStatus.src ="";
      peerStatus.setAttribute('peer-img-id', stream.peerId);
      remoteVideos.append(peerStatus);
      remoteVideos.style.textAlign="center";
      //console.log(remoteVideos.length);
      //messages.textContent += remoteVideos.length;

      await newVideo.play().catch(console.error);
    });

    room.on('data', ({ data, src }) => {
      // Show a message sent to the room and who sent
      if (data === "ok" || data === "ng" || data == "kyoshu" || data =="kikoenai"){
        messages.textContent += `#${src}: changed status to ` +data +"\n";
        let peerStatus = remoteVideos.querySelector(
          `[peer-img-id="${src}"]`
        );
        peerStatus.setAttribute('src', "../shared/"+data+".png");
      }else if (data === "reset"){
        messages.textContent += `#${src}: changed status to normal\n`;
        let peerStatus = remoteVideos.querySelector(
          `[peer-img-id="${src}"]`
        );
        peerStatus.setAttribute('src', "");
      }else{
          messages.textContent += `${src}: ${data}\n`;
      }
    });

    // for closing room members
    room.on('peerLeave', peerId => {
      const remoteVideo = remoteVideos.querySelector(
        `[data-peer-id="${peerId}"]`
      );
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
      remoteVideo.remove();

      const delId = remoteVideos.querySelector(
        `[peer-id="${peerId}"]`
      );
      delId.remove();

      const delImgId = remoteVideos.querySelector(
        `[peer-img-id="${peerId}"]`
      );
      delImgId.remove();

      messages.textContent += `=== ${peerId} left ===\n`;
      //messages.textContent += remoteVideos.length + "\n";
    });

    // for closing myself
    room.once('close', () => {
      sendTrigger.removeEventListener('click', onClickSend);
      messages.textContent += '==='+`${peer.id}`+' (You) left===\n';
      Array.from(remoteVideos.children).forEach(remoteVideo => {
        //remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });
    });

    // Convenience function to setup a webcam


    window.requestAnimationFrame(loop);
    async function loop() {
        webcam.update(); // update the webcam frame
        await predict();
        setTimeout(function(){
          window.requestAnimationFrame(loop);
        }, 1000)
    }


    // listen() takes two arguments:
    // 1. A callback function that is invoked anytime a word is recognized.
    // 2. A configuration object with adjustable fields
    recognizer.listen(result => {
        const scores = result.scores; // probability of prediction for each class
        let indexMax
        indexMax = result.scores.indexOf(Math.max(...result.scores));
        console.log(indexMax,classLabels[indexMax]);
        if (classLabels[indexMax] === "ok"){
          this.status ="ok";
          statusSend();
        }
        else if (classLabels[indexMax] === "tewoageru") {
          this.status ="kyoshu";
          statusSend();
        }
        else if (classLabels[indexMax] === "ng") {
          this.status ="ng";
          statusSend();
        }
        else if (classLabels[indexMax] === "reset") {
          this.status ="reset";
          statusSend();
        }
        else if (classLabels[indexMax] === "kikoenai") {
          this.status ="kikoenai";
          statusSend();
        }
        // render the probability scores per class
        /*for (let i = 0; i < classLabels.length; i++) {
            const classPrediction = classLabels[i] + ": " + result.scores[i].toFixed(2);
            labelContainer.childNodes[i].innerHTML = classPrediction;
        }*/
    }, {
        includeSpectrogram: true, // in case listen should return result.spectrogram
        probabilityThreshold: 0.75,
        invokeCallbackOnNoiseAndUnknown: false,
        overlapFactor: 0.50 // probably want between 0.5 and 0.75. More info in README
    });



    // run the webcam image through the image model
    async function predict() {
        // predict can take in an image, video or canvas html element
        //const prediction = await model.predict(webcam.canvas);
        const prediction = await model.predictTopK(webcam.canvas,1,true);
        //labelContainer.innerHTML = prediction[0].className;
        if (prediction[0].className === "Class 1"){
          this.status ="ok";
          statusSend();
        }
        else if (prediction[0].className === "Class 2") {
          this.status ="kyoshu";
          statusSend();
        }
        else if (prediction[0].className === "Class 4") {
          this.status ="ng";
          statusSend();
        }
    }

    sendTrigger.addEventListener('click', onClickSend);
    leaveTrigger.addEventListener('click', () => room.close(), { once: true });

    stOkTrigger.addEventListener('click', {status: "ok", handleEvent: statusSend});
    stNgTrigger.addEventListener('click', {status: "ng", handleEvent: statusSend});
    stKyoshuTrigger.addEventListener('click', {status: "kyoshu", handleEvent: statusSend});
    stKikoenaiTrigger.addEventListener('click', {status: "kikoenai", handleEvent: statusSend});
    stResetTrigger.addEventListener('click', {status: "reset", handleEvent: statusSend});

    function onClickSend() {
      // Send message to all of the peers in the room via websocket
      room.send(localText.value);
      messages.textContent += `${peer.id}: ${localText.value}\n`;
      localText.value = '';
    }

    function statusSend(e) {
      // Send message to all of the peers in the room via websocket
      room.send(this.status);
      if (this.status === "reset"){
        myStatus.src = "";
      }else{
        myStatus.src = "../shared/"+this.status+".png";
      }
        //messages.textContent += `# ${peer.id}:changed the status to ` +this.status+"\n";
    }
  });

  //peer.on('error', console.error);
})();
