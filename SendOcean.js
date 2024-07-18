const { SuiKit } = require('@scallop-io/sui-kit');
const fs = require('fs');
const readline = require('readline');

const oceanCt = '0xa8816d3a6e3136e86bc2873b1f94a15cadc8af2703c075f2d546c2ae367f4df9::ocean::OCEAN';
let recipient = '';
let chalk;
const transactionFee = 1000; // Replace this with the actual transaction fee in your environment

async function getInput(prompt) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function loadChalk() {
    chalk = await import('chalk');
}

async function transferCoin() {
    await loadChalk();

    console.log(chalk.default.bold.bgBlue.white('\n=== Ocean Token Transfer ===\n'));

    recipient = await getInput(chalk.default.bold.cyan('Enter the recipient wallet address: '));
    
    const fileStream = fs.createReadStream('seed_parse.txt');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const wallets = [];
    for await (const line of rl) {
        const [mnemonics] = line.trim().split(',');
        if (mnemonics) {
            wallets.push(mnemonics);
        }
    }

    console.log(chalk.default.bold.yellow(`Total number of wallets: ${wallets.length}`));
    
    let numWallets = await getInput(chalk.default.bold.magenta(`Enter the number of wallets to use (default: ${wallets.length}): `));
    numWallets = numWallets ? parseInt(numWallets) : wallets.length;

    let oceanAmountToSend = await getInput(chalk.default.bold.green('Enter the amount of ocean tokens to send from each wallet (default: all): '));
    oceanAmountToSend = oceanAmountToSend ? parseFloat(oceanAmountToSend) * 1000000000 : null;

    console.log(chalk.default.bold.bgBlue.white('\n=== Starting Transfer Process ===\n'));
    
    const transactionStream = fs.createWriteStream('.transactions.txt', { flags: 'a' });

    for (let i = 0; i < numWallets; i++) {
        const mnemonics = wallets[i];
        try {
            const suiKit = new SuiKit({ mnemonics });
            let initialBalance = await suiKit.getBalance(oceanCt);
            let oceanAmount = initialBalance["totalBalance"];
            let amountToSend = oceanAmountToSend || (oceanAmount - transactionFee); // Ensure we account for the fee
            
            
            console.log('\x1b[33m\x1b[1m%s\x1b[0m', '------------------------------');
            console.log(chalk.default.bold.yellow(`Current balance ${(oceanAmount / 1000000000).toFixed(2)} OCEAN`));

            // Ensure the transaction fee is considered and the balance is sufficient
            if (oceanAmount === 0) {
                console.log(chalk.default.bold.red('Transaction is not possible. Current balance is 0.'));
                continue;
            }

            if (amountToSend > transactionFee) {
                amountToSend -= transactionFee; // Adjust the amount to send by subtracting the fee
            }

            if (oceanAmount > transactionFee) {
                console.log(chalk.default.bold.bgYellow.black('Transaction Processing .........'));
                let txn = await suiKit.transferCoin(recipient, amountToSend, oceanCt);
                let txnId = txn.transactionId || txn.id;  // Adjust according to the structure of your transaction object

                let finalBalance = await suiKit.getBalance(oceanCt);
                let newOceanAmount = finalBalance["totalBalance"];

                console.log(chalk.default.bold.cyan(`New balance ${(newOceanAmount / 1000000000).toFixed(2)} OCEAN`));

                if (newOceanAmount < oceanAmount) {
                    console.log(chalk.default.bold.bgGreen.white('Transaction Successful'));
                } else {
                    console.log(chalk.default.bold.bgRed.white('Transaction Unsuccessful'));
                }

                transactionStream.write(`Transaction ID: ${txnId}\n`);
            } else {
                console.log(chalk.default.bold.red(`Not enough gas fees`));
            }
        } catch (error) {
            if (error.message.includes('No valid gas coins found for the transaction')) {
                console.log(chalk.default.bold.red('Not enough gas fees'));
            } else {
                console.log(chalk.default.bold.bgRed.white('Transaction Unsuccessful'));
                console.log(chalk.default.bold.red('Error:', error));
            }
        }
    }

    transactionStream.end();

    console.log(chalk.default.bold.bgBlue.white('\n=== Transfer Process Complete ===\n'));
}

transferCoin().catch(console.error);
