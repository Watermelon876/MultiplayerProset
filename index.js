var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var opengames=[];
var allsockets={};

app.use(express.static(__dirname+"/resources"));
app.use(express.static(__dirname+"/clientSide"));

app.get('/', function(req,res) {
    res.sendFile(__dirname+'/start.html');
});

app.get('/:ID/', function(req, res) {
    res.sendFile(__dirname+'/index.html');
});

function getGame(gameID) {
    for(var i = 0; i < opengames.length; i++){
        if((opengames[i]).ID() == gameID) {
            return opengames[i];
        }
    }
    
    console.log('attempting to make new Game');
    var newGame = new ProsetGame(gameID);
    opengames.push(newGame);
    console.log('opened new game');
    console.log(opengames);
    return newGame;
}

function clearGames() {
    var games_ = new Array();
    for(var i = 0; i < opengames.length; i++) {
        var gameIsEmpty = (opengames[i]).isEmpty();
        console.log(gameIsEmpty);
        if(!(gameIsEmpty)) {
            games_.push(opengames[i]);
        }
    }
    opengames = games_;
}

function getIDs() {
    var IDlist = [];
    for(var i = 0; i < opengames.length; i++) {
        IDlist.push((opengames[i]).ID());
    }
    console.log(IDlist);
    return IDlist;
}

io.on('connection', function(socket){
    console.log('a user connected');
    var ID_ = "";
    var notFoundGame_ = true;

    socket.on('room ID', function(gameID)
    {
        if(notFoundGame_) {
            console.log('joining game '+gameID);
            socket.join(gameID);
            var currentGame_ = getGame(gameID);
            currentGame_.addPlayer(socket, io);
            currentGame_.update(io);
            
            ID_=gameID;
            notFoundGame_=false;

            var gameIDlist = getIDs();
            io.emit('game list', gameIDlist);
        }
    });

    socket.on('chat message', function(msg)
    {
        io.to(ID_).emit('chat message', msg);
    });

    socket.on('guess', function(guessData) {
        console.log(ID_);
        guessData.push(socket);
        var currentGame_ = getGame(ID_);
        currentGame_.TestProset(guessData, io);
    });

    socket.on('disconnect', function(){
        var currentGame_ = getGame(ID_);
        currentGame_.removePlayer(socket, io);
        currentGame_.update(io);
        clearGames();
    });

    socket.on('get games', function(){
        var gameIDlist = getIDs();
        io.emit('game list', gameIDlist);
    });

});

http.listen(80, function(){
    console.log('listening on *:80');
});

//This provides a class for a ProsetDeck
function ProsetDeck() {
    this.NUM_CARDS = 15; 
    var that_ = this;
    var deck_ = new Array(that_.NUM_CARDS);

    var RandomInt_ = function(n) {
        return Math.floor(Math.random()*n);
    };

    var SwapCards_ = function(position1, position2) {
        //Only works for values of types like int that are passed by value
        var temp = deck_[position1];
        deck_[position1] = deck_[position2];
        deck_[position2] = temp;
    };
    
    //Cards are represented by integers 1-63
    this.GenerateNewDeck = function() {
        deck_ = new Array();
        for(var i=0; i < that_.NUM_CARDS; i++) {
            deck_.push(i+1);
        }
        that_.Shuffle();
    };
    
    this.Shuffle = function() {
        for(var i=0; i < that_.NUM_CARDS; i++) {
            var swapped_number = i+RandomInt_(that_.NUM_CARDS-i);
            SwapCards_(i, swapped_number);
        }   
    };
    
    this.NextCard = function() {
        if(deck_.length > 0) {
            return deck_.pop();
        }
        else{
            return undefined;
        }
    };

    this.isEmpty = function() {
        return deck_.length==0;
    };
    
    this.GenerateNewDeck();
};
function ProsetGame(gameID) {
    var gameDeck_ = new ProsetDeck(); //Private variable
    this.cardsInPlay = new Array();
    this.NUM_CARDS_IN_PLAY = 7;
    var turnNumber_ = 0;
    var ID_ = gameID;
    var that_ = this;
    var playerList_ = {}; 
    var scoreList_ = {}; 
    var numPlayers_ = 0;
    var playerNumber_ = 0;
    var gameOver_ = false;

    for(var i=0; i < this.NUM_CARDS_IN_PLAY; i++) {
        var topCard = gameDeck_.NextCard();
        //console.log(topCard);
        that_.cardsInPlay.push(topCard);
    }   
    //Places the correct number of cards into play

    var ReplaceCard_ = function(cardID) {
        if(gameDeck_.isEmpty()) {
            console.log('out of cards');
            gameOver_ = true;
        } else { 
            that_.cardsInPlay[cardID] = gameDeck_.NextCard();
        }   
    }; //Private member function

    var ReplaceCards_ = function(cardIDs) {
        for(var i = 0; i < cardIDs.length; i++) {
            ReplaceCard_(cardIDs[i]);
        }   
    }; //Private member function

    var ProsetSum_ = function(cardIDs)
    {
        console.log(that_.cardsInPlay);
        var accum = 0;
        for(var i = 0; i < cardIDs.length; i++) {
            var currentCardID = cardIDs[i];
            var cardInPlay = (that_.cardsInPlay)[currentCardID];
            console.log(cardInPlay);
            accum ^= cardInPlay;
        }
        console.log(accum);
        return accum;
    }   
       
    this.update = function(io) {
        //console.log(that_.cardsInPlay);
        var gameData = [that_.cardsInPlay, scoreList_, turnNumber_];
        io.to(this.ID()).emit("update", gameData);
    };  

    var ValidateProset_ = function(cardIDs) {
        //console.log(cardIDs);
        if(cardIDs.length == 0  || gameOver_ ) {
            return false;
        } else {
            return ProsetSum_(cardIDs)==0;
        }   
    };  

    this.TestProset = function(guessData, io) {
        var cardIDs = guessData[0];
        var turnNumber = guessData[1];
        var socketID = (guessData[2]).id;
        var playerID = playerList_[socketID];
    
        console.log(playerList_);
        console.log(scoreList_);
        
        /*
        if(turnNumber_!=turnNumber) {
            return;
        }
        */

        console.log(that_.cardsInPlay);

        if(ValidateProset_(cardIDs)) {
            ReplaceCards_(cardIDs);
            turnNumber_++;
            (scoreList_[playerID])[1]+=cardIDs.length;
            io.to(that_.ID()).emit("chat message",[0, "Player "+(scoreList_[playerID])[0]+" got a proset of size "+cardIDs.length]);
            if(gameOver_) {
                io.to(that_.ID()).emit("game over");;
            }
            that_.update(io);
        } else {
            io.to(socketID).emit("chat message",[0, "Wrong guess! Try again."]);
        }
    };

    this.ResetGame = function() {
        gameDeck_ = new ProsetDeck();
        turnNumber_=0;
        for(var i=0; i < that.NUM_CARDS_IN_PLAY; i++) {
            that.cardsInPlay.push(gameDeck_.NextCard());
        }
        for(player in scoreList_) {
            var playerData = scoreList_[player];
            playerData[1] = 0;
        }
    };

    this.ID = function() {
        return ID_;
    };

    this.addPlayer = function(socket, io) {
        var socketID = socket.id;
        var socketIP = socket.request.connection.remoteAddress;
        var currPlayerNumber = 0;
        if(scoreList_[socketIP])
        {
            //This is a new session for an old player
            (scoreList_[socketIP])[2]=true;
            currPlayerNumber = (scoreList_[socketIP])[0];
        } else {
            //This is an entirely new player
            playerNumber_++;
            scoreList_[socketIP] = [playerNumber_, 0, true];
            currPlayerNumber = playerNumber_;
        }
        playerList_[socketID]=socketIP;
        io.to(that_.ID()).emit("chat message", [0,"Player "+playerNumber_+" joined!"]);
        io.to(socketID).emit("join game", playerNumber_);
        numPlayers_++;
    };

    this.removePlayer = function(socket, io) {
        var socketID = socket.id;
        
        if(socketID in playerList_) {
            var playerIP = playerList_[socketID];
            //check if this is the last connection from that IP
            var isLastConnection = true;
            for(player in playerList_) {
                if(player != socketID) {
                    if((playerList_[player])==playerIP) {
                        isLastConnection = false;
                    }
                }
            }
            (scoreList_[playerIP])[2]=!(isLastConnection);
            if(isLastConnection) {
                console.log("Removing last connection for player");
                numPlayers_--;
                io.to(this.ID()).emit("chat message", [0,"Player "+(scoreList_[playerIP])[0]+" left."]);
            }

            //then delete connection
            delete playerList_[socketID];
        }
    };

    this.isEmpty = function() {
        return numPlayers_ == 0;
    };

    this.isInPlay = function() {
        return !(gameOver_);
    };
};

