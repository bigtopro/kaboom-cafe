document.addEventListener('DOMContentLoaded', () => {
    const firebaseConfig = {
        apiKey: "YOUR_GOOGLE_API_KEY",
        authDomain: "kaboom-gaming-d326a.firebaseapp.com",
        projectId: "kaboom-gaming-d326a",
        storageBucket: "kaboom-gaming-d326a.appspot.com",
        messagingSenderId: "856036165098",
        appId: "1:856036165098:web:d09ca266a93d3103975e93",
        measurementId: "G-38YKV3BR09"
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const firestore = firebase.firestore();

    const dashboardSection = document.getElementById('dashboard');
    const transactionsSection = document.getElementById('transactions');
    const accountSettingsSection = document.getElementById('account-settings');
    const logoutSection = document.getElementById('logout');
    const menuItems = document.querySelectorAll('.menu-item');
    const bookingButton = document.getElementById('booking-button');
    const consoleMessages = document.getElementById('console-messages');
    const userNameDisplay = document.querySelector('.user-name');
    const logoutButton = document.getElementById('logout-button');
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const body = document.body;

    const changeEmailButton = document.getElementById('change-email-button');
    const changeEmailDialog = document.getElementById('change-email-dialog');
    const closeEmailDialog = document.getElementById('close-email-dialog');
    const verifyEmailButton = document.getElementById('verify-email-button');
    const newEmailInput = document.getElementById('new-email');
    const updateUsernameButton = document.getElementById('update-username-button');
    const newUsernameInput = document.getElementById('new-username');
    const changeUsernameButton = document.getElementById('change-username-button');
    const changeUsernameDialog = document.getElementById('change-username-dialog');
    const buyCreditsSection = document.getElementById('buy-credits');


    let selectedCredits = 0;
    let selectedAmount = 0;
    let userEmail = null; // Define global variables
    let userName = null;
    let userPhone = null;


    const sections = {
        'dashboard': dashboardSection,
        'transactions': transactionsSection,
        'account-settings': accountSettingsSection,
        'logout': logoutSection,
    };

    // Set dashboard as the initial active section
    dashboardSection.classList.add('active');
    sections['buy-credits'] = buyCreditsSection;

    // Toggle sections
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            Object.values(sections).forEach(section => section.classList.remove('active'));
            sections[target].classList.add('active');
            sidebar.classList.remove('active'); // Hide sidebar after selection
        });
        item.addEventListener('mousedown', () => item.classList.add('pressed'));
        item.addEventListener('mouseup', () => item.classList.remove('pressed'));
    });

    changeUsernameButton.addEventListener('click', () => {
        changeUsernameDialog.style.display = 'block';
    });

    // Close the dialog when close button is clicked
    const closeUsernameDialog = document.getElementById('close-username-dialog');
    closeUsernameDialog.addEventListener('click', () => {
        changeUsernameDialog.style.display = 'none';
    });

    function applyBackgroundClass() {
        if (window.innerWidth <= 768) {
            body.classList.add('mobile-background');
            body.classList.remove('desktop-background');
        } else {
            body.classList.add('desktop-background');
            body.classList.remove('mobile-background');
        }
    }

    // Apply the appropriate class on page load
    applyBackgroundClass();
    window.addEventListener('resize', applyBackgroundClass);

    // Booking button event listener
    bookingButton.addEventListener('click', () => {
        window.location.href = 'booking.html';
    });

    // Logout button event listener
    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = './login.html';
        }).catch(error => {
            console.error('Logout error:', error);
            alert('Error logging out. Please try again.');
        });
    });

    const userEmailDisplay = document.querySelector('.user-email');

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const currentUserId = user.uid;
            const userEmail = user.email;

            try {
                // Fetch user data from Firestore
                const userDoc = await firestore.collection("users").doc(currentUserId).get();
                const transactionsDoc = await firestore.collection("transactions").doc(currentUserId).get();

                if (userDoc.exists) {
                    const data = userDoc.data();

                    // Update UI with user information
                    userNameDisplay.textContent = data.username || 'User';
                    userEmailDisplay.textContent = user.email || 'Email not available';
                    const userPhone = data.phoneNumber || '0000000000'; // Fallback phone number

                    addMessageToConsole(`Welcome, ${data.username}`);

                    // Show or hide "Buy Credits" menu based on email
                    const buyCreditsMenuItem = document.getElementById('buy-credits-menu');
                    buyCreditsMenuItem.style.display = userEmail === "sakkurusai@gmail.com" ? "block" : "none";
                    const credits = transactionsDoc.exists ? transactionsDoc.data().credits || 0 : 0;
                    document.getElementById('credits-value').textContent = `Credits: ${credits}`;

                    // Fetch user-related data
                    fetchBookings(currentUserId);
                    fetchTransactions(currentUserId);
                } else {
                    // Handle case where user data is not found
                    console.error('User data not found');
                    alert('User data not found. Please log in again.');
                    redirectToLogin();
                }
            } catch (error) {
                // Handle errors in fetching user data
                console.error('Error fetching user data:', error);
                alert('Error fetching user data. Please try again.');
            }
        } else {
            // Redirect unauthenticated users to the login page
            alert('Please log in to access the dashboard.');
            redirectToLogin();
        }
    });

    // Helper function to redirect to login page
    function redirectToLogin() {
        window.location.href = './login.html';
    }

    // Sidebar toggle event listener
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside of it on mobile
    document.addEventListener('click', (event) => {
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickInsideToggle = sidebarToggle.contains(event.target);

        if (!isClickInsideSidebar && !isClickInsideToggle && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });

    // Show change email dialog
    changeEmailButton.addEventListener('click', () => {
        changeEmailDialog.style.display = 'block';
    });

    // Close dialogs
    closeEmailDialog.addEventListener('click', () => {
        changeEmailDialog.style.display = 'none';
    });

    // Verify new email
    verifyEmailButton.addEventListener('click', () => {
        const newEmail = newEmailInput.value;
        if (newEmail) {
            auth.currentUser.verifyBeforeUpdateEmail(newEmail).then(() => {
                alert(`A verification email has been sent to ${newEmail}. Please verify to complete the email update.`);
                changeEmailDialog.style.display = 'none';
            }).catch(error => {
                if (error.code === 'auth/requires-recent-login') {
                    window.location.href = `./login.html?Redirect_Url=${window.location.hostname}/dashboard.html#accountsettings;`
                    return;
                }
                console.error('Error updating email:', error);
                alert('Error updating email. Please try again.');
            });
        } else {
            alert('Please enter a valid email address.');
        }
    });
        // Update username
        updateUsernameButton.addEventListener('click', () => {
            const newUsername = newUsernameInput.value;
            if (newUsername.length >= 6) {
                const user = auth.currentUser;
                const currentUserId = user.uid;
                firestore.collection("users").doc(currentUserId).update({
                    username: newUsername
                }).then(() => {
                    userNameDisplay.textContent = newUsername;
                    alert(`Username has been updated to ${newUsername}`);
                    changeUsernameDialog.style.display = 'none';
                }).catch(error => {
                    console.error('Error updating username:', error);
                    alert('Error updating username. Please try again.');
                });
            } else {
                alert('Username must be at least 6 characters.');
            }
        });


    // Fetch bookings from Firestore
    function fetchBookings(userId) {
        const bookingsList = document.getElementById('bookings-list');
        firestore.collection('transactions').doc(userId).collection('dashboardDetails')
            .get()
            .then(snapshot => {
                bookingsList.innerHTML = ''; // Clear existing bookings
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const startTime = new Date(data.start_time.seconds * 1000).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) + ' ' + new Date(data.start_time.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const endTime = new Date(data.end_time.seconds * 1000).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) + ' ' + new Date(data.end_time.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    bookingsList.innerHTML += `
                        <tr>
                            <td>${startTime}</td>
                            <td>${endTime}</td>
                            <td>${data.controllers}</td>
                        </tr>
                    `;
                });
            })
            .catch(error => {
                console.error('Error fetching bookings:', error);
                addMessageToConsole('Error fetching bookings. Please try again.');
            });
    }

    // Fetch transactions from Firestore
    function fetchTransactions(userId) {
        const transactionsList = document.getElementById('transactions-list');
        firestore.collection('transactions').doc(userId).collection('dashboardDetails')
            .get()
            .then(snapshot => {
                transactionsList.innerHTML = ''; // Clear existing transactions
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.status !== 'failed') { // Filter out failed transactions
                        const startTime = new Date(data.start_time.seconds * 1000).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) + ' ' + new Date(data.start_time.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const endTime = new Date(data.end_time.seconds * 1000).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) + ' ' + new Date(data.end_time.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const bookingTime = new Date(data.end_time.seconds * 1000).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) + ' ' + new Date(data.end_time.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        transactionsList.innerHTML += `
                            <tr>
                                <td>${startTime}</td>
                                <td>${endTime}</td>
                                <td>${data.price}</td>
                                <td>${bookingTime}</td>
                            </tr>
                        `;
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching transactions:', error);
                addMessageToConsole('Error fetching transactions. Please try again.');
            });
    }

    function addMessageToConsole(message) {
        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        if (isMobile) {
            const messageElement = document.createElement('div');
            messageElement.textContent = message;
            messageElement.style.color = 'red';
            messageElement.style.position = 'fixed';
            messageElement.style.bottom = '20px';
            messageElement.style.left = '20px';
            messageElement.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            messageElement.style.padding = '10px';
            messageElement.style.borderRadius = '5px';
            document.body.appendChild(messageElement);

            // Remove message after 4 seconds
            setTimeout(() => {
                messageElement.remove();
            }, 4000);
        } else {
            const messageElement = document.createElement('div');
            messageElement.textContent = message;
            messageElement.style.color = 'red';
            consoleMessages.appendChild(messageElement);
        }
    }

    // Example usage
    addMessageToConsole('Dashboard loaded successfully.');
    addMessageToConsole('User authenticated.');


// Function to handle credit selections
window.selectCredit = function selectCredit(credits, amount) {
    selectedCredits = credits;
    selectedAmount = amount;

    document.getElementById('buy-button').disabled = false;
    console.log(`Selected: ${credits} Credits for ₹${amount}`);
};

// Function to handle Razorpay order creation and checkout
async function createOrderAndPay() {
    if (!selectedCredits || !selectedAmount) {
        alert("Please select a credit option first.");
        return;
    }

    try {
        console.log("Creating order...");
        console.log(auth.currentUser.uid);

        // Call the /create-order endpoint to generate an order
        const response = await fetch('https://us-central1-kaboom-gaming-d326a.cloudfunctions.net/app/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: selectedAmount, // amount in INR
                receipt: `receipt_${Date.now()}`,
                notes: {
                    credits: selectedCredits, // Add credit details
                    userId: auth.currentUser?.uid || null,

                },
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const order = await response.json();
        console.log("Order created:", order);

        // Initialize Razorpay Checkout
        const options = {
            key: 'YOUR_RAZORPAY_KEY_ID', // Replace with your Razorpay Key ID
            amount: order.amount,
            currency: order.currency,
            order_id: order.id,
            name: 'Credits Purchase',
            description: `${selectedCredits} Credits`,
            image: 'https://storage.googleapis.com/kaboom-gaming/Kaboom-Gaming.png',
            prefill: {
                name: userName,
                email: userEmail,
                contact: userPhone,
            },
            notes: {
                address: "sereinity boys hostel",
                userId: auth.currentUser?.uid || null,
                credits: selectedCredits,
            },
            theme: {
                color: '#3399cc',
            },
            handler: async function (response) {
                console.log("Payment successful. Razorpay Payment ID:", response.razorpay_payment_id);

                // Add credits to user's account in Firestore
                const userId = auth.currentUser.uid;
                try {
                    /*const userDoc = firestore.collection('transactions').doc(userId);
                    const userTransactionData = await userDoc.get();

                    if (!userTransactionData.exists) {
                        await userDoc.set({ credits: 0 });
                    }

                    await userDoc.update({
                        credits: firebase.firestore.FieldValue.increment(selectedCredits),
                    });*/

                    alert("Thank you for your purchase! Credits have been added to your account.");
                    resetSelection();
                } catch (error) {
                    console.error("Error updating credits in Firestore:", error);
                    alert("Payment successful, but there was an issue updating your account. Please contact support.");
                }
            },
            modal: {
                ondismiss: function () {
                    console.log('Checkout form closed');
                },
            },
        };

        const rzp = new Razorpay(options);
        rzp.open();
    } catch (error) {
        console.error("Error creating order or initializing payment:", error);
        alert("An error occurred. Please try again.");
    }
}

// Reset selection after successful payment
function resetSelection() {
    selectedCredits = 0;
    selectedAmount = 0;
    document.getElementById('buy-button').disabled = true;
}

// Attach buy button event listener
document.getElementById('buy-button').addEventListener('click', createOrderAndPay);

});
