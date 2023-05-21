
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class ErrorDelay {
    constructor() {
        this.startingTime = new Date().getTime();
        this.errorCount = 0;
        this.delays = [3, 15, 30, 60];
    }

    restoring() {
        this.startingTime = new Date().getTime();
    }

    async errorAndWait() {
        let currentTime = new Date().getTime();
        if (currentTime - this.startingTime < 5000) {
            this.errorCount++;
        } else {
            this.errorCount = 1;
        }

        var waitTime;
        if (this.errorCount > this.delays.length) {
            waitTime = this.delays[this.delays.length - 1];
        } else {
            waitTime = this.delays[this.errorCount - 1];
        }
        
        console.log(`Waiting ${waitTime} seconds for next try ...`)
        await sleep(waitTime * 1000);
    }
}

module.exports = {
    ErrorDelay: ErrorDelay,   
    sleep: sleep,
}