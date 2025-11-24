async function loadJson(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error loading or parsing the file:', err);
      throw err;
    }
  }
class WalletManager {
    constructor() {
        this.walletConnected = false;
        this.portfolioContract = null;
        this.portfolioContractABI = null;
        this.portfolioContractAddress = "0x17F24D3b8Bc1150553b54Da30B4d993AcB889212";
        this.portfolioAbiLocation = "/data/portfolio.json";
        this.signer = null;
        this.stockNameToAddress = null;
        this.stockAddressToName = null;

        this.stockContractABI = null;
        this.stockContracAbiLocation = "/data/stock.json";

        this.yodaContractAddress = "0x6BdBb69660E6849b98e8C524d266a0005D3655F7";
        this.yodaContractABI = null;
        this.yodaContractAbiLocation = "/data/YODA.json";

        // user-related data
        this.userAddress = null;
        this.hasMinted = false;

        // event listener flag
        this.listenerAttached = false;

        // Load user data from cookies
        this.loadUserData();
        // load the stockNameToAddress mapping
        loadJson("/data/stockNameToAddress.json").then(data => {
            this.stockNameToAddress = data;
            console.log("Stock addresses loaded successfully:", this.stockNameToAddress);

            // generate reverse mapping: address -> name
            this.stockAddressToName = Object.entries(this.stockNameToAddress)
            .reduce((acc, [name, address]) => {
                    acc[address] = name;
                    return acc;
                }, {});
            console.log("Stock address to name mapping:", this.stockAddressToName);

        }).catch(error => {
            console.error("Error loading stock addresses:", error);
        });

        //load ABI if you want
        this.loadABI().catch(error => {
            console.error("Error loading ABI:", error);
        });

    }

    // saveUserData() {
    //     const userData = {
    //         hasMinted: this.hasMinted,
    //         userAddress: this.userAddress
    //     };
    //     document.cookie = `portfolioData=${JSON.stringify(userData)}; expires=${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString()}; path=/`;
    //     console.log("User data saved to cookies:", userData);
    // }

    loadUserData() {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith('portfolioData=')) {
                try {
                    const userData = JSON.parse(cookie.substring('portfolioData='.length));
                    this.hasMinted = userData.hasMinted;
                    this.userAddress = userData.userAddress;
                    console.log("User data loaded from cookies:", userData);
                    return;
                } catch (error) {
                    console.error("Error parsing cookie data:", error);
                }
            }
        }
        console.log("No user data found in cookies");
    }

    async loadABI() {
        try {
            const response = await fetch(this.portfolioAbiLocation);
            const data = await response.json();
            this.portfolioContractABI = data.abi;
            console.log("Porfolio ABI loaded successfully.");
            
        } catch (error) {
            console.error("Failed to load portfolio ABI:", error);
            throw error;
        }
        try {
            const response = await fetch(this.stockContracAbiLocation);
            const data = await response.json();
            this.stockContractABI = data.abi;
            console.log("Stock ABI loaded successfully.",this.stockContractABI);
            
        } catch (error) {
            console.error("Failed to load stock ABI:", error);
            throw error;
        }
        try {
            const response = await fetch(this.yodaContractAbiLocation);
            const data = await response.json();
            this.yodaContractABI = data.abi;
            console.log("yoda ABI loaded successfully.",this.stockContractABI);
            
        } catch (error) {
            console.error("Failed to load yoda ABI:", error);
            throw error;
        }

    }

    async connectMetaMaskAndContract() {
        try {
            // Ensure ABI is loaded
            if (!this.portfolioContractABI) {
                await this.loadABI();
            }
            if(!this.yodaContractABI){
                await this.loadABI();
            }

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            this.signer = provider.getSigner();

            this.portfolioContract = new ethers.Contract(
                this.portfolioContractAddress,
                this.portfolioContractABI,
                this.signer
            );

            this.walletConnected = true;
            this.userAddress = await this.signer.getAddress();
            try{
                const val = await this.portfolioContract._ownedToken(await wm.signer.getAddress());
                if (val.toString() != "0"){
                    this.hasMinted = true;
                    console.log("User has a portfolio already:", this.hasMinted);
                    console.log("with a token id:", val.toString());
                }
                else{
                    this.hasMinted = false;
                    console.log("User does not have a portfolio:", this.hasMinted);
                }
            }
            catch(error){
                this.hasMinted = false;
                console.log("User does not have a portfolio:", this.hasMinted);
            }
            // this.saveUserData();
            console.log("Connected to MetaMask and contract successfully.");


        } catch (error) {
            console.error("MetaMask connection failed:", error);
            alert("MetaMask connection failed!");
        }
    }

    // getStockContractObj(address) {
    //     return new ethers.Contract(
    //         address,
    //         this.stockContractABI,
    //         this.signer
    //     );
    // }
}

// Export instance
export const wm = new WalletManager();
