const join_btn = document.getElementById('join')
const username_label = document.getElementById('label_username')
const username_input = document.getElementById('username')
const room_input = document.getElementById('room')
const remote_video = document.getElementById('video-box2')
const call_btn = document.getElementById('call_btn')
const chat_container = document.getElementById('chat-container')
let username
let websocket
let room
let mapPeer = {}

join_btn.addEventListener('click', () => {
  username_label.innerHTML = username_input.value
  username = username_input.value
  room = room_input.value
  join_btn.style.visibility = 'hidden'
  username_input.style.visibility = 'hidden'


  let loc = window.location
  let ws_start = (loc.protocol === 'https:') ? 'wss://' : 'ws://'
  let endpoint = ws_start + loc.host + loc.pathname
  console.log('Connecting to:', endpoint)

  websocket = new WebSocket(endpoint)


  websocket.onopen = () => {
    console.log('Connected');
    sendsignal('new-peer',{})
  };

  websocket.onmessage = websocketOnmessage;

  websocket.onclose = (e) => {
    console.log('Connection closed, code:', e.code);
  };

  websocket.onerror = (e) => {
    console.log('WebSocket error:', e);
  };

})

function websocketOnmessage(event) {
  let data = JSON.parse(event.data)
  console.log('Data Receive')
  let peerUsername = data['peer']
  let action = data['action']
  let receiver_channel_name = data['message']['receiver_channel_name']
  console.log(username , peerUsername)
  if (username == peerUsername) {
    return
  }

  if (action == 'new-peer') {
    createoffer(peerUsername, receiver_channel_name);
    return
  }
  
  if (action == 'new-offer') {
    var r_offer = data['message']['sdp'];
    console.log('offer',peerUsername)
    createanswer(r_offer, peerUsername, receiver_channel_name);
    return
  }

  // if (action == 'new-offer') {
  //   var r_offer = data['message']['sdp'];
  //   console.log('offer',peerUsername)
  //   console.log('mapPeer',mapPeer)
  //   if (mapPeer[peerUsername] && mapPeer[peerUsername][0].localDescription) {
  //     // Set the remote description if the local description has been set
  //     createanswer(r_offer, peerUsername, receiver_channel_name);
  //   } else {
  //     // Otherwise, save the offer and wait for the local description to be set
  //     mapPeer[peerUsername][1] = r_offer;
  //   }
  //   return
  // }
  if (action == 'new-answer') {
    console.log('answer',peerUsername)
    var answer = data['message']['sdp'];
    var r_peer = mapPeer[peerUsername][0];
    r_peer.setRemoteDescription(answer)
    return
  }


};

let localstream = new MediaStream()

const constraints = {
  'video': true,
  'audio': true
}

let localvideo = document.getElementById('video-box')
let audio_toggle = document.getElementById('audio_toggle')
let video_toggle = document.getElementById('video_toggle')

let userMedia = navigator.mediaDevices.getUserMedia(constraints)
  .then(stream => {
    localstream = stream
    localvideo.srcObject = localstream
    localvideo.muted = true

    var audio_track = stream.getAudioTracks();
    var video_track = stream.getVideoTracks();

    audio_track[0].enabled = true
    video_track[0].enabled = true

    audio_toggle.addEventListener('click', () => {
      audio_track[0].enabled = !audio_track[0].enabled
      if(audio_track[0].enabled) {
        audio_toggle.innerHTML = 'Audio Mute'
      }
      else {
       audio_toggle.innerHTML = 'Audio Unmute'
      }
    })

    video_toggle.addEventListener('click', () => {
      if(video_toggle[0].enabled) {
        video_track[0].enabled = !video_track[0].enabled 
        video_toggle.innerHTML = 'Video off'
        
      }
      else {
        video_toggle.innerHTML = 'Video on'
      }
    })

  })
  .catch(error => {
    console.log('Error in taking video stream', error)
  })

function sendsignal(action, message) {
  let jsonstr = JSON.stringify({
    'peer': username,
    'action': action,
    'message': message
  })
  websocket.send(jsonstr)
}

// call_btn.onclick = () => {
//   createoffer();
// };



let iceServers = {
  iceServers: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

function createoffer(peerUsername, receiver_channel_name) {

  let peer = new RTCPeerConnection(null);

  addLocaltrack(peer)
  let dc = peer.createDataChannel('channel');
  dc.onopen = () => {
    console.log('Connection opend')
  }
  dc.onmessage = dcOnmessage;
  setOntrack(peer)
  mapPeer[peerUsername] = [peer, dc]

  peer.addEventListener('iceconnectionstatechange', () => {
    var iceConnectionState = peer.iceConnectionState;
    if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
      delete mapPeer[peerUsername];
      if (iceConnectionState != 'closed') {
        peer.close();
      }
      
    }
  })

  peer.addEventListener('icecandidate', (e) => {
    if (e.candidate) {
      console.log('New ice Candidate : ')
      return
    }
    sendsignal('new-offer', {
      'sdp': peer.localDescription,
      'receiver_channel_name': receiver_channel_name
    })
  })

  peer.createOffer()
    .then(offer => peer.setLocalDescription(offer))
    .then(() => {
      console.log('Set Local description successfully')
    })


}


function createanswer(offer, peerUsername, receiver_channel_name) {
  let peer = new RTCPeerConnection(null);
  addLocaltrack(peer)

  setOntrack(peer)


  peer.addEventListener('datachannel', e => {
    peer.dc = e.channel;
    peer.dc.onopen = () => {
      console.log('Connection opend')
    }
    peer.dc.onmessage = dcOnmessage;

    mapPeer[peerUsername] = [peer, peer.dc]
  })

  peer.addEventListener('iceconnectionstatechange', () => {
    var iceConnectionState = peer.iceConnectionState;
    if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
      delete mapPeer[peerUsername];
      if (iceConnectionState != 'closed') {
        peer.close();
      }
      
    }
  })

  peer.addEventListener('icecandidate', (e) => {
    if (e.candidate) {
      console.log('New ice Candidate : ')
      return
    }
    sendsignal('new-answer', {
      'sdp': peer.localDescription,
      'receiver_channel_name': receiver_channel_name
    })
  })

  peer.setRemoteDescription(offer)
    .then(() => {
      console.log('Remote Decription set successfully for ', peerUsername)

      peer.createAnswer()
        .then(a => {
          console.log('Answer created');
          peer.setLocalDescription(a)
        })
    })


}
function addLocaltrack(peer) {
  localstream.getTracks().forEach((track) => {
    peer.addTrack(track, localstream);
  });
  return
}

function dcOnmessage(event) {
  let message = event.data;
  var li = document.createElement('li');
  li.appendChild(document.createTextNode(message))
  chat_container.appendChild(li)
}
function setOntrack(peer) {
  let remotestream = new MediaStream();
  remote_video.srcObject = remotestream;
  peer.addEventListener('track', async (e) => {
    remotestream.addTrack(e.track, remotestream)
  })
}