// Function to start previewing a beatmap
function startpreview(box) {
    // Set initial volume
    let volume = 1;

    // Check for window.gamesettings and adjust volume accordingly
    if (window.gamesettings) {
        volume = (window.gamesettings.mastervolume / 100) * (window.gamesettings.musicvolume / 100);
        volume = Math.min(1, Math.max(0, volume));
    }

    // Stop any currently playing audio using a loop
    for (let audio of document.getElementsByTagName("audio")) {
        if (audio.softstop) {
            audio.softstop();
        }
    }

    // Create audio element and source for the preview
    const audio = document.createElement("audio");
    const source = document.createElement("source");
    console.log("pazinga");
    source.src = `https://cdn.sayobot.cn:25225/preview/${box.sid}.mp3`;
    source.type = "audio/mpeg";
    audio.appendChild(source);

    // Set initial volume to 0 and start playing
    audio.volume = 0;
    audio.play();
    document.body.appendChild(audio);

    // Function to gradually increase volume
    const fadeIn = setInterval(() => {
        if (audio.volume < volume) {
            audio.volume = Math.min(volume, audio.volume + 0.05 * volume);
        } else {
            clearInterval(fadeIn);
        }
    }, 30);

    // Function to gradually decrease volume and remove audio
    const fadeOut = setInterval(() => {
        if (audio.currentTime > 9.3) { // Assuming preview is 10 seconds long
            audio.volume = Math.max(0, audio.volume - 0.05 * volume);
        }
        if (audio.volume === 0) {
            clearInterval(fadeOut);
            audio.remove();
        }
    }, 30);

    // Soft stop function for the audio element
    audio.softstop = function () {
        const fadeOutInterval = setInterval(() => {
            audio.volume = Math.max(0, audio.volume - 0.05 * volume);
            if (audio.volume === 0) {
                clearInterval(fadeOutInterval);
                audio.remove();
            }
        }, 10);
    };
}
function startdownload(box) {
    startpreview(box);
    if (box.downloading) {
        return;
    }

    const sid_string = String(box.sid);

    const part2 = sid_string.slice(-4);
    const part1 = sid_string.substring(0, sid_string.length - 4);

    const filename = `${box.sid} ${box.setdata.title}`;
    
    const url = `https://a.sayobot.cn/beatmaps/${part1}/${part2}/mini?filename=${encodeURIComponent(filename)}`;

    box.downloading = true;
    box.classList.add("downloading");
    console.log("downloading");
    console.log(url);

    const container = document.createElement("div");
    container.className = "download-progress";
    const title = document.createElement("div");
    title.className = "title";
    title.innerText = box.setdata.title;
    const bar = document.createElement("progress");
    bar.max = 1;
    bar.value = 0;

    container.appendChild(title);
    container.appendChild(bar);

    const statuslines = document.getElementById("statuslines");
    if (statuslines) {
        statuslines.insertBefore(container, statuslines.children[3]);
    } else {
        console.error("statuslines element not found");
    }

    box.download_starttime = new Date().getTime();

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const contentLength = response.headers.get('content-length');
            if (!contentLength) {
                throw new Error("Content-Length header is missing");
            }

            const total = parseInt(contentLength, 10);
            let loaded = 0;
            bar.max = total;

            const reader = response.body.getReader();
            const chunks = [];

            function read() {
                return reader.read().then(({ done, value }) => {
                    if (done) {
                        return;
                    }

                    loaded += value.length;
                    bar.value = loaded;

                    chunks.push(value);
                    return read();
                });
            }

            return read().then(() => {
                return new Blob(chunks);
            });
        })
        .then(blob => {
            box.oszblob = blob;
            bar.className = "finished";
            box.classList.remove("downloading");
        })
        .catch(error => {
            console.error("Download failed:", error);
            alert("Beatmap download failed. Please retry later.");
            box.downloading = false;
            box.classList.remove("downloading");
        });
}
