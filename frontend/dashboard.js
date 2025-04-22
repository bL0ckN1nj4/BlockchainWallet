document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (!localStorage.getItem('token')) {
        window.location.href = 'login.html';
        return;
    }

    // Global variables
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('email');
    const walletAddress = localStorage.getItem('address');
    let balances = {
        npr: 0,
        nprt: 0
    };

    // Display user information
    document.getElementById('user-email').textContent = userEmail;
    document.getElementById('wallet-address').textContent = walletAddress;

    // Check bank connection status
    checkBankConnection();

    // Initialize app
    loadBalances();
    loadTransactions();
    setupEventListeners();

    // Function to handle navigation
    function setupEventListeners() {
        // Navigation
        document.querySelectorAll('.sidebar nav a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const target = this.getAttribute('href').substring(1);
                activateSection(target);
            });
        });

        // Quick action buttons
        document.querySelectorAll('.quick-actions button').forEach(button => {
            button.addEventListener('click', function() {
                const action = this.getAttribute('data-action');
                activateSection(action);
            });
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', logout);

        // Copy wallet address
        document.getElementById('copy-address').addEventListener('click', copyWalletAddress);

        // Form submissions
        document.getElementById('send-form').addEventListener('submit', handleSendSubmit);
        document.getElementById('convert-form').addEventListener('submit', handleConvertSubmit);
        document.getElementById('connect-bank-form').addEventListener('submit', handleBankConnectSubmit);
        document.getElementById('deposit-form').addEventListener('submit', handleDepositSubmit);
        document.getElementById('withdraw-form').addEventListener('submit', handleWithdrawSubmit);

        // Form input changes
        document.getElementById('send-token-type').addEventListener('change', updateSendForm);
        document.getElementById('conversion-type').addEventListener('change', updateConvertForm);
        document.getElementById('convert-amount').addEventListener('input', calculateConversion);

        // Bank transfer tabs
        document.getElementById('deposit-tab').addEventListener('click', () => switchBankTransferTab('deposit'));
        document.getElementById('withdraw-tab').addEventListener('click', () => switchBankTransferTab('withdraw'));
        
        // Disconnect bank
        document.getElementById('disconnect-bank').addEventListener('click', disconnectBank);

        // Transaction filter
        document.getElementById('tx-filter').addEventListener('change', filterTransactions);

        // Modal close buttons
        document.querySelector('.modal .close').addEventListener('click', closeModal);
        document.getElementById('close-modal').addEventListener('click', closeModal);

        // Copy transaction hash
        document.getElementById('copy-hash').addEventListener('click', copyTransactionHash);
    }

    // Section navigation
    function activateSection(sectionId) {
        // Update sidebar active state
        document.querySelectorAll('.sidebar nav li').forEach(item => {
            item.classList.remove('active');
        });
        const activeNavItem = document.querySelector(`.sidebar nav a[href="#${sectionId}"]`);
        if (activeNavItem) {
            activeNavItem.parentElement.classList.add('active');
        }

        // Show active section, hide others
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');
        
        // Update withdraw available balance if bank section is activated
        if (sectionId === 'bank' && isBankConnected()) {
            document.getElementById('withdraw-available-balance').textContent = balances.npr.toFixed(2);
        }
    }

    // Logout function
    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('address');
        localStorage.removeItem('bankConnected');
        localStorage.removeItem('bankAccount');
        localStorage.removeItem('bankPhone');
        localStorage.removeItem('bankName');
        window.location.href = 'login.html';
    }

    // Copy wallet address
    function copyWalletAddress() {
        const addressText = document.getElementById('wallet-address').textContent;
        navigator.clipboard.writeText(addressText).then(() => {
            showNotification('Address copied to clipboard!');
        });
    }

    // Copy transaction hash
    function copyTransactionHash() {
        const hashText = document.getElementById('tx-hash').textContent;
        navigator.clipboard.writeText(hashText).then(() => {
            showNotification('Transaction hash copied to clipboard!');
        });
    }

    // Show notification
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Load balances from API
    async function loadBalances() {
        try {
            const response = await fetch(`http://localhost:8545/api/balance/${walletAddress}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (response.ok) {
                balances.npr = parseFloat(data.balance.npr);
                balances.nprt = parseFloat(data.balance.nprt);
                
                // Update balance displays
                document.getElementById('nprt-balance').textContent = balances.nprt.toFixed(6);
                document.getElementById('npr-balance').textContent = balances.npr.toFixed(2);
                document.getElementById('nprt-value').textContent = (balances.nprt * 100).toFixed(2) + ' NPR';
                
                // Update send form available balance
                updateSendForm();
                
                // Update convert form available balance
                updateConvertForm();
                
                // Update withdraw available balance if bank is connected
                if (isBankConnected()) {
                    document.getElementById('withdraw-available-balance').textContent = balances.npr.toFixed(2);
                }
            } else {
                showNotification('Error loading balances: ' + data.error);
            }
        } catch (error) {
            console.error('Error loading balances:', error);
            showNotification('Network error. Please try again.');
        }
    }

    // Load transactions from API
    async function loadTransactions() {
        try {
            const response = await fetch(`http://localhost:8545/api/transactions/${walletAddress}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (response.ok) {
                renderTransactions(data.transactions);
            } else {
                showNotification('Error loading transactions: ' + data.error);
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            showNotification('Network error. Please try again.');
        }
    }

    // Render transactions in the table
    function renderTransactions(transactions) {
        const tbody = document.getElementById('transaction-body');
        const noTransactions = document.getElementById('no-transactions');
        
        // Clear existing transactions
        tbody.innerHTML = '';
        
        if (transactions.length === 0) {
            noTransactions.style.display = 'flex';
            return;
        }
        
        noTransactions.style.display = 'none';
        
        transactions.forEach(tx => {
            const row = document.createElement('tr');
            
            // Format date
            const date = new Date(tx.timestamp);
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            
            // Create details text based on transaction type
            let detailsText = '';
            let amountText = '';
            let iconClass = tx.type.toLowerCase();
            let iconName = '';
            
            // Determine the appropriate icon and classes based on transaction type and subtype
            if (tx.type === 'Transfer') {
                const address = tx.subtype === 'Sent' ? tx.to : tx.from;
                const formattedAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
                
                detailsText = tx.subtype === 'Sent' ? 
                    `To: ${formattedAddress}` : 
                    `From: ${formattedAddress}`;
                
                amountText = `${tx.subtype === 'Sent' ? '-' : '+'} ${tx.amount} ${tx.token}`;
                
                // Add received class for received transfers
                if (tx.subtype === 'Received') {
                    iconClass += ' received';
                    iconName = 'download';
                } else {
                    iconName = 'paper-plane';
                }
            } else if (tx.type === 'Conversion') {
                detailsText = `${tx.from} → ${tx.to}`;
                
                if (tx.from === 'NPR') {
                    amountText = `${tx.nprAmount} NPR → ${tx.nprtAmount} NPRT`;
                } else {
                    amountText = `${tx.nprtAmount} NPRT → ${tx.nprAmount} NPR`;
                }
                
                iconName = 'exchange-alt';
            } else if (tx.type === 'Bank') {
                detailsText = tx.subtype;
                
                if (tx.subtype === 'Deposit') {
                    amountText = `+ ${tx.amount} NPR`;
                    iconClass += ' deposit';
                    iconName = 'arrow-down';
                } else if (tx.subtype === 'Withdrawal') {
                    amountText = `- ${tx.amount} NPR`;
                    iconClass += ' withdrawal';
                    iconName = 'arrow-up';
                } else if (tx.subtype === 'Connection' || tx.subtype === 'Disconnection') {
                    amountText = `N/A`;
                    iconClass += ' connection';
                    iconName = tx.subtype === 'Connection' ? 'university' : 'unlink';
                } else {
                    iconName = 'university';
                }
            }
            
            // Set row content
            row.innerHTML = `
                <td>
                    <div class="tx-icon ${iconClass}">
                        <i class="fas fa-${iconName}"></i>
                    </div>
                    ${tx.type}
                </td>
                <td>${detailsText}</td>
                <td class="${(tx.type === 'Transfer' && tx.subtype === 'Sent') || (tx.type === 'Bank' && tx.subtype === 'Withdrawal') ? 'negative' : 'positive'}">${amountText}</td>
                <td>${formattedDate}</td>
                <td>
                    <span class="status ${tx.status.toLowerCase()}">${tx.status}</span>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    // Filter transactions by type
    function filterTransactions() {
        const filterValue = document.getElementById('tx-filter').value;
        const rows = document.querySelectorAll('#transaction-body tr');
        let visibleCount = 0;
        
        rows.forEach(row => {
            const type = row.querySelector('td:first-child').textContent.trim();
            
            if (filterValue === 'all' || type.toLowerCase().includes(filterValue)) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Show or hide "no transactions" message
        document.getElementById('no-transactions').style.display = visibleCount === 0 ? 'flex' : 'none';
    }

    // Update send form based on selected token
    function updateSendForm() {
        const tokenType = document.getElementById('send-token-type').value;
        document.getElementById('send-token-label').textContent = tokenType;
        document.getElementById('available-token').textContent = tokenType;
        
        const availableBalance = tokenType === 'NPRT' ? balances.nprt : balances.npr;
        document.getElementById('available-balance').textContent = availableBalance.toFixed(tokenType === 'NPRT' ? 6 : 2);
        
        // Update step value based on token type
        document.getElementById('send-amount').step = tokenType === 'NPRT' ? "0.000001" : "0.01";
    }

    // Update convert form based on selected conversion type
    function updateConvertForm() {
        const conversionType = document.getElementById('conversion-type').value;
        
        if (conversionType === 'npr-to-nprt') {
            document.getElementById('convert-from-label').textContent = 'NPR';
            document.getElementById('convert-to-label').textContent = 'NPRT';
            document.getElementById('convert-available-token').textContent = 'NPR';
            document.getElementById('convert-available-balance').textContent = balances.npr.toFixed(2);
            document.getElementById('convert-amount').step = "0.01";
        } else {
            document.getElementById('convert-from-label').textContent = 'NPRT';
            document.getElementById('convert-to-label').textContent = 'NPR';
            document.getElementById('convert-available-token').textContent = 'NPRT';
            document.getElementById('convert-available-balance').textContent = balances.nprt.toFixed(6);
            document.getElementById('convert-amount').step = "0.000001";
        }
        
        calculateConversion();
    }

    // Calculate conversion result
    function calculateConversion() {
        const amount = parseFloat(document.getElementById('convert-amount').value) || 0;
        const conversionType = document.getElementById('conversion-type').value;
        let result = 0;
        
        if (conversionType === 'npr-to-nprt') {
            result = amount / 100; // 1 NPRT = 100 NPR
        } else {
            result = amount * 100; // 1 NPRT = 100 NPR
        }
        
        document.getElementById('conversion-result').textContent = result.toFixed(conversionType === 'npr-to-nprt' ? 6 : 2);
    }

    // Handle send form submission
    async function handleSendSubmit(e) {
        e.preventDefault();
        
        const tokenType = document.getElementById('send-token-type').value;
        const recipientAddress = document.getElementById('recipient-address').value;
        const amount = parseFloat(document.getElementById('send-amount').value);
        
        // Basic validation
        if (!recipientAddress || !amount) {
            showNotification('Please fill in all fields');
            return;
        }
        
        if (!recipientAddress.startsWith('0x')) {
            showNotification('Invalid wallet address format');
            return;
        }
        
        const maxAmount = tokenType === 'NPRT' ? balances.nprt : balances.npr;
        if (amount > maxAmount) {
            showNotification(`Insufficient ${tokenType} balance`);
            return;
        }
        
        try {
            const response = await fetch('http://localhost:8545/api/transfer', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: tokenType,
                    from: walletAddress,
                    to: recipientAddress,
                    amount: amount
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update balance in memory
                if (tokenType === 'NPRT') {
                    balances.nprt = parseFloat(data.balances.sender);
                } else {
                    balances.npr = parseFloat(data.balances.sender);
                }
                
                // Show success modal
                document.getElementById('tx-hash').textContent = data.txHash;
                showModal();
                
                // Reset form
                document.getElementById('send-form').reset();
                updateSendForm();
                
                // Refresh balances and transactions
                loadBalances();
                loadTransactions();
            } else {
                showNotification('Transfer failed: ' + data.error);
            }
        } catch (error) {
            console.error('Error during transfer:', error);
            showNotification('Network error. Please try again.');
        }
    }

    // Handle convert form submission (continued)
    async function handleConvertSubmit(e) {
        e.preventDefault();
        
        const conversionType = document.getElementById('conversion-type').value;
        const amount = parseFloat(document.getElementById('convert-amount').value);
        
        // Basic validation
        if (!amount) {
            showNotification('Please enter an amount to convert');
            return;
        }
        
        const endpoint = conversionType === 'npr-to-nprt' ? 
            'http://localhost:8545/api/convert/npr-to-nprt' : 
            'http://localhost:8545/api/convert/nprt-to-npr';
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address: walletAddress,
                    amount: amount
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update balances in memory
                balances.npr = parseFloat(data.balances.npr);
                balances.nprt = parseFloat(data.balances.nprt);
                
                // Show success modal
                document.getElementById('tx-hash').textContent = data.txHash;
                showModal();
                
                // Reset form
                document.getElementById('convert-form').reset();
                updateConvertForm();
                
                // Refresh balances and transactions
                loadBalances();
                loadTransactions();
            } else {
                showNotification('Conversion failed: ' + data.error);
            }
        } catch (error) {
            console.error('Error during conversion:', error);
            showNotification('Network error. Please try again.');
        }
    }

    // Check if bank is connected
    function isBankConnected() {
        return localStorage.getItem('bankConnected') === 'true';
    }

    // Check bank connection status and show appropriate interface
    async function checkBankConnection() {
        try {
            const response = await fetch(`http://localhost:8545/api/bank/status/${walletAddress}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store bank connection status in localStorage for quick UI access
                localStorage.setItem('bankConnected', data.connected ? 'true' : 'false');
                
                if (data.connected) {
                    // Show bank transfer interface
                    document.getElementById('bank-connect-form').classList.add('hidden');
                    document.getElementById('bank-transfer-interface').classList.remove('hidden');
                    
                    // Display masked account number
                    if (data.bankInfo && data.bankInfo.accountNumber) {
                        document.getElementById('connected-bank-account').textContent = data.bankInfo.accountNumber;
                    }
                    
                    // Update withdraw available balance
                    document.getElementById('withdraw-available-balance').textContent = balances.npr.toFixed(2);
                } else {
                    // Show bank connect form
                    document.getElementById('bank-connect-form').classList.remove('hidden');
                    document.getElementById('bank-transfer-interface').classList.add('hidden');
                }
            } else {
                // Error handling
                showNotification('Error checking bank status: ' + data.error);
                // Default to showing connect form on error
                document.getElementById('bank-connect-form').classList.remove('hidden');
                document.getElementById('bank-transfer-interface').classList.add('hidden');
            }
        } catch (error) {
            console.error('Error checking bank status:', error);
            showNotification('Network error. Please try again.');
            // Default to showing connect form on error
            document.getElementById('bank-connect-form').classList.remove('hidden');
            document.getElementById('bank-transfer-interface').classList.add('hidden');
        }
    }

    // Handle bank connection form submission
    async function handleBankConnectSubmit(e) {
        e.preventDefault();
        
        const fullName = document.getElementById('bank-full-name').value;
        const phoneNumber = document.getElementById('bank-phone').value;
        const accountNumber = document.getElementById('bank-account').value;
        const termsAccepted = document.getElementById('bank-terms').checked;
        
        // Validate inputs
        if (!fullName || !phoneNumber || !accountNumber || !termsAccepted) {
            showNotification('Please fill in all fields and accept terms');
            return;
        }
        
        // Validate phone number format (10 digits)
        if (!/^\d{10}$/.test(phoneNumber)) {
            showNotification('Phone number must be 10 digits');
            return;
        }
        
        // Validate account number format (16 digits)
        if (!/^\d{16}$/.test(accountNumber)) {
            showNotification('Bank account number must be 16 digits');
            return;
        }
        
        try {
            const response = await fetch('http://localhost:8545/api/bank/connect', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address: walletAddress,
                    fullName,
                    phoneNumber,
                    accountNumber
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update local state
                localStorage.setItem('bankConnected', 'true');
                
                // Show success notification
                showNotification('Bank account successfully connected!');
                
                // Show transaction hash in modal
                document.getElementById('tx-hash').textContent = data.txHash;
                showModal();
                
                // Update the interface
                checkBankConnection();
                
                // Refresh transactions to show the new bank connection
                loadTransactions();
            } else {
                showNotification('Connection failed: ' + data.error);
            }
        } catch (error) {
            console.error('Error connecting bank account:', error);
            showNotification('Network error. Please try again.');
        }
    }

    // Handle bank deposit submission
    async function handleDepositSubmit(e) {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('deposit-amount').value);
        
        // Basic validation
        if (!amount || amount < 100) {
            showNotification('Please enter a valid amount (minimum 100 NPR)');
            return;
        }
        
        try {
            const response = await fetch('http://localhost:8545/api/bank/deposit', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address: walletAddress,
                    amount: amount
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update NPR balance
                balances.npr = parseFloat(data.balance.npr);
                
                // Show transaction hash in modal
                document.getElementById('tx-hash').textContent = data.txHash;
                showModal();
                
                // Reset form
                document.getElementById('deposit-form').reset();
                
                // Refresh balances and update UI
                document.getElementById('npr-balance').textContent = balances.npr.toFixed(2);
                document.getElementById('withdraw-available-balance').textContent = balances.npr.toFixed(2);
                
                // Update other forms that display NPR balance
                updateSendForm();
                updateConvertForm();
                
                // Refresh transactions
                loadTransactions();
            } else {
                showNotification('Deposit failed: ' + data.error);
            }
        } catch (error) {
            console.error('Error during bank deposit:', error);
            showNotification('Network error. Please try again.');
        }
    }

    // Handle bank withdrawal submission
    async function handleWithdrawSubmit(e) {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('withdraw-amount').value);
        
        // Basic validation
        if (!amount || amount < 100) {
            showNotification('Please enter a valid amount (minimum 100 NPR)');
            return;
        }
        
        // Check if user has enough NPR
        if (amount > balances.npr) {
            showNotification('Insufficient NPR balance');
            return;
        }
        
        try {
            const response = await fetch('http://localhost:8545/api/bank/withdraw', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address: walletAddress,
                    amount: amount
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update NPR balance
                balances.npr = parseFloat(data.balance.npr);
                
                // Show transaction hash in modal
                document.getElementById('tx-hash').textContent = data.txHash;
                showModal();
                
                // Reset form
                document.getElementById('withdraw-form').reset();
                
                // Refresh balances and update UI
                document.getElementById('npr-balance').textContent = balances.npr.toFixed(2);
                document.getElementById('withdraw-available-balance').textContent = balances.npr.toFixed(2);
                
                // Update other forms that display NPR balance
                updateSendForm();
                updateConvertForm();
                
                // Refresh transactions
                loadTransactions();
            } else {
                showNotification('Withdrawal failed: ' + data.error);
            }
        } catch (error) {
            console.error('Error during bank withdrawal:', error);
            showNotification('Network error. Please try again.');
        }
    }

    // Disconnect bank
    async function disconnectBank() {
        try {
            const response = await fetch('http://localhost:8545/api/bank/disconnect', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address: walletAddress
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update local state
                localStorage.setItem('bankConnected', 'false');
                
                // Show notification
                showNotification('Bank account disconnected');
                
                // Show transaction hash in modal if available
                if (data.txHash) {
                    document.getElementById('tx-hash').textContent = data.txHash;
                    showModal();
                }
                
                // Update UI
                checkBankConnection();
                
                // Refresh transactions
                loadTransactions();
            } else {
                showNotification('Disconnection failed: ' + data.error);
            }
        } catch (error) {
            console.error('Error disconnecting bank account:', error);
            showNotification('Network error. Please try again.');
        }
    }

    // Show success modal
    function showModal() {
        document.getElementById('success-modal').style.display = 'flex';
    }

    // Close modal
    function closeModal() {
        document.getElementById('success-modal').style.display = 'none';
    }

    // Switch between deposit and withdraw tabs
    function switchBankTransferTab(tab) {
        // Update tab button active states
        document.getElementById('deposit-tab').classList.toggle('active', tab === 'deposit');
        document.getElementById('withdraw-tab').classList.toggle('active', tab === 'withdraw');
        
        // Show/hide appropriate form
        document.getElementById('deposit-form-container').classList.toggle('active', tab === 'deposit');
        document.getElementById('withdraw-form-container').classList.toggle('active', tab === 'withdraw');
    }
});