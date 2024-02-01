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
const MAX_BLOB = 500000n;

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

    let count = 250;
    let gasLimit = 14000000;
    const tx = await contract.putBlobs.populateTransaction(count, {
        value: price,
        gasLimit
    });
    // const fee = await send4844Tx.getFee();
    // const maxPriorityFeePerGas = BigInt(fee.maxPriorityFeePerGas) * BigInt(6) / BigInt(5);
    // const maxFeePerGas = BigInt(fee.maxFeePerGas) * BigInt(6) / BigInt(5);
    // tx.nonce = 2;
    // tx.maxFeePerGas = maxFeePerGas;
    // tx.maxPriorityFeePerGas = maxPriorityFeePerGas;
    // tx.maxFeePerBlobGas = 2100000000000n;
    const blobGas = await send4844Tx.getBlobGasPrice();
    tx.maxFeePerBlobGas = blobGas * 6n / 5n;

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
