var express = require('express');
var app = express();



var serv = require('http').createServer(app);
var io = require('socket.io');
var server = io.listen(serv)
var Blocks = require('./blocks')

app.set('port', (process.env.PORT || 5000));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

app.get('/', function (request, response) {
    var result = 'noob noob driller online'
    response.send(result);

})


var universe = [];
var timers = [];
const rows = 15,
    cols = 7;
var colors = ["red", "blue", "green", "purple"];
server.on('connection', (socket) => {
    let sid = socket.id;
    console.log('[connection]', sid);
    socket.emit('handshake', sid);

    socket.on('disconnect', () => {
        universe[sid]=null;
        console.log('[disconnect]', sid);

    });

//Genesis ... In the beginning, God created Heaven and Earth...
    socket.on('genesis', () => {
        console.log('God said: Let there be light! \n[Start Game] from ', sid, 'This is the first day.')
        universe[sid] = build(sid)

        socket.emit('logos', universe[sid]);
    })

//Eden start the game
    socket.on('eden', () => {
        timers[sid] = setInterval(() => {
            revelation(socket, sid)
        }, 50); //tell you the world
    })


//Receive the pray
    socket.on('pray', (msg) => {

        console.log("Received Pray")

        universe[sid].hearPray(msg);
    })

    socket.on('drill', (msg) => {

    universe[sid].drill(msg.toDrill,msg.pos,socket);



    })



    socket.on('apocalypse', (msg) => {

        console.log("Received Doom Day! "+sid+" Losed")

       // universe[sid]=null;
        clearInterval(timers[sid])

    })

});


function revelation(socket, sid) {
    socket.emit('eden', universe[sid]);
}


function world(sid) {


    this.sid = sid;
    this.blocks = [];
    this.adam = {
        row: 5,
        column: 3,
        countdown: 4,
        depth: 2,
        score:0,
        air:100
    }


    for (i = 0; i < cols; i++) {
        this.blocks.push([]); // add second dimensional arrays to each index

    }

    this.drill = function(toDrill,pos,socket){

        // Checks if the thing we are drilling is a drillable block.
        // Everything in colors can be drilled.
        if (canDrill(toDrill)) {
            // Get the group of blocks to be drilled
            let drillGroup = Blocks.getBlockGroup(this.blocks,
                pos[0], pos[1], toDrill.type);

            // Drill that group of blocks
            drillGroup.forEach( (point)=> {
                this.blocks[point.x][point.y] = new Block("empty");
                this.adam.score+=1;
            });
        }else if(toDrill.type==="durable"){
            toDrill.health--;
            this.blocks[pos[0]][pos[1]] = toDrill;
            if(toDrill.health===0){
                this.blocks[pos[0]][pos[1]] = new Block("empty");

                socket.emit('noob');
            }
        }


    }


    this.resetCountdown = function () {
        this.adam.countdown = 4;
    }

    this.addEmptyBlocks = function (depth) {
        for (var d = 0; d < depth; d++) {
            for (var x = 0; x < cols; x++) {
                // pushes a new item onto the beginning of the array
                this.blocks[x].unshift(new Block("empty"));
            }
            if (this.blocks[x] != undefined) {
                if (this.blocks[x].length > rows) {
                    this.blocks[x].pop();
                }
            }
        }

        return this.blocks;
    }

    this.hearPray = function (universe) {
        this.blocks = universe.blocks;
        this.adam = universe.adam;
        this.gravity();
        console.log("Received Pray!", this.adam)
    }


    this.gravity = function () {

        let driller = this.adam
        //check if the driller should fall
        if (this.blocks[driller.column][driller.row - 1].type === "empty" ||
            this.blocks[driller.column][driller.row - 1].type === "air") {
            console.log("Should Fall")
            if (driller.countdown === 0) {
                console.log("Fuckking add blocks")
                this.addBottomBlocks(1, .015,


                    //this argument is the probability of a durable block
                    //essentially this is the function from depth to
                    //difficulty, since durable blocks make it harder
                    Math.pow(driller.depth / 100, 2) /
                    (5 * Math.pow((driller.depth + 300) / 100, 2)));
                driller.depth += 5;
                if (this.blocks[driller.column][driller.row].type === "air") {

                    this.blocks[driller.column][driller.row].type = "empty";
                }
                this.resetCountdown();
            } else {
                driller.countdown -= 1;
            }
        }

        var fallObj = Blocks.blockGravity(this.blocks);
        this.blocks = fallObj.blockGrid;

    }


    this.addBottomBlocks = function (depth, airProbability, durableProbability) {

        let d;
        for (d = 0; d < depth; d++) {
            let x;
            for (x = 0; x < cols; x++) {
                // pushes a new item onto the beginning of the array
                this.blocks[x].unshift(new Block(colors[Math.floor(Math.random() * colors.length)]));
                if (Math.random() < airProbability) {
                    this.blocks[x][0].type = "air";
                } else if (Math.random() < durableProbability) {
                    this.blocks[x][0].type = "durable";
                }
                if (this.blocks[x].length > rows) {
                    this.blocks[x].pop();
                }
            }
        }
        return this.blocks;
    }

    this.fillEmpty = function () {
        console.log("fill NULL")
        var x;
        for (x = 0; x < cols; x++) {
            var y;
            while (this.blocks[x].length < rows) {
                this.blocks[x].push(new Block("empty"));
            }
        }
        for (let i = 0; i < cols; i++) {

            for (let j = 0; j < rows; j++) {
                if (this.blocks[i][j] == null) {
                    console.log("Found null")
                }
                console.log(this.blocks[i][j].type)


            }
        }

        console.log("Finish Fill Empty")
    }


    this.seeTheWorld = function () {


        return this.blocks;


    }


}


function Block(type, state) {
    var countdownFactor = 6;

    //string describing the content of the block
    this.type = type;
    //number of drills until the block is destroyed
    //if the block is a durable block
    this.health = 3;

    if (state === undefined) {
        state = "stationary";
    }
    this.state = state;
    this.countdown = countdownFactor;

    // Pixel offsets used for animations
    this.xOffset = 0;
    this.yOffset = 0;
    this.changeState = function (newState) {
        if (newState === "shaking") {
        this.countdown = countdownFactor + 2;
    } else {
        this.countdown = countdownFactor;
    }
    this.state = newState;
}

}


function canDrill(block) {
    return (colors.indexOf(block.type) > -1);
}

function build(sid) {

    var x = new world(sid);

    x.addEmptyBlocks(2)
    x.addBottomBlocks(5, 0, 0);
    x.fillEmpty();
    return x;

}


serv.listen(process.env.PORT || 5000);