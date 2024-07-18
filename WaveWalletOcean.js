const request = require('request');
const crypto = require('crypto-js');
const sui = require("@mysten/sui.js");
const fs = require('fs');

const Ed25519Keypair = sui.Ed25519Keypair;
const JsonRpcProvider = sui.JsonRpcProvider;
const RawSigner = sui.RawSigner;
const TransactionBlock = sui.TransactionBlock;
const Connection = sui.Connection;

const contractAddress = "0x2c68443db9e8c813b194010c11040a3ce59f47e4eb97a2ec805371505dad7459";
const So = "0x4846a1f1030deffd9dea59016402d832588cf7e0c27b9e4c1a63d2b5e152873a";
const oceanCt = "0xa8816d3a6e3136e86bc2873b1f94a15cadc8af2703c075f2d546c2ae367f4df9::ocean::OCEAN";
const walletKeys = fs.readFileSync('seed_parse.txt', 'utf-8')
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean);

const connection = new Connection({
  fullnode: 'https://fullnode.mainnet.sui.io',
  faucet: 'https://faucet.testnet.sui.io/gas',
});
const provider = new JsonRpcProvider(connection);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function shortenKey(key) {
  const start = key.slice(0, 4);
  const end = key.slice(-4);
  return `${start}...${end}`;
}

function truncateAddress(address) {
  const start = address.slice(0, 5);
  const end = address.slice(-5);
  return `${start}........${end}`;
}

function saveAddress(address) {
  const filename = 'wallet_adrs.txt';
  let addresses = [];

  if (fs.existsSync(filename)) {
    addresses = fs.readFileSync(filename, 'utf-8')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }

  if (!addresses.includes(address)) {
    fs.appendFileSync(filename, address + '\n');
  }
}

async function getChange(key) {
  const txn = await provider.getTransactionBlock({
    digest: key,
    options: {
      showEffects: false,
      showInput: false,
      showEvents: false,
      showObjectChanges: true,
      showBalanceChanges: true,
    },
  });
  let change = txn["balanceChanges"];
  const totalAmount = change
    .filter(item => item.coinType === oceanCt)
    .reduce((sum, item) => sum + parseInt(item.amount, 10), 0);
  return totalAmount / 1000000000;
}

async function main() {
  for (let i = 0; i < walletKeys.length; i++) {
    const key = walletKeys[i];
    const keypair = Ed25519Keypair.deriveKeypair(key, `m/44'/784'/0'/0'/0'`);
    console.log('\x1b[33m\x1b[1m%s\x1b[0m', '------------------------------');
    console.log(`\x1b[32mStart reading wallet\x1b[0m ${shortenKey(key)}`);

    const signer = new RawSigner(keypair, provider);
    const suiAdd = keypair.getPublicKey().toSuiAddress();
    const truncatedSuiAdd = truncateAddress(suiAdd);
    saveAddress(suiAdd);
    console.log('\x1b[35m\x1b[1m%s\x1b[0m', `Sui Address: ${truncatedSuiAdd}`);

    try {
      const tx = new TransactionBlock();
      let a = tx.object(So);
      let d = tx.object("0x6");
      tx.moveCall({
        target: `${contractAddress}::game::claim`,
        arguments: [a, d],
        typeArguments: []
      });
      console.log('\x1b[33m\x1b[1m%s\x1b[0m', 'Start claiming, waiting...');

      const result = await signer.signAndExecuteTransactionBlock({ transactionBlock: tx, requestType: "WaitForLocalExecution" });

      await sleep(5000);
      let amount = await getChange(result["digest"]);
      const currentDate = new Date();
      const dateNow = currentDate.toISOString();
      console.log(`\x1b[34m\x1b[1m%s\x1b[0m`,` claimed: ${dateNow}`);
      console.log(`\x1b[34m\x1b[1mBalance:\x1b[0m ${amount}`);

    } catch (error) {
      const originalConsoleError = console.error;
      console.error = function () { };

      console.error(`Claim Error, not yet: ${truncatedSuiAdd}`, error);

      if (error) {
        console.error = originalConsoleError;
        function centerConsoleOutput(text) {
          const terminalWidth = process.stdout.columns;
          const padding = Math.floor((terminalWidth - text.length) / 2);
          const spaces = ' '.repeat(padding);
          console.log(spaces + text);
        }

        function showErrorMessage() {
          console.error('\x1b[1m\x1b[31m%s\x1b[0m', 'Not Enough SUI');
        }

        centerConsoleOutput('');
        showErrorMessage();
        centerConsoleOutput('');
      } else {
        console.error = originalConsoleError;
      }
    }
  }
}

async function run() {
  console.log("\033[1;91m" + 
` ______  _               _    
 | ___ \\| |             | |   
 | |_/ /| |  __ _   ___ | | __
 | ___ \\| | / _\` | / __|| |/ /
 | |_/ /| || (_| || (__ |   < 
 \\____/ |_| \\__,_| \\___||_|\\_\\
` + "\033[0m" + "\033[1;92m" + 
` ______                                   
 |  _  \\                                  
 | | | | _ __   __ _   __ _   ___   _ __  
 | | | || '__| / _\` | / _\` | / _ \\ | '_ \\ 
 | |/ / | |   | (_| || (_| || (_) || | | |
 |___/  |_|    \\__,_| \\__, | \\___/ |_| |_|
                       __/ |              
                      |___/               
` + "\033[0m" + "\033[1;93m" + 
`  _   _               _                
 | | | |             | |               
 | |_| |  __ _   ___ | | __  ___  _ __ 
 |  _  | / _\` | / __|| |/ / / _ \\| '__|
 | | | || (_| || (__ |   < |  __/| |   
 \\_| |_/ \\__,_| \\___||_|\\_\\ \\___||_| 
` + "\033[0m");
  console.log("\033[1;96m----------------------------------\033[0m");
  console.log("\033[1;93mScript created by: Black Dragon Hacker\033[0m");
  console.log("\033[1;92mJoin Telegram: \nhttps://t.me/BlackDragonHacker007\033[0m");
  console.log("\033[1;91mVisit my GitHub: \nhttps://github.com/BlackDragonHacker\033[0m");
  console.log("\033[1;96m----------------------------------\033[0m");
  console.log("\033[1;38;2;139;69;19;48;2;173;216;230m--------[Wave Wallet Bot]--------\033[0m");
  console.log("\033[1;96m----------------------------------\033[0m");

  const walletCount = walletKeys.length;

console.log("\033[1;93mTotal Accounts: " + walletCount + "\033[0m");
console.log("\033[1;96m----------------------------------\033[0m");

  const countdownDuration = 2 * 60 * 60 * 1000;
  const interval = 1000;

  while (true) {
    try {
      await main();
    } catch (error) {
      console.error('Error during execution:', error);
    }

    console.log('\x1b[1m\x1b[36m%s\x1b[0m', "Wait 2 hours to continue");

    let timer = countdownDuration / 1000;

    const countdownInterval = setInterval(() => {
      const hours = Math.floor(timer / 3600);
      const minutes = Math.floor((timer % 3600) / 60);
      const seconds = Math.floor(timer % 60);

      const formattedHours = hours < 10 ? "0" + hours : hours;
      const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
      const formattedSeconds = seconds < 10 ? "0" + seconds : seconds;

      process.stdout.write(`\r\x1b[1m\x1b[36m${formattedHours}:${formattedMinutes}:${formattedSeconds}\x1b[0m`);

      if (--timer < 0) {
        clearInterval(countdownInterval);
        process.stdout.write('\n');
      }
    }, interval);

    await sleep(countdownDuration);
  }
}

run();
