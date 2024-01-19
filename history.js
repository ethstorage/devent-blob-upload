const {ethers} = require("ethers");

const contractAddress = '0xb4B46bdAA835F8E4b4d8e208B6559cD267851051'
// const provider = new ethers.JsonRpcProvider('https://rpc.dencun-devnet-12.ethpandaops.io');

async function history() {
    // const blockNumber = await provider.getBlockNumber();
    // console.log('Current block number:', blockNumber);

    let txCount = 0;
    let totalGas = 0n; //111917550886243458368n;
    let totalGasPrice = 0n; // 5122770336212n;
    let firstHash = null, lastHash = null;

    const count = 500;
    // 17500
    // for (let i = 17500; i < blockNumber; i += count) {
    for (let i = 17500; i < 61000;) {
        let success = true;
        const hashes = [];
        let gasUsed = 0n;
        let gasPrice = 0n;
        try {
            const provider = new ethers.JsonRpcProvider('https://rpc.dencun-devnet-12.ethpandaops.io');
            const filter = {
                address: contractAddress,
                fromBlock: i,
                toBlock: i + count,
                topics: [ethers.id("PutBlob(uint256,uint256,bytes32)")],
            };
            const logs = await provider.getLogs(filter);

            // get tx hash
            for (const log of logs) {
                if (!hashes.includes(log.transactionHash)) {
                    hashes.push(log.transactionHash)
                    if (firstHash == null) {
                        firstHash = log.transactionHash;
                    }
                    lastHash = log.transactionHash;
                }
            }
            console.log("end get hash", hashes.length, "logs length", logs.length)

            // get tx
            let txArr = [];
            for (const hash of hashes) {
                const tx = provider.getTransactionReceipt(hash);
                txArr.push(tx);

                if (txArr.length === 20) {
                    const result = await Promise.all(txArr);
                    for (let tx of result) {
                        gasUsed += tx.gasPrice * tx.gasUsed;
                        gasPrice += tx.gasPrice;
                    }
                    txArr = [];
                    console.log("result", result.length)
                }
            }
            if (txArr.length > 0) {
                const result = await Promise.all(txArr);
                for (let tx of result) {
                    gasUsed += tx.gasPrice * tx.gasUsed;
                    gasPrice += tx.gasPrice;
                }
                console.log("result", result.length)
            }
        } catch (e){
            console.log(e);
            success = false;
        }

        if(success) {
            i += count;
            txCount += hashes.length;
            totalGas += gasUsed;
            totalGasPrice += gasPrice;
        }
        console.log(i, success)
        console.log("total tx count:", txCount);
        console.log("total cost:", totalGas);
        console.log("average gas price:", totalGasPrice);
        console.log();
    }

    const provider = new ethers.JsonRpcProvider('https://rpc.dencun-devnet-12.ethpandaops.io');
    const tx1 = await provider.getTransactionReceipt(firstHash);
    console.log(tx1);
    const tx2 = await provider.getTransaction(lastHash);
    console.log(tx2);
    const block1 = await provider.getBlock(tx1.blockNumber)
    console.log(block1.timestamp);
    const block2 = await provider.getBlock(tx2.blockNumber)
    console.log(block2.timestamp);
    // console.log("first hash:", firstHash);
    // console.log("last hash:", lastHash);
    // console.log("total blob: 8000000");
    // console.log("total tx count:", txCount);
    // console.log("total cost:", ethers.formatEther(totalGas), " ETH");
    // console.log("average gas price:", totalGasPrice / BigInt(txCount));
    // console.log("total time: ", block2.timestamp - block1.timestamp, "(", (block2.timestamp - block1.timestamp)/60/60/24," day)");



    // 0x60081167ca9defe5d3fcff2bccd0341ee7f31b49f9d5acc21e4da938b164e358 60857
    console.log("need create blob: 8000000");
    console.log("total tx count: 21485");
    console.log("total upload blob: 134455");
    console.log("total cost: 1965.67 ETH");
    console.log("average gas price: 4405389344 (4.4 Gwei)");
    console.log("total time: 547152 ( 6.33 day)");
}

// history();
console.log("need create blob: 8000000");
console.log("total tx count: 21485");
console.log("total upload blob: 44455");
console.log("total cost: 1965.67 ETH");
console.log("average gas price: 4405389344 (4.4 Gwei)");
console.log("total time: 547152 ( 6.33 day)");
