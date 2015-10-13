function loadedImage(filename) {
    this.isLoaded = false;
    this.image = new Image();
    var that = this;
    this.image.onload = function () {
        that.isLoaded = true;
    };
    this.image.src = filename;
}

loadedImage.prototype = {
    drawImageAtXY: function(context, x, y) {
        if(this.isLoaded) {
            context.drawImage(this.image, x, y);
        }
    }
};

var canvas = document.createElement("canvas");
var context = canvas.getContext("2d");
canvas.width = 466;
canvas.height = 754;
document.getElementById("game").appendChild(canvas);

var relativeMousePosition = {x:0, y:0};
var clickOccured = false;
var doubleClickOccured = false;
var guessTimer = 0;
var playerNumber = 0;
var turnNumber = 0;

var gameInProgress = true;

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: Math.round((evt.clientX-rect.left)/(rect.right-rect.left)*canvas.width),
        y: Math.round((evt.clientY-rect.top)/(rect.bottom-rect.top)*canvas.height)
    };
}
function pointInsideCard(cardPosition, point) {
    if((point.x > cardPosition.x+14) && (point.x <= cardPosition.x+142)) {
        if((point.y > cardPosition.y+10) && (point.y <= cardPosition.y+202)) {
            return true;
        }
    }
    return false;
}

canvas.addEventListener('mousemove', function(evt) {
    relativeMousePosition = getMousePos(canvas, evt);
}, false);

canvas.addEventListener('click', function(evt) {
    evt.preventDefault();
    relativeMousePosition = getMousePos(canvas, evt);
    clickOccured = true;
}, false);

canvas.addEventListener('dblclick', function(evt) {
    evt.preventDefault();
    relativeMousePosition = getMousePos(canvas, evt);
    doubleClickOccured = true;
}, false);

tableau = [0,0,0,0,0,0,0];

tableauSelections = [false,false,false,false,false,false,false];

TABLEAU_LOCATIONS = [ {x:80, y:0}, {x:224, y:0},
                     {x: 16, y: 216}, {x: 160, y: 216}, {x: 304, y: 216},
                     {x:80, y: 432}, {x:224, y: 432}];
CARD_IMAGE_LIBRARY = [];

playerColorList = ["purple", "red", "orange", "yellow", "green", "blue"];

for(var i=0; i < 64; i++)
{
    var cardImage = new loadedImage(String(i)+".png");
    CARD_IMAGE_LIBRARY.push(cardImage);
}

var selectedImage = new loadedImage("selectionMask.png");
var hoverImage = new loadedImage("hoverMask.png");

var guessButton = new loadedImage("GuessButtonValid.png");
var highlightedGuessButton = new loadedImage("GuessButtonHighlighted.png");
var invalidGuessButton = new loadedImage("GuessButtonInvalid.png");
var update = function (time) {
    
    if(clickOccured) {
        for(var i = 0; i < TABLEAU_LOCATIONS.length; i++) {
            if(pointInsideCard(TABLEAU_LOCATIONS[i],relativeMousePosition)) {
                if(tableauSelections[i]) {
                    tableauSelections[i] = false;
                } else {
                    tableauSelections[i] = true;
                }
            }
        }
        if(relativeMousePosition.y > 654) {
            doubleClickOccured = true;
        }
        clickOccured = false;
    }
    
    if(doubleClickOccured) {
        var selection = [];
        for(var i = 0; i < tableauSelections.length; i++) {
            if(tableauSelections[i]) {
                selection.push(i);
            }
        }

        if((selection.length > 0) && (guessTimer == 0)) {
            guessTimer = 50;
            socket.emit("guess", [selection, turnNumber]);
            tableauSelections = [false,false,false,false,false,false,false];
        }

        doubleClickOccured = false;
    }
    
    if(guessTimer > 0) {
        guessTimer--;
    }
    
}

var draw = function () {
    context.clearRect(0,0,canvas.width, canvas.height);

    for(var i = 0; i < tableau.length; i++) {
        var cardID = CARD_IMAGE_LIBRARY[tableau[i]];
        if(cardID) {
            (cardID).drawImageAtXY(context, (TABLEAU_LOCATIONS[i]).x, (TABLEAU_LOCATIONS[i]).y);
        }
    }
    
    for(var i = 0; i < tableau.length; i++) {
        if(tableauSelections[i]) {
            selectedImage.drawImageAtXY(context, (TABLEAU_LOCATIONS[i]).x, (TABLEAU_LOCATIONS[i]).y);
        }
        
        if(pointInsideCard(TABLEAU_LOCATIONS[i], relativeMousePosition)) {
            hoverImage.drawImageAtXY(context, (TABLEAU_LOCATIONS[i]).x, (TABLEAU_LOCATIONS[i]).y); 
        }
        
    }

    if(guessTimer > 0) {
        invalidGuessButton.drawImageAtXY(context, 0, 654);
    } else {
        if(relativeMousePosition.y > 654) {
            highlightedGuessButton.drawImageAtXY(context, 0, 654);
        } else {
            guessButton.drawImageAtXY(context, 0, 654);
        }
    }
}

// The main game loop
var main = function () {
    var now = Date.now();
    var delta = now - then;

    update(delta / 1000);
    draw();

    then = now;

    // Request to do this again ASAP
    requestAnimationFrame(main);
};

// Cross-browser support for requestAnimationFrame
var w = window;
requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;

// Let's play this game!
var then = Date.now();
main();

var URL = window.location.href;
URL = URL.split("/");
var ID = URL[URL.length-1];
var socket = io();
socket.emit('room ID', ID);

socket.on("join game", function(assignedNumber){
    playerNumber = assignedNumber;
    document.getElementById("playerNumber").style.color = playerColorList[playerNumber % 6];
    document.getElementById("playerNumber").innerHTML = "Player "+String(playerNumber);
});

socket.on("update", function(gameData){
    tableau = gameData[0];
    updateScoreboard(gameData[1]);
    var newTurnNumber = gameData[2];
    if(newTurnNumber != turnNumber) {
        guessTimer = 0;
        turnNumber = newTurnNumber;
        tableauSelections = [false,false,false,false,false,false,false];
    }
});

socket.on("game over", function() {
    gameInProgress = false;
});

function updateScoreboard(playerList) {
    var oldScoreboard = document.getElementById("scores");
    var scoreboard = document.createElement("UL");
    scoreboard.id = "scores";
    for(key in playerList) {
        var playerData = playerList[key];
        var score = playerData[1];
        var prefix = "Player ";
        if((playerData[0]==playerNumber)) {
            prefix = prefix+String(playerData[0])+" (you): ";
        } else if(!(playerData[2])){
            prefix = prefix+String(playerData[0])+" (offline): ";
        } else {
            prefix = prefix+String(playerData[0])+": ";
        }   
        var prefixDiv = document.createElement("div");

        prefixDiv.innerHTML = prefix;
        prefixDiv.style.color = playerColorList[(playerData[0] % 6)];
        prefixDiv.style.fontweight = "bold";
    
        var scoreNode = document.createTextNode(String(score)+" points");
        var individualScore = document.createElement("LI");
    

        individualScore.appendChild(prefixDiv);
        individualScore.appendChild(scoreNode);

        scoreboard.appendChild(individualScore);
    }   
    var scoreboardDiv = document.getElementById("scoreboard");
    scoreboardDiv.replaceChild(scoreboard, oldScoreboard);
}

socket.on("chat message", function(msgData){
    if(msgData[0] == 0) {
        var prefix = "";
    } else {
        var prefix = "Player ";
        if((msgData[0]==playerNumber)) {
            prefix = prefix+String(msgData[0])+" (you): ";
        } else {
            prefix = prefix+String(msgData[0])+": ";
        }

    }
    var msg = msgData[1];
    
    var prefixDiv = document.createElement("div");
    prefixDiv.innerHTML = prefix;
    prefixDiv.style.color = playerColorList[(msgData[0] % 6)];
    prefixDiv.style.fontweight = "bold";

    var messageNode = document.createElement("LI");
    var messageText = document.createTextNode(msg);
    
    messageNode.appendChild(prefixDiv);
    messageNode.appendChild(messageText);

    document.getElementById("messages").appendChild(messageNode);
});

document.getElementById("messagebox").onsubmit=function(e) {
    e.preventDefault();
    e.stopPropagation();
    var message = [playerNumber, document.getElementById("chatbox").value];
    document.getElementById("chatbox").value = "";
    socket.emit("chat message", message);
    return false;
}
