importScripts('ExtPay.js');

// This connects your extension to Glen's server using your unique ID
const extpay = ExtPay('pdf-ninja-v2'); 

// This is required to let ExtensionPay listen for successful payments
extpay.startBackground();

// This checks the user's status when the extension starts up
extpay.getUser().then(user => {
    if (user.paid) {
        console.log('PDF Ninja Pro: User is paid!');
    } else {
        console.log('PDF Ninja Pro: User is on the free plan.');
    }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: "popup.html" });
});