'use strict';

if (window.contentScriptInjected !== true) {
    window.contentScriptInjected = true;

    // Init
    let video = getVideo();

    if (video) {
        initSync();
    }

    function getVideo() {
        let videos = document.getElementsByTagName('video');
        if (videos.length > 0) {
            return videos[0];
        }
    }

    function sendState() {
        if (video.readyState > 2) {
            var videoState = {
                url: window.location.href,
                isPaused: video.paused,
                currentTime: video.currentTime
            };
            chrome.runtime.sendMessage({ action: 'sendState', content: videoState });
        }
    }

    function initSync() {
        // Max allowed time offset between videos (in seconds)
        const toffset = 0.2;

        // Sending messages if user clicks
        sendState();

        video.addEventListener('pause', sendState);
        video.addEventListener('play', sendState);
        video.addEventListener('seeked', sendState);

        // Gets video's state from storage
        chrome.storage.onChanged.addListener(function (changes, namespace) {
            for (var key in changes) {
                if (key == 'videoState') {
                    let videoState = changes[key].newValue;
                    let url = window.location.href;
                    if (url.startsWith(videoState.url) || videoState.url.startsWith(url)) {
                        if (video.paused !== videoState.isPaused)
                            videoState.isPaused ? video.pause() : video.play();
                        let timediff = Math.abs(video.currentTime - videoState.currentTime).toFixed(1);
                        if (timediff > toffset && video.readyState > 2) {
                            video.currentTime = videoState.currentTime;
                        }
                    }
                }
            }
        });

        chrome.runtime.onConnect.addListener(function (port) {
            video.addEventListener('pause', sendState);
            video.addEventListener('play', sendState);
            video.addEventListener('seeked', sendState);
            console.log('connected');

            port.onDisconnect.addListener(function () {
                video.removeEventListener('pause', sendState);
                video.removeEventListener('play', sendState);
                video.removeEventListener('seeked', sendState);
                console.log('disconnected');
            });
        });
    }
}