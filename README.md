# OpenFund

Created by Peter Mazzocco

    The OpenFund contract is inspired by Solidity By Example's crowdfunding contract
    (https://solidity-by-example.org/app/crowd-fund/). I've included additional
    events, functions, constructor arguments and custom errors for better flexibility
    and gas efficiency (shared by Chiru Labs and their ERC-721A contract). Additionally,
    I've emphasized better data management for easier UI/UX for any dApp integration by
    monitoring more variables for display.

To start, please clone the repo.

### Install dependencies:

```shell
npm i
```

Configure your network settings by heading to `hardhat.config.js`.
Choose the network you wish to deploy to and enter your key/url from your `.env`.

### Compile contract:

```shell
npx hardhat compile
```

### Run test:

```shell
npx hardhat test
```

### Run hardhat node:

```shell
npx hardhat note
```

### Split terminal and deploy to local network:

To start, make sure you fill out the necessary constructor arguments in the `deploy.js` file:

```shell
  const OpenFund = await hre.ethers.getContractFactory("OpenFund");
  const deployer =  <--YOUR ADDRESS--> ;
  const amount = ethers.utils.parseEther("<--ENTER AMOUNT IN ETHER-->");
  const campaignLength = <--AMOUNT OF DAYS IN SECONDS-->;
  const rateLimit = <--AMOUNT OF DAYS IN SECONDS-->;
  const openFun = await OpenFund.deploy(deployer, amount, rateLimit, campaignLength);
```

```shell
npx hardhat run scripts/deploy.js
```

This will deploy a contrac to your local node via HardHat. We just want to confirm everything works properly

### Deploy to network

Once you are ready, and all tests and compiling has passed, you can deploy to your test or mainnet of choosing:

```shell
npx hardhat run scripts/deploy.js --network-(networkname)
```

Please make sure the (networkname) matches the name from your config file.

Once deployed, you will see a console log of all the information including:
The Address - copy and past for your scan of choosing (etherscan, polygonscan, etc)
The Contract Owner - your address on deploy
The Rate Limit - the amount of time someone between submitting campaigns (default is 24 hours)
The Campaign Length - the maximum amount of time a campaign can go for (default is 30 days)
