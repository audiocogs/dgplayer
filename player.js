DGPlayer = (function() {
    
    // Get elements
    var root = document.querySelector(".player"),
        events = {},
        state = 'paused';
    
    // Preload images
    new Image().src = "resources/playbutton_active.png";
    new Image().src = "resources/pausebutton.png";
    new Image().src = "resources/pausebutton_active.png";
    
    // Prevent text selection in IE
    root.onselectstart = function() {
        return false
    }
    
    var progressIndicator = (function() {
        
        var canvas = root.querySelector("canvas"),
            ctx = canvas.getContext("2d"),
            grad = ctx.createLinearGradient(0, 0, 90, 90),
            bufferProgress = 0, isVisible = false;
            
        grad.addColorStop(0, "#A0CFD9");
        grad.addColorStop(1, "#61A7BA");
        ctx.lineWidth = 10;
        ctx.strokeStyle = grad;
        
        function render() {
            ctx.clearRect(0, 0, 90, 90);
            ctx.beginPath();
            ctx.arc(45, 45, 39, Math.PI * 1.5, 2 * Math.PI * (bufferProgress / 100) + Math.PI * 1.5, false);
            ctx.stroke();
        }
        
        return {
            getValue: function() {
                return bufferProgress;
            },
            
            setVisible: function(visible) {
                if (visible && !isVisible)
                    canvas.classList.remove("hidden");
                else if (isVisible)
                    canvas.classList.add("hidden");
                    
                isVisible = visible;
            },
            
            setValue: function(progress) {
                bufferProgress = Math.max(0, Math.min(100, progress));
                render();
            }
        }
        
    })();
    
    var timer = (function() {
        
        var counter = root.querySelector(".counter"),
            interval = null, startTime = Date.now(), small = false;
            
        function pad(input) {
            return ("00" + input).slice(-2);
        }
        
        function update() {
            var t = (Date.now() - startTime) / 1000,
                seconds = Math.floor(t % 60),
                minutes = Math.floor((t /= 60) % 60),
                hours = Math.floor((t /= 60) % 24);
                
            if (hours > 0) {
                minutes = pad(minutes);
                if (!small) {
                    counter.classList.add("small");
                    small = true;
                }
            }
            else if (small) {
                counter.classList.remove("small");
                small = false;
            }

            counter.innerHTML = (hours > 0 ? hours + ':' : '') + minutes + ':' + pad(seconds);
        }
                
        return {
            getStartTime: function() {
                return startTime;
            },
            
            setStartTime: function(time) {
                startTime = time;
            },
            
            start: function() {
                if (interval) return;
                update();
                counter.classList.add("visible");
                interval = setInterval(update, 1000);
            },
            
            stop: function() {
                if (!interval) return;
                
                small = false;
                counter.classList.remove("visible");
                setTimeout(function() {
                    counter.classList.remove("small");
                }, 350);
                
                clearInterval(interval);
                interval = null;
            }
        };
        
    })();
    
    var playpause = (function() {
        
        var button = root.querySelector(".button"),
            interval = null, playing = false;
            
        button.onclick = function() {
            emit(playing ? "pause" : "play");
        }
        
        function setPlaying(play) {
            if (playing = play)
                button.classList.add("pause");
            else
                button.classList.remove("pause");
        }
        
        return {
            setPlaying: setPlaying,
            getPlaying: function() {
                return playing;
            }
        }
        
    })();
    
    var slider = (function() {
        
        var handle = root.querySelector(".volume .handle"),
            progress = root.querySelector(".volume .progress"),
            track = root.querySelector(".volume .track")
            volumeLeft = root.querySelector(".volume img:first-child"),
            volumeRight = root.querySelector(".volume img:last-child");
            
        var lastX = 0, 
            down = false, 
            curX = 250 / 2 - 11,
            min = -5,
            max = 250 - 16,
            value = 50;
            
        function update(dontEmit) {
            if ('webkitTransform' in handle.style)
                handle.style.webkitTransform = "translate3d(" + curX + "px" + ", 0, 0)";
            else
                handle.style.left = curX + "px";

            progress.style.width = curX + 10 + "px";
            value = Math.round((curX + 5) / (250 - 11) * 100);
            
            if (!dontEmit)
                emit("volume", value);
        }
        update();
        
        handle.onmousedown = handle.ontouchstart = function(e) {
            lastX = e.targetTouches ? e.targetTouches[0].pageX : e.clientX;
            down = true;
            e.stopPropagation();
            handle.classList.add("active");
            e.preventDefault();
        }
        
        function onMove(e) {
            var eventX = e.targetTouches ? e.targetTouches[0].pageX : e.clientX;
            var x = Math.max(min, Math.min(max, curX + eventX - lastX));
            if (!down || x === curX) return;

            curX = x;
            lastX = eventX;
            update();
        }
        
        function onUp(e) {
            if(!down) return;
            down = false;
            handle.classList.remove("active");
        }
        
        document.addEventListener("mousemove", onMove, false);
        document.addEventListener("touchmove", onMove, false);
        document.addEventListener("mouseup", onUp, false);
        document.addEventListener("touchend", onUp, false);
        
        // Handle clicking on the minimum and maximum volume icons
        function animate() {
            handle.classList.add("animatable");
            progress.classList.add("animatable");

            update();

            setTimeout(function() {
                handle.classList.remove("animatable");
                progress.classList.remove("animatable");
            }, 250);
        }
        
        volumeLeft.onclick = function() {
            curX = min;
            animate();
        }

        volumeRight.onclick = function() {
            curX = max;
            animate();
        }

        // Handle clicking on the track
        track.onmousedown = track.ontouchstart = function(e) {
            var x = e.targetTouches ? e.targetTouches[0].pageX : e.clientX;
            curX = Math.max(min, Math.min(max, x - track.offsetLeft - 13));
            handle.onmousedown(e);
            update();
        }
        
        return {
            getValue: function() {
                return value;
            },
            
            setValue: function(val) {
                val = Math.max(0, Math.min(100, val));
                curX = (val / 100) * (250 - 11) - 5;
                update(true);
            }
        }
        
    })();
    
    function emit(event) {
        if (!events[event]) return;
        
        var args = Array.prototype.slice.call(arguments, 1),
            callbacks = events[event];
            
        for (var i = 0, len = callbacks.length; i < len; i++) {
            callbacks[i].apply(null, args);
        }
    } 
    
    var API = {
        on: function(event, fn) {
            events[event] || (events[event] = []);
            events[event].push(fn);
        },
        
        off: function(event, fn) {
            var events = events[event],
                index = events.indexOf(fn);
                
            ~index && events.splice(index, 1);
        }
    };
    
    Object.defineProperty(API, "bufferProgress", {
        get: progressIndicator.getValue,
        set: progressIndicator.setValue
    });
    
    Object.defineProperty(API, "state", {
        set: function(newstate) {
            progressIndicator.setVisible(newstate == 'buffering');
            playpause.setPlaying(newstate == 'playing' || newstate == 'buffering');
            
            if (newstate == 'playing')
                timer.start();
            else if (state == 'playing')
                timer.stop();
                
            state = newstate;
        },
        
        get: function() { 
            return state;
        }
    });
    
    Object.defineProperty(API, "startTime", {
        get: timer.getStartTime,
        set: timer.setStartTime
    });
    
    Object.defineProperty(API, "volume", {
        get: slider.getValue,
        set: slider.setValue
    });
    
    var img = root.querySelector(".avatar img");
    Object.defineProperty(API, "coverArt", {
        get: function() {
            return img.src;
        },
        
        set: function(src) {
            img.src = src;
        }
    });
    
    var title = root.querySelector("p"),
        artist = root.querySelector("span");
        
    Object.defineProperty(API, "songTitle", {
        get: function() {
            return title.innerHTML;
        },
        
        set: function(val) {
            title.innerHTML = val;
        }
    });
    
    Object.defineProperty(API, "songArtist", {
        get: function() {
            return artist.innerHTML;
        },
        
        set: function(val) {
            artist.innerHTML = val;
        }
    });
    
    return API;
    
})();