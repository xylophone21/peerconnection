const WebRTCClient = {
    localView: null,
    remoteView: null,
    configuration: null,
    sendMessageCallback: null,
    your_id: -1,
    peerConnection: null,
    localStream: null,
    pendingIceCandidates: [],
    hasReceivedRemoteSDP: false,
};

async function start_call(localView, remoteView, configuration, sendMessageCallback) {
    WebRTCClient.localView = localView;
    WebRTCClient.remoteView = remoteView;
    WebRTCClient.configuration = JSON.parse(configuration);
    WebRTCClient.sendMessageCallback = sendMessageCallback;
    WebRTCClient.your_id = -1;
    WebRTCClient.peerConnection = null;
    WebRTCClient.pendingIceCandidates = [];
    WebRTCClient.hasReceivedRemoteSDP = false;

    console.log('Starting video call');

    // init webcam
    const constraints = {
        video: { width: { ideal: 640 }, height: { ideal: 480 }},
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
    WebRTCClient.pendingIceCandidates = [];
    WebRTCClient.hasReceivedRemoteSDP = false;
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

                const tmp_configuration = WebRTCClient.configuration;
                WebRTCClient.peerConnection = new RTCPeerConnection(tmp_configuration);

                WebRTCClient.peerConnection.addEventListener('icecandidate', ({ candidate }) => {
                    if (candidate) {
                        const candidateStr = JSON.stringify(candidate);
                        console.log("Send candidate to peer(" + peer_id + "):" + candidateStr);
                        WebRTCClient.sendMessageCallback(peer_id, candidateStr);
                    } else {
                        console.log("All candidate done!");
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

            // hardcode below sdp will get more local candidates from local RTCPeerConnection
            // msg = JSON.parse('{"type":"offer","sdp":"v=0\\r\\no=- 8618002842101520023 2 IN IP4 127.0.0.1\\r\\ns=-\\r\\nt=0 0\\r\\na=group:BUNDLE 0 1 2\\r\\na=msid-semantic: WMS KvsLocalMediaStream\\r\\nm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 127 123 125\\r\\nc=IN IP4 0.0.0.0\\r\\na=rtcp:9 IN IP4 0.0.0.0\\r\\na=ice-ufrag:mQ1t\\r\\na=ice-pwd:ZqrRCbC/4oeGo/VB8QHMPe9l\\r\\na=ice-options:trickle renomination\\r\\na=fingerprint:sha-256 6B:FC:A7:AD:DA:38:65:79:CC:DC:7A:6F:5B:5F:48:6E:3C:F1:DE:59:1E:DD:06:BD:A8:7E:53:E8:F8:CB:8F:B6\\r\\na=setup:actpass\\r\\na=mid:0\\r\\na=extmap:1 urn:ietf:params:rtp-hdrext:toffset\\r\\na=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\\r\\na=extmap:3 urn:3gpp:video-orientation\\r\\na=extmap:4 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\\r\\na=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\\r\\na=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\\r\\na=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\\r\\na=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space\\r\\na=extmap:9 urn:ietf:params:rtp-hdrext:sdes:mid\\r\\na=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id\\r\\na=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id\\r\\na=sendrecv\\r\\na=msid:KvsLocalMediaStream KvsVideoTrack\\r\\na=rtcp-mux\\r\\na=rtcp-rsize\\r\\na=rtpmap:96 VP8/90000\\r\\na=rtcp-fb:96 goog-remb\\r\\na=rtcp-fb:96 transport-cc\\r\\na=rtcp-fb:96 ccm fir\\r\\na=rtcp-fb:96 nack\\r\\na=rtcp-fb:96 nack pli\\r\\na=rtpmap:97 rtx/90000\\r\\na=fmtp:97 apt=96\\r\\na=rtpmap:98 VP9/90000\\r\\na=rtcp-fb:98 goog-remb\\r\\na=rtcp-fb:98 transport-cc\\r\\na=rtcp-fb:98 ccm fir\\r\\na=rtcp-fb:98 nack\\r\\na=rtcp-fb:98 nack pli\\r\\na=rtpmap:99 rtx/90000\\r\\na=fmtp:99 apt=98\\r\\na=rtpmap:100 H264/90000\\r\\na=rtcp-fb:100 goog-remb\\r\\na=rtcp-fb:100 transport-cc\\r\\na=rtcp-fb:100 ccm fir\\r\\na=rtcp-fb:100 nack\\r\\na=rtcp-fb:100 nack pli\\r\\na=fmtp:100 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\\r\\na=rtpmap:101 rtx/90000\\r\\na=fmtp:101 apt=100\\r\\na=rtpmap:127 red/90000\\r\\na=rtpmap:123 rtx/90000\\r\\na=fmtp:123 apt=127\\r\\na=rtpmap:125 ulpfec/90000\\r\\na=ssrc-group:FID 988596414 2095793506\\r\\na=ssrc:988596414 cname:Is5ZhdhVZ4lFPJDi\\r\\na=ssrc:988596414 msid:KvsLocalMediaStream KvsVideoTrack\\r\\na=ssrc:988596414 mslabel:KvsLocalMediaStream\\r\\na=ssrc:988596414 label:KvsVideoTrack\\r\\na=ssrc:2095793506 cname:Is5ZhdhVZ4lFPJDi\\r\\na=ssrc:2095793506 msid:KvsLocalMediaStream KvsVideoTrack\\r\\na=ssrc:2095793506 mslabel:KvsLocalMediaStream\\r\\na=ssrc:2095793506 label:KvsVideoTrack\\r\\nm=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 102 0 8 106 105 13 110 112 113 126\\r\\nc=IN IP4 0.0.0.0\\r\\na=rtcp:9 IN IP4 0.0.0.0\\r\\na=ice-ufrag:mQ1t\\r\\na=ice-pwd:ZqrRCbC/4oeGo/VB8QHMPe9l\\r\\na=ice-options:trickle renomination\\r\\na=fingerprint:sha-256 6B:FC:A7:AD:DA:38:65:79:CC:DC:7A:6F:5B:5F:48:6E:3C:F1:DE:59:1E:DD:06:BD:A8:7E:53:E8:F8:CB:8F:B6\\r\\na=setup:actpass\\r\\na=mid:1\\r\\na=extmap:14 urn:ietf:params:rtp-hdrext:ssrc-audio-level\\r\\na=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\\r\\na=extmap:4 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\\r\\na=extmap:9 urn:ietf:params:rtp-hdrext:sdes:mid\\r\\na=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id\\r\\na=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id\\r\\na=recvonly\\r\\na=rtcp-mux\\r\\na=rtpmap:111 opus/48000/2\\r\\na=rtcp-fb:111 transport-cc\\r\\na=fmtp:111 minptime=10;useinbandfec=1\\r\\na=rtpmap:103 ISAC/16000\\r\\na=rtpmap:104 ISAC/32000\\r\\na=rtpmap:9 G722/8000\\r\\na=rtpmap:102 ILBC/8000\\r\\na=rtpmap:0 PCMU/8000\\r\\na=rtpmap:8 PCMA/8000\\r\\na=rtpmap:106 CN/32000\\r\\na=rtpmap:105 CN/16000\\r\\na=rtpmap:13 CN/8000\\r\\na=rtpmap:110 telephone-event/48000\\r\\na=rtpmap:112 telephone-event/32000\\r\\na=rtpmap:113 telephone-event/16000\\r\\na=rtpmap:126 telephone-event/8000\\r\\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\\r\\nc=IN IP4 0.0.0.0\\r\\na=ice-ufrag:mQ1t\\r\\na=ice-pwd:ZqrRCbC/4oeGo/VB8QHMPe9l\\r\\na=ice-options:trickle renomination\\r\\na=fingerprint:sha-256 6B:FC:A7:AD:DA:38:65:79:CC:DC:7A:6F:5B:5F:48:6E:3C:F1:DE:59:1E:DD:06:BD:A8:7E:53:E8:F8:CB:8F:B6\\r\\na=setup:actpass\\r\\na=mid:2\\r\\na=sctp-port:5000\\r\\na=max-message-size:262144\\r\\n"}');

            console.log('setRemoteDescription');
            await WebRTCClient.peerConnection.setRemoteDescription(msg);

            // Create an SDP answer to send back to the client
            var answer = await WebRTCClient.peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });

            const answerStr = JSON.stringify(answer);
            console.log('Set SDP answer: ' + answerStr);
            await WebRTCClient.peerConnection.setLocalDescription(answer);
            WebRTCClient.sendMessageCallback(peer_id, answerStr);
            WebRTCClient.hasReceivedRemoteSDP = true;

            WebRTCClient.pendingIceCandidates.forEach(candidateObj => {
                console.log('Set ICE candidate in cache:' + JSON.stringify(candidateObj));
                WebRTCClient.peerConnection.addIceCandidate(candidateObj);
            });

        } else if ("type" in msg && msg.type == "answer") {
            console.log("Not imp sdp answer yet");
        }else if("candidate" in msg) {
            if (WebRTCClient.hasReceivedRemoteSDP) {
                console.log('Set ICE candidate from peer: ' + peer_id);
                WebRTCClient.peerConnection.addIceCandidate(new RTCIceCandidate(msg));
            } else {
                console.log('Set ICE candidate into cache from peer: ' + peer_id);
                WebRTCClient.pendingIceCandidates.push(new RTCIceCandidate(msg));
            }
        }
    } catch (error) {
        console.error("on_message error:" + error);
    }
}
