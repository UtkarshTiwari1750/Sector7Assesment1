// Frontend wallet integration for proper multi-player flow
class WalletIntegration {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contracts = {};
    }

    // Initialize Web3 connection
    async init() {
        if (typeof window.ethereum !== 'undefined') {
            this.provider = new ethers.BrowserProvider(window.ethereum);
            
            // Get contract addresses from API
            const response = await fetch('http://localhost:5173/contracts');
            const contractData = await response.json();
            
            // Load ABIs (you'll need to copy these from api/abis/)
            const playGameAbi = await fetch('/abis/PlayGame.json').then(r => r.json());
            const gameTokenAbi = await fetch('/abis/GameToken.json').then(r => r.json());
            
            // Initialize contracts
            this.contracts.playGame = new ethers.Contract(
                contractData.playGame, 
                playGameAbi, 
                this.provider
            );
            
            this.contracts.gameToken = new ethers.Contract(
                contractData.gameToken, 
                gameTokenAbi, 
                this.provider
            );
            
            console.log('✅ Wallet integration initialized');
        } else {
            throw new Error('MetaMask not found');
        }
    }

    // Connect wallet
    async connect() {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.signer = this.provider.getSigner();
        const address = await this.signer.getAddress();
        console.log('🔗 Connected wallet:', address);
        return address;
    }

    // Get current account
    async getCurrentAccount() {
        if (!this.signer) await this.connect();
        return await this.signer.getAddress();
    }

    // Check if user has enough GT tokens and allowance
    async checkTokensAndAllowance(requiredAmount) {
        const address = await this.getCurrentAccount();
        const gameToken = this.contracts.gameToken.connect(this.signer);
        const playGameAddress = this.contracts.playGame.address;
        
        const balance = await gameToken.balanceOf(address);
        const allowance = await gameToken.allowance(address, playGameAddress);
        
        return {
            hasEnoughTokens: balance >= requiredAmount,
            hasEnoughAllowance: allowance >= requiredAmount,
            balance: ethers.formatEther(balance),
            allowance: ethers.formatEther(allowance)
        };
    }

    // Approve GT tokens for PlayGame contract
    async approveTokens(amount) {
        const gameToken = this.contracts.gameToken.connect(this.signer);
        const playGameAddress = this.contracts.playGame.address;
        
        console.log('📝 Approving GT tokens...');
        const tx = await gameToken.approve(playGameAddress, amount);
        await tx.wait();
        console.log('✅ Tokens approved:', tx.hash);
        return tx.hash;
    }

    // Stake in match (this is what you need!)
    async stakeInMatch(matchId, stakeAmount) {
        try {
            // Check tokens and allowance first
            const check = await this.checkTokensAndAllowance(stakeAmount);
            
            if (!check.hasEnoughTokens) {
                throw new Error(`Insufficient GT tokens. You have ${check.balance} GT, need ${ethers.formatEther(stakeAmount)} GT`);
            }
            
            if (!check.hasEnoughAllowance) {
                console.log('⚠️ Need to approve tokens first');
                await this.approveTokens(stakeAmount);
            }
            
            // Now stake
            console.log('🎯 Staking in match...');
            const playGame = this.contracts.playGame.connect(this.signer);
            const tx = await playGame.stake(matchId);
            
            console.log('⏳ Transaction sent:', tx.hash);
            const receipt = await tx.wait();
            console.log('✅ Staked successfully!', receipt.transactionHash);
            
            return receipt.transactionHash;
            
        } catch (error) {
            console.error('❌ Staking failed:', error.message);
            throw error;
        }
    }

    // Get match details
    async getMatch(matchId) {
        const match = await this.contracts.playGame.matches(matchId);
        return {
            p1: match.p1,
            p2: match.p2,
            stake: ethers.formatEther(match.stake),
            status: match.status,
            startTime: match.startTime.toString(),
            winner: match.winner
        };
    }
}

// Usage example:
async function testGameFlow() {
    const wallet = new WalletIntegration();
    await wallet.init();
    
    // Connect wallet
    const currentAccount = await wallet.connect();
    console.log('Current account:', currentAccount);
    
    // Example match ID (replace with actual)
    const matchId = "0x3100000000000000000000000000000000000000000000000000000000000000";
    const stakeAmount = ethers.parseEther("10"); // 10 GT tokens
    
    try {
        // Stake in match
        const txHash = await wallet.stakeInMatch(matchId, stakeAmount);
        console.log('🎉 Successfully staked! TX:', txHash);
        
        // Check match status
        const match = await wallet.getMatch(matchId);
        console.log('📊 Match status:', match);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.message.includes('Already staked')) {
            console.log('ℹ️ This player has already staked in this match');
        } else if (error.message.includes('Not a player')) {
            console.log('ℹ️ This account is not a player in this match');
        } else if (error.message.includes('Invalid status')) {
            console.log('ℹ️ Match is not in the correct status for staking');
        }
    }
}

// Export for use in HTML
window.WalletIntegration = WalletIntegration;
window.testGameFlow = testGameFlow;
