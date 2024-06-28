const {ethers, Contract} = require("ethers");
const {BlobUploader, EncodeBlobs} = require("ethstorage-sdk");
const crypto = require('crypto');

const dotenv = require("dotenv")
dotenv.config()

const RPC = "http://142.132.154.16:8545";
const contractAddress = '0x580F6F360E78293510652e4355EEa39257A4a662'
const contractABI = [
    "function upfrontPayment() public view returns (uint256)",
    "function putBlobs(uint256 num) public payable",
    "function lastKvIdx() public view returns (uint40)"
]
const MAX_BLOB = 4000000n;

let firstBlob = false;

const privateKey = process.env.pk;
const blobUploader = new BlobUploader(RPC, privateKey);
const provider = new ethers.JsonRpcProvider(RPC);
const contract = new Contract(contractAddress, contractABI, provider);

const sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function upload() {
    let price = await contract.upfrontPayment();
    if (firstBlob) {
        price = price + BigInt(1000000000000);
        firstBlob = false;
    }

    let count = 300n;
    let gasLimit = 19968224;
    const tx = await contract.putBlobs.populateTransaction(count, {
        value: price * count,
        gasLimit
    });
    //  send
    const content = crypto.randomBytes(4096 * 31);
    const blobs = EncodeBlobs(content);
    const tran = await blobUploader.sendTx(tx, blobs);
    console.log(tran.hash);
    const txReceipt = await tran.wait();
    console.log(`blockNumber:${txReceipt.blockNumber} gasUsed:${txReceipt.gasUsed}`)
    return txReceipt;
}

async function batchBlob() {
    while (true) {
        const currentIndex = await contract.lastKvIdx();
        const totalCount = MAX_BLOB - currentIndex;
        console.log("Current Number:", currentIndex, " Total Number:", totalCount);
        if (totalCount <= 0) {
            return;
        }

        try {
            await upload();
        } catch (e) {
            console.log(e)
            await sleep(3000);
        }
    }
}

batchBlob();
