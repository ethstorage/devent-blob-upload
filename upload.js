const {ethers, Contract} = require("ethers");
const {Send4844Tx, EncodeBlobs} = require("send-4844-tx");
const crypto = require('crypto');

const contractAddress = '0xb4B46bdAA835F8E4b4d8e208B6559cD267851051'
const contractABI = [
    "function upfrontPayment() public view returns (uint256)",
    "function putBlobs(uint256 num) public payable",
    "function lastKvIdx() public view returns (uint40)"
]
const MAX_BLOB = BigInt(8192 * 1024);

let firstBlob = false;

const send4844Tx = new Send4844Tx('https://beacon.dencun-devnet-12.ethpandaops.io', '');
const provider = new ethers.JsonRpcProvider('https://beacon.dencun-devnet-12.ethpandaops.io');
const contract = new Contract(contractAddress, contractABI, provider);

async function upload(count) {
    let price = await contract.upfrontPayment();
    if (firstBlob) {
        price = price + BigInt(1000000000000);
        firstBlob = false;
    }

    const content = crypto.randomBytes(4096 * 31);
    const blobs = EncodeBlobs(content);
    const tx = await contract.putBlobs.populateTransaction(count, {
        value: price
    });
    // tx.nonce = 39;
    // tx.maxFeePerGas = 20000000000n;
    // tx.maxPriorityFeePerGas = 6000000000n;
    // tx.maxFeePerBlobGas = 70000000000n;
    const fee = await send4844Tx.getFee();
    tx.maxFeePerGas = BigInt(fee.maxFeePerGas) + BigInt(100000);
    tx.maxPriorityFeePerGas = BigInt(fee.maxPriorityFeePerGas) + BigInt(100000);
    tx.maxFeePerBlobGas = 3000000n;

    const hash = await send4844Tx.sendTx(blobs, tx);
    console.log(hash);
    const txReceipt = await send4844Tx.getTxReceipt(hash);
    console.log(hash, " = ", txReceipt.gasUsed)
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
            await upload(400);
        } catch (e) {
        }
    }
}

batchBlob();
