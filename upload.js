const {ethers, Contract} = require("ethers");
const {Send4844Tx, EncodeBlobs} = require("send-4844-tx");
const crypto = require('crypto');

const contractAddress = '0x42982e24ce7F138e54b43133D3C538AE4c00E962'
const contractABI = [
    "function upfrontPayment() public view returns (uint256)",
    "function putBlobs(bytes32[] memory keys) public payable",
    "function lastKvIdx() public view returns (uint40)"
]
const MAX_BLOB = BigInt(8000000);

let firstBlob = false;

const send4844Tx = new Send4844Tx('https://rpc.dencun-devnet-12.ethpandaops.io', '');
const provider = new ethers.JsonRpcProvider('https://rpc.dencun-devnet-12.ethpandaops.io');
const contract = new Contract(contractAddress, contractABI, provider);

async function upload() {
    let price = await contract.upfrontPayment();
    if (firstBlob) {
        price = price + BigInt(1000000000000);
        firstBlob = false;
    }

    let count = 400;
    let gasLimit = 26000000;
    const fee = await send4844Tx.getFee();
    const maxFeePerGas = BigInt(fee.maxFeePerGas) + BigInt(100000000);
    if (maxFeePerGas * BigInt(gasLimit) > ethers.parseEther("1")) {
        count = 200;
        gasLimit = 13000000;
    }
    price = price * BigInt(count);

    // create data
    const keys = [];
    for (let i = 0; i < count; i++) {
        const key = ethers.keccak256(Buffer.from("_" + i + "_" + Date.now()));
        keys.push(key);
    }
    const tx = await contract.putBlobs.populateTransaction(keys, {
        value: price,
        gasLimit
    });
    // tx.nonce = 39;
    // tx.maxFeePerGas = 20000000000n;
    // tx.maxPriorityFeePerGas = 6000000000n;
    // tx.maxFeePerBlobGas = 70000000000n;
    tx.maxFeePerGas = maxFeePerGas;
    tx.maxPriorityFeePerGas = BigInt(fee.maxPriorityFeePerGas) + BigInt(100000000)
    tx.maxFeePerBlobGas = 30000000000n;

    //  send
    const content = crypto.randomBytes(4096 * 31 *3);
    const blobs = EncodeBlobs(content);
    const hash = await send4844Tx.sendTx(blobs, tx);
    console.log(hash);
    const txReceipt = await send4844Tx.getTxReceipt(hash);
    console.log(txReceipt.blockNumber, " = ", txReceipt.gasUsed.toNumber())
    return txReceipt;
}

async function batchBlob() {
    while (true) {
        const currentIndex = await contract.lastKvIdx();
        const totalCount = MAX_BLOB - currentIndex;
        console.log(currentIndex, totalCount);
        if (totalCount <= 0) {
            return;
        }

        try {
            await upload();
        } catch (e) {}
    }
}

batchBlob();
