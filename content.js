'use strict';

function setState() {
    var videoState = { url: window.location.href, isPaused: this.paused, currentTime: this.currentTime.toFixed(0) };
    chrome.storage.sync.set({ videoState: videoState }, function () { });
}

function initContent() {
    let videos = document.getElementsByTagName('video');
    if (videos.length > 0) {
        let video = videos[0];
        console.log('video found');

        // Sending messages
        video.onpause = setState;
        video.onplaying = setState;
        video.onseeked = setState;

        // Gets video's state from storage
        chrome.storage.onChanged.addListener(function (changes, namespace) {
            for (var key in changes) {
                if (key === 'videoState') {
                    let videoState = changes[key].newValue;
                    if (window.location.href == videoState.url) {
                        if (videoState.isPaused)
                            video.pause();
                        else
                            video.play();
                        video.currentTime = videoState.currentTime;
                    }
                }
            }
        });
    }
}

// Init
window.addEventListener('load', initContent, false);