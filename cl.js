var ws;
var video = videojs("videoPlayer");
var currentlyWatchingName = "";
var inputElement = document.getElementById('deviceIP');
var deviceSection = $('#device-section');
var currentlyPlayingJsonObject = null;
var currentlyPlayingSubtitles = "";

inputElement.onkeydown = function(e){
    if (e.keyCode === 13){
        try{
            ws.close();
            inputElement.blur(); 
            console.log('enter clicked');

        }
        catch(err){
            console.log(err);
        }
    }
};

function animateRotate(angle) {
    // caching the object for performance reasons
    var $elem = $('#submit');

    // we use a pseudo object for the animation
    // (starts from `0` to `angle`), you can name it as you want
    $({deg: 0}).animate({deg: angle}, {
        duration: 2000,
        step: function(now) {
            // in the step-callback (that is fired each step of the animation),
            // you can use the `now` paramter which contains the current
            // animation-position (`0` up to `angle`)
            $elem.css({
                transform: 'rotate(' + now + 'deg)'
            });
        }
    });
}
function refresh(){
	
	animateRotate(360);
	try{
        ws.close();
        inputElement.blur(); 
        console.log('enter clicked');

    }
    catch(err){
        console.log(err);
    }
};

getIpFromCookie();
start();

video.on("pause", function () {
    sendPlayState(0);
});

video.on("play", function () {
    sendPlayState(1);
});

video.on("volumechange", function () {
    sendVolumeChange(video.volume());
});


video.on("ended", function () {
    sendVolumeChange(video.volume());
});


function saveIpToCookie(){
        var today = new Date();
        var expiry = new Date(today.getTime() + 365 * 24 * 3600 * 1000); // plus 30 days
        document.cookie="deviceip" + "=" + escape(inputElement.value) + "; path=/; expires=" + expiry.toGMTString();
}

function getIpFromCookie(){
    inputElement.value = getCookie('deviceip');
}

function getCookie(name){
    var re = new RegExp(name + "=([^;]+)");
    var value = re.exec(document.cookie);
    return (value != null) ? unescape(value[1]) : null;
}

function removeSubs(){
    try{
        var tracks = video.textTracks();
        for (i = 0; i<tracks.length;i++) {
          video.removeRemoteTextTrack(tracks[i]);
        }
    }
    catch(err){
        console.log(err);
    }

}


function sendPlayState(state){
    try{
        var jsonData = {action: 'playState', playState: state};
        var json = JSON.stringify(jsonData);
        ws.send(json);
    }
    catch(err){
        console.log('Not connected to device or error sending');
    }


}

function sendVolumeChange(volumePercent){
	try{
        var jsonData = {action: 'volumeChange', volume: volumePercent};
        var json = JSON.stringify(jsonData);
        ws.send(json);
	}
	catch(err){
        console.log('Cant send volume');

	}
}

function sendPlaybackEnded(){
	try{
        var jsonData = {action: 'playbackEnded'};
        var json = JSON.stringify(jsonData);
        ws.send(json);
	}
	catch(err){
        console.log('Cant send playback ended notification');

	}
}

function processMessage(json){
    var action = json.action;

    if (action === 'setDeviceInfo'){
        var device = json.device;
        document.getElementById('device-section').style.backgroundColor = 'green';
        document.getElementById('deviceName').innerHTML = device;
        saveIpToCookie();
    }

    if (action === 'togglePlay'){
        var playState = json.state;

        if (playState == 1){
            video.play();
        }
        else{
            video.pause();
        }
    }

    if (action === 'load'){

        var url = json.url;
        var source = document.getElementById('videoSource');
        var shouldContinue = json.shouldContinue;
        var lastPos = json.lastPos;
        var videoName = json.name;
        var poster = json.poster;
        
        //var subtitles = json.subtitles;
        currentlyPlayingJsonObject = json.jsonObject;
        console.log('received url = '+url);
        if (currentlyWatchingName!= videoName){
            currentlyWatchingName = videoName;
            this.currentlyPlayingSubtitles = "";

            video.poster(poster);

            removeSubs();

            video.pause();
            video.src({src: url, type: getMimeType(url)});
            video.load();
            video.play();

            if (lastPos!=0){
                video.currentTime(lastPos);

            }

        }

        //notify the user of the current volume 
        sendVolumeChange(video.volume());


    }

    if (action === 'loadWithSubs'){

        var url = json.url;
        var source = document.getElementById('videoSource');
        var track = document.getElementById('videoSubs');
        var shouldContinue = json.shouldContinue;
        var lastPos = json.lastPos;
        var videoName = json.name;
        var poster = json.poster;
        var subtitles = json.subtitles;
        var subtitlesLang = json.language;
        
        //set the currently watching object
        currentlyPlayingJsonObject = json.jsonObject;

        console.log('subtitles = '+subtitles);

        if (currentlyWatchingName!= videoName || subtitles!=currentlyPlayingSubtitles ){
            this.currentlyPlayingSubtitles = subtitles;
            this.currentlyWatchingName = videoName;
            var currentPos = video.currentTime();
            video.poster(poster);

            video.pause();
            video.src({src: url, type: getMimeType(url)});
            removeSubs();
            video.addRemoteTextTrack({
              kind: 'captions',
              src: 'data:text/srt;base64,'+subtitles,
              srclang: subtitlesLang,
              label: 'Subtitles ON',
              charset: 'UTF-8'
            },true);
            video.load();
            video.play();

            if (lastPos!=0){
                video.currentTime(lastPos);

            }
            
            if (currentlyWatchingName == videoName){
            	video.currentTime(currentPos);
            }
            
            video.textTracks()[0].mode = "showing";

        }

        
        //notify the user of the current volume 
        sendVolumeChange(video.volume());



    }

    if (action === 'closeConnection'){
        ws.close();

    }

    if(action ===  'seek'){
        var seekTo = json.seekTo;
        video.currentTime(seekTo);
    }

    if (action ===  'playRate'){
        var rate = json.rate;
        video.playbackRate( rate )
    }

    if (action === 'volume'){
        var toSet = json.volume;
        video.volume(toSet);
    }

    if (action === 'toggleFullscreen'){
        $('.vjs-fullscreen-control').click();
    }

    if (action === 'forceReload'){
        var url = json.url;
        var source = document.getElementById('videoSource');
        var lastPos = json.lastPos;
        var videoName = json.name;


        currentlyWatchingName = videoName;

        removeSubs();

        video.pause();
        video.src({src: url, type: getMimeType(url)});
        video.load();
        video.play();
        video.currentTime(lastPos);
    }
    
    if (action === 'changeSource'){
        var url = json.url;
        var currentPosOfVideo = video.currentTime();
        
        
        video.pause();
        video.src({src: url, type: getMimeType(url)});
        video.load();
        video.play();
        
        video.currentTime(currentPosOfVideo);
    }
}

function deviceDisconnected(){

    document.getElementById('device-section').style.backgroundColor = 'red';
    document.getElementById('deviceName').innerHTML = 'Disconnected';
}


function getVideoDataJSON(){
    var lengthOfVideo = video.duration();
    var currentPos = video.currentTime();
    var buff = video.bufferedEnd();

    var jsonData = {action: 'updatePosition', pos: currentPos, total: lengthOfVideo, buffered: buff};

    return JSON.stringify(jsonData);

}

function start(){
    var ip = document.getElementById('deviceIP').value;
    if (ip===''){
        ip = 'localhost'
    }
    var serverIP = 'ws://'+ip+':1466';

    console.log('Attempting server connect to : '+serverIP);
    ws = new WebSocket(serverIP);

    ws.onmessage = function(event) { 
        var jsonMsg = JSON.parse(event.data);

        try{
            processMessage(jsonMsg);

        }
        catch(err){
            console.log(err)
        }

        console.log(jsonMsg);
    };


    ws.onerror = function(event){
        deviceDisconnected();

    }

    ws.onclose = function(){
        deviceDisconnected();

        //try to reconnect in 5 seconds
    };


}

function getMimeType(url){
	var defaultType = "video/mp4";
	if (url.includes("m3u8") || url.endsWith(".m3u8")){
		defaultType = "application/x-mpegURL";
	}
	if (url.includes("mega.nz") || url.endsWith("?cmd=openinexternal")){
        url=url.replace("?cmd=openinexternal","")	
	if (confirm("This Source not Supportd by Our Player.\n Click OK to Open it on new tab")) {
   	window.open(url, '_blank')
 	}
    	}
	return defaultType;
	
}

setInterval(function(){
    try{
        if (currentlyWatchingName!=""){
            ws.send(getVideoDataJSON());
        }

    }
    catch(err){
        console.log(err);
    }

    try{


        if (ws.readyState == ws.CLOSED){
            console.log('Closed socket retrying');
            start();
        }
    }
    catch(err2){
        console.log(err2);
    }

}, 1000);


//load the unsecured version of the page
if (window.location.href.startsWith("https")){window.location.href = "http://cast.3nakib.xyz/"}