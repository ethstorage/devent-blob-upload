const dotenv = require("dotenv")
dotenv.config()

const {ethers, Contract} = require("ethers");
const {BlobUploader, EncodeBlobs} = require("ethstorage-sdk");
const crypto = require('crypto');

const RPC = "https://polished-silent-market.ethereum-sepolia.quiknode.pro/3b74a592be57773068d83f931dd98af8cbc1e9ca";
const contractAddress = '0x804C520d3c084C805E37A35E90057Ac32831F96f'
const contractABI = [
    "function upfrontPayment() public view returns (uint256)",
    "function putBlobs(uint256 num) public payable",
    "function lastKvIdx() public view returns (uint40)"
]
const MAX_BLOB = 2000000n;
const privateKey = process.env.pk;
const send4844Tx = new BlobUploader(RPC, privateKey);

let firstBlob = false;

const sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function upload(contract) {
    let price = await contract.upfrontPayment();
    if (firstBlob) {
        price = price + BigInt(1000000000000);
        firstBlob = false;
    }

    let count = 250;
    let gasLimit = 17000000;
    const tx = await contract.putBlobs.populateTransaction(count, {
        value: price,
        gasLimit
    });

    // limit gas
    const fee = await send4844Tx.getFee();
    let maxFeePerGas = BigInt(fee.maxFeePerGas) * BigInt(6) / BigInt(5);
    let maxPriorityFeePerGas = BigInt(fee.maxPriorityFeePerGas) * BigInt(6) / BigInt(5);
    if(maxFeePerGas > 5000000000n) {
        maxFeePerGas = 5000000000n;
    }
    let blobGas = await send4844Tx.getBlobGasPrice();
    blobGas = blobGas * 6n / 5n;
    if(blobGas > 25000000000n) {
        blobGas = 25000000000n;
    }
    tx.maxFeePerGas = maxFeePerGas;
    tx.maxPriorityFeePerGas = maxPriorityFeePerGas;
    tx.maxFeePerBlobGas = blobGas;
    // tx.nonce = 5280;
    // tx.maxFeePerGas = 24000000000n;
    // tx.maxPriorityFeePerGas = maxPriorityFeePerGas * 3n;
    // tx.maxFeePerBlobGas = 25000000000n * 2n;

    //  send
    const content = crypto.randomBytes(4096 * 31);
    const blobs = EncodeBlobs(content);
    const hash = await send4844Tx.sendTx(tx, blobs);
    console.log(hash);
    const txReceipt = await send4844Tx.getTxReceipt(hash);
    console.log(`blockNumber=${txReceipt.blockNumber} gasUsed=${txReceipt.gasUsed}`)
    return txReceipt;
}

async function batchBlob() {
    while (true) {
        try {
            const provider = new ethers.JsonRpcProvider(RPC);
            const contract = new Contract(contractAddress, contractABI, provider);
            const currentIndex = await contract.lastKvIdx();
            const totalCount = MAX_BLOB - currentIndex;
            console.log("Current Number:",currentIndex, " Total Number:",totalCount);
            if (totalCount <= 0) {
                return;
            }

            await upload(contract);
        } catch (e) {
            console.log(e)
            await sleep(3000);
        }
    }
}

batchBlob();
