var conf = { iceServers: [{ "urls": "stun:stun.l.google.com:19302" }] };
var pc = new RTCPeerConnection(conf);
var localStream, _fileChannel, chatEnabled, context, source,
    _chatChannel, sendFileDom = {},
    recFileDom = {},
    receiveBuffer = [],
    receivedSize = 0,
    file,
    bytesPrev = 0;

// enableChat();
getMedia("both")
signallingStateChangeHandler();

function errHandler(err) {
    console.log(err);
    alert("Ошибка: " + err);
}

function getMedia(mediaType) {
    var constraints = { audio: true, video: true }
    if (mediaType == 'audio') {
        constraints.video = false;
    } else {
        constraints.video = true
    }
    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
        localStream = stream;
        local.srcObject = stream;
        local.muted = true;
        stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
        });
    }).catch(errHandler);
}


pc.ontrack = function (e) {
    console.log('remote ontrack', e.streams);
    remote.srcObject = e.streams[0];
}

//see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionstatechange_event
pc.onconnectionstatechange = function (e) {
     console.log('onconnectionstatechange');
     console.log('pc.connectionState: ', pc.connectionState);

    if (pc.connectionState == 'connected') {
        document.getElementById('start').style.display = 'none';    
        document.getElementById('have-local-offer').style.display = 'none';    
        document.getElementById('videos').style.display = 'block';    
        document.getElementById('connecting').style.display = 'none';
    }
    else if (pc.connectionState == 'connecting') {
        document.getElementById('start').style.display = 'none';    
        document.getElementById('have-local-offer').style.display = 'none';    
        document.getElementById('videos').style.display = 'none';
        document.getElementById('connecting').style.display = 'block';
    }
}

// see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/signalingstatechange_event
pc.onsignalingstatechange = signallingStateChangeHandler;

function signallingStateChangeHandler() {
    console.log('onsignalingstatechange');
    console.log('pc.signalingState: ', pc.signalingState);
    console.log('pc.connectionState: ', pc.connectionState);
    console.log('pc.iceGatheringState: ', pc.iceGatheringState);
    console.log('pc.iceConnectionState: ', pc.iceConnectionState);

    if (pc.signalingState == 'stable' && pc.connectionState == 'new') {
        document.getElementById('start').style.display = 'block';    
        document.getElementById('have-local-offer').style.display = 'none';    
        document.getElementById('connecting').style.display = 'none';
        document.getElementById('videos').style.display = 'none';
    } 
    else if (pc.signalingState == 'have-local-offer' && pc.connectionState == 'new') {
        navigator.clipboard.writeText(JSON.stringify(pc.localDescription));
        document.getElementById('start').style.display = 'none';    
        document.getElementById('have-local-offer').style.display = 'block';    
        document.getElementById('connecting').style.display = 'none';
        document.getElementById('videos').style.display = 'none';
    }
}

remoteOfferGot.onclick = () =>
    navigator.clipboard.readText()
        .then(zz => {
            const c = JSON.parse(zz);
            if (!c.type || c.type != 'answer' || !c.sdp) {
                throw new Error('remoteDescription is not an answer');
            }
            return new RTCSessionDescription(c);
        })
        .then(remDesc => pc.setRemoteDescription(remDesc))
        .catch(errHandler);


createCall.onclick = () => 
    pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(errHandler);

acceptCall.onclick = () =>
    navigator.clipboard.readText()
        .then(zz => {
            const c = JSON.parse(zz);
            if (!c.type || c.type != 'offer' || !c.sdp) {
                throw new Error('remoteDescription is not an offer');
            }
            return new RTCSessionDescription(c);
        })
        .then(remDesc => pc.setRemoteDescription(remDesc))
        .then(() => pc.createAnswer())
        .then(answer => pc.setLocalDescription(answer))
        .then(() => navigator.clipboard.writeText(JSON.stringify(pc.localDescription)))
        .catch(errHandler);

endCall.onclick = () => {
    pc.close();
    window.location.reload();
}

