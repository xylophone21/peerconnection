const WebRTCClient = {
    localView: null,
    remoteView: null,
    configuration: null,
    sendMessageCallback: null,
    your_id: -1,
    peerConnection: null,
    localStream: null,
};

async function start_call(localView, remoteView, configuration, sendMessageCallback) {
    WebRTCClient.localView = localView;
    WebRTCClient.remoteView = remoteView;
    WebRTCClient.configuration = JSON.parse(configuration);
    WebRTCClient.sendMessageCallback = sendMessageCallback;
    WebRTCClient.your_id = -1;
    WebRTCClient.peerConnection = null;

    console.log('Starting video call');

    // init webcam
    const constraints = {
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
    };

    try {
        WebRTCClient.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        WebRTCClient.localView.srcObject = WebRTCClient.localStream;
    } catch (e) {
        console.error('Could not find webcam');
    }
}

async function stop_call() {
    console.log('Stopping video call');

    if (WebRTCClient.peerConnection) {
        WebRTCClient.peerConnection.close();
        WebRTCClient.peerConnection = null;
    }

    if (WebRTCClient.localStream) {
        WebRTCClient.localStream.getTracks().forEach(track => track.stop());
        WebRTCClient.localStream = null;
    }

    if (WebRTCClient.localView) {
        WebRTCClient.localView.srcObject = null;
        WebRTCClient.localView = null;
    }

    if (WebRTCClient.remoteView) {
        WebRTCClient.remoteView.srcObject = null;
        WebRTCClient.remoteView = null;
    }

    WebRTCClient.configuration = null;
    WebRTCClient.sendMessageCallback = null;
    WebRTCClient.your_id = -1;
}

async function on_message(peer_id, data) {
    if (WebRTCClient.your_id == -1) {
        WebRTCClient.your_id = peer_id;
        console.log("Set your_id = " + peer_id);
    }

    // Do not support multi peer_id yet
    if (peer_id != WebRTCClient.your_id) {
        console.log("peer_id not match, want " + WebRTCClient.your_id + " but got " + peer_id );
        return;
    }

    console.log("on_message=" + data);

    var msg = JSON.parse(data);

    try {
        if ("type" in msg && msg.type == "offer") {
            if (WebRTCClient.peerConnection == null) {
                WebRTCClient.peerConnection = new RTCPeerConnection(WebRTCClient.configuration);

                WebRTCClient.peerConnection.addEventListener('icecandidate', ({ candidate }) => {
                    if (candidate) {
                        const candidateStr = JSON.stringify(candidate.toJSON());
                        console.log("Send candidate to peer(" + peer_id + "):" + candidateStr);
                        WebRTCClient.sendMessageCallback(peer_id, candidateStr);
                    }
                });

                WebRTCClient.peerConnection.addEventListener('track', event => {
                    console.log('Received remote track from peer: ' + peer_id);
                    WebRTCClient.remoteView.srcObject = event.streams[0];
                });

                if (WebRTCClient.localStream) {
                    WebRTCClient.localStream.getTracks().forEach(track => WebRTCClient.peerConnection.addTrack(track, WebRTCClient.localStream));
                }
            }

            console.log('setRemoteDescription');
            await WebRTCClient.peerConnection.setRemoteDescription(msg);

            // Create an SDP answer to send back to the client
            var answer = await WebRTCClient.peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });

            const answerStr = JSON.stringify(answer.toJSON());
            console.log('Set SDP answer: ' + answerStr);
            await WebRTCClient.peerConnection.setLocalDescription(answer);
            WebRTCClient.sendMessageCallback(peer_id, answerStr);
        } else if ("type" in msg && msg.type == "answer") {
            console.log("Not imp sdp answer yet");
        }else if("candidate" in msg) {
            console.log('Set ICE candidate from peer: ' + peer_id);
            WebRTCClient.peerConnection.addIceCandidate(new RTCIceCandidate(msg));
        }
    } catch (error) {
        console.error("on_message error:" + error);
    }
}
