function embedImage(imageSrc) {
    //This formatting is copied directly from thebombzen with slight modifications to make use of the DOM structure in HTML5
    
    var banner = document.createElement("DIV");
    banner.style.position = "fixed";
    banner.style.width = "100%";
    banner.style.margin = "0 0 0 -50%";
    banner.style.left = "50%";
    banner.style.visibility = "hidden";
    banner.style.textAlign = "center";
    banner.style.top = "15%";
    banner.onclick = function() {
        banner.style.visibility = "hidden";
    }
    
    var image = document.createElement("IMG");
    image.src = imageSrc;
    banner.appendChild(image);

    return banner;
}

function codeImagePair(combination, imageSrc) {
    var progress  = 0;
    var totalKeystrokes = combination.length;

    var image = embedImage(imageSrc);
    document.body.appendChild(image);

    var processInput = function(keyCode) {
        if(combination[progress] == keyCode) {
            progress++;
            if(progress >= totalKeystrokes) {
                image.style.visibility = "visible";
                progress = 0;
            }
        } else {
            progress = 0;
        }
    }
    
    var eventListener = function(e) {
        e = e || window.event;
        processInput(e.keyCode);
    }
    
    document.addEventListener("keydown", eventListener, false);
}

