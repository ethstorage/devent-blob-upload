const {ethers, Contract} = require("ethers");
const {BlobUploader, EncodeBlobs} = require("ethstorage-sdk");
const crypto = require('crypto');

const RPC = "https://tame-wild-liquid.ethereum-goerli.quiknode.pro/4ae31eb78cb83cafc31140a8acc0841ea197a668";
const contractAddress = '0xc6F300f3F60a5822fd56f6589077Cb2D409ca52e'
const contractABI = [
    "function upfrontPayment() public view returns (uint256)",
    "function putBlobs(uint256 num) public payable",
    "function lastKvIdx() public view returns (uint40)"
]
const MAX_BLOB = BigInt(8000000);

let firstBlob = false;

const send4844Tx = new BlobUploader(RPC, '');
const provider = new ethers.JsonRpcProvider(RPC);
const contract = new Contract(contractAddress, contractABI, provider);

async function upload() {
    let price = await contract.upfrontPayment();
    if (firstBlob) {
        price = price + BigInt(1000000000000);
        firstBlob = false;
    }

    let count = 100;
    let gasLimit = 8000000;
    const fee = await send4844Tx.getFee();
    const maxPriorityFeePerGas = BigInt(fee.maxPriorityFeePerGas) * BigInt(6) / BigInt(5);
    const maxFeePerGas = BigInt(fee.maxFeePerGas) * BigInt(6) / BigInt(5);
    // if (maxFeePerGas * BigInt(gasLimit) > ethers.parseEther("1")) {
    //     count = 200;
    //     gasLimit = 13000000;
    // }
    // price = price * BigInt(count);
    //
    // // create data
    // const keys = [];
    // for (let i = 0; i < count; i++) {
    //     const key = ethers.keccak256(Buffer.from("_" + i + "_" + Date.now()));
    //     keys.push(key);
    // }
    const tx = await contract.putBlobs.populateTransaction(count, {
        value: price,
        gasLimit
    });
    // tx.nonce = 2;
    tx.maxFeePerGas = maxFeePerGas;
    tx.maxPriorityFeePerGas = maxPriorityFeePerGas;
    tx.maxFeePerBlobGas = 2100000000000n;

    //  send
    const content = crypto.randomBytes(4096 * 31);
    const blobs = EncodeBlobs(content);
    const hash = await send4844Tx.sendTx(tx, blobs);
    console.log(hash);
    const txReceipt = await send4844Tx.getTxReceipt(hash);
    console.log(txReceipt.blockNumber, " | ", txReceipt.gasUsed)
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
        } catch (e) {
            console.log(e)
        }
    }
}

batchBlob();
