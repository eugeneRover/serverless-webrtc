
const applyConfigAndStart = () => {
    const conf = JSON.parse(cfgText.value);
    const pc = new RTCPeerConnection(conf);

    getMedia("both", pc);

    const ssch = createSignallingStateChangeHandler(pc);
    pc.onsignalingstatechange = ssch;
    pc.onconnectionstatechange = createConnectionStateChangeHandler(pc);
    pc.ontrack = function (e) {
        console.log('remote ontrack', e.streams);
        const rem = document.getElementById('remote');
        rem.srcObject = e.streams[0];
    }
    pc.onicecandidate = createIceCandidateHandler(pc);
    pc.onicecandidateerror = createIceCandidateErrorHandler(pc);
    pc.oniceconnectionstatechange = createIceConnectionStateChangeHandler(pc);
    pc.onicegatheringstatechange = createIceGatheringStateChangeHandler(pc);
    
    endCall.onclick = createEndCallHandler(pc);
    acceptCall.onclick = createAcceptCallHandler(pc);
    createCall.onclick = createCreateCallHandler(pc);
    remoteOfferGot.onclick = createRemoteOfferGotHandler(pc);

    showOnly(['start']);
}

function showOnly(idsToShow){
    ['cfg', 'start', 'have-local-offer', 'videos', 'connecting'].forEach(id => {
        const d = idsToShow.includes(id) ? 'block' : 'none';
        document.getElementById(id).style.display = d;
    });
}

function errHandler(err) {
    console.log(err);
    alert("Ошибка: " + err);
}

const getMedia = (mediaType, pc) => {
    var constraints = { audio: true, video: true }
    if (mediaType == 'audio') {
        constraints.video = false;
    } else {
        constraints.video = true;
    }
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            const loc = document.getElementById('local');
            loc.srcObject = stream;
            loc.muted = true;
            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });
        })
        .catch(errHandler);
}

const encode = (str) => LZString.compressToUTF16(str);
const decode = (str) => LZString.decompressFromUTF16(str);

const createIceCandidateHandler = (pc) => (event) => {
    console.log('onicecandidate: ', event.candidate);
}
const createIceCandidateErrorHandler = (pc) => (event) => {
    console.log('onicecandidateerror: ', event);
}
const createIceConnectionStateChangeHandler = (pc) => (event) => {
    console.log('oniceconnectionstatechange: ', pc.iceConnectionState);
}
const createIceGatheringStateChangeHandler = (pc) => (event) => {
    console.log('onicegatheringstatechange: ', pc.iceGatheringState);
}



//see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionstatechange_event
const createConnectionStateChangeHandler = (pc) => () => {
     console.log('onconnectionstatechange', pc.connectionState);

    if (pc.connectionState == 'connected') {
        showOnly(['videos']);
    }
    else if (pc.connectionState == 'connecting') {
        showOnly(['connecting']);
    }
}

// see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/signalingstatechange_event
const createSignallingStateChangeHandler = (pc) => () => {
    console.log('onsignalingstatechange', pc.signalingState);

    if (pc.signalingState == 'stable' && pc.connectionState == 'new') {
        showOnly(['start']);
    } 
    else if (pc.signalingState == 'have-local-offer' && pc.connectionState == 'new') {
        showOnly(['have-local-offer']);
    }
}


// *************  click handlers create (pure functions) *************

const createRemoteOfferGotHandler = (pc) => () =>
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

const createCreateCallHandler = (pc) => () => 
    pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
            const s = JSON.stringify(pc.localDescription)
            console.log('stringified length: ', s.length);
            const d = encode(s);
            console.log('encoded length: ', d.length);
            return navigator.clipboard.writeText(d); 
        })
        .catch(errHandler);

const createAcceptCallHandler = (pc) => () =>
    navigator.clipboard.readText()
        .then(zz => {
            console.log('input encoded length: ', zz.length);
            const d = decode(zz);
            console.log('input decoded length: ', d.length);
            console.log('input decoded: ', d);
            const c = JSON.parse(d);
            if (!c.type || c.type != 'offer' || !c.sdp) {
                throw new Error('remoteDescription is not an offer');
            }
            return new RTCSessionDescription(c);
        })
        .then(remDesc => pc.setRemoteDescription(remDesc))
        .then(() => pc.createAnswer())
        .then(answer => pc.setLocalDescription(answer))
        .then(() => {
            const s = JSON.stringify(pc.localDescription);
            console.log('output stringified length: ', s.length);
            const d = encode(s);
            console.log('output encoded length: ', d.length);
            return navigator.clipboard.writeText(d);
        })
        .catch(errHandler);

const createEndCallHandler = (pc) => 
    () => {
        pc.close();
        window.location.reload();
    };


/*
                            A                  B
    Press Create offer
    Copy LocalOffer to CB           
                                send over tlg
                              ----------------->
                                                   Paste the text to Remote Answer
                                                   Press Answer
                                                   Copy Local Offer to CB
                                send over tlg
                             <------------------   
Paste text to Remote Answer
Press answer
                              connect established
                             ===================== 
*/


saveCfg.onclick = applyConfigAndStart;
