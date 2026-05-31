const google_script_url = "https://script.google.com/macros/s/AKfycbzEzRmewtz3q93A6GkaHTk9xgsRtGwW1PUkP3Fpp7MwoOp1f0S0qjrinyw31djjWUDr/exec";

let current_phone = localStorage.getItem('logged_phone') ? localStorage.getItem('logged_phone') : "";
let current_acc_type = localStorage.getItem('logged_acc_type') ? localStorage.getItem('logged_acc_type') : "";

let transactions = [];
let unsynced_items = [];

window.onload = function() {
    checkLoginStatus();
    toggleBankNameInput(); 
};

function checkLoginStatus() {
    if (current_phone && current_acc_type) {
        document.getElementById('login-section').style.display = "none";
        document.getElementById('main-app').style.display = "block";
        document.getElementById('active-user-display').innerText = `📱 ${current_phone} (${current_acc_type})`;
        
        transactions = localStorage.getItem(`off_tx_${current_phone}_${current_acc_type}`) ? JSON.parse(localStorage.getItem(`off_tx_${current_phone}_${current_acc_type}`)) : [];
        unsynced_items = localStorage.getItem(`un_syn_${current_phone}_${current_acc_type}`) ? JSON.parse(localStorage.getItem(`un_syn_${current_phone}_${current_acc_type}`)) : [];
        
        render();
        fetchDataFromGoogleSheets();
        window.addEventListener('online', syncOfflineDataToGoogle);
        if (navigator.onLine) { syncOfflineDataToGoogle(); }
    } else {
        document.getElementById('login-section').style.display = "block";
        document.getElementById('main-app').style.display = "none";
    }
}

function loginUser() {
    const phoneInput = document.getElementById('user-phone').value.trim();
    const loginBtn = document.getElementById('login-btn');
    
    if (!phoneInput) {
        alert("❌ ကျေးဇူးပြု၍ ဖုန်းနံပါတ် အရင်ရိုက်ထည့်ပါ!");
        return;
    }
    
    if (!navigator.onLine) {
        alert("🌐 အကောင့်အသစ်ဝင်ရန် သို့မဟုတ် အကောင့်စစ်ဆေးရန် အင်တာနက် လိုအပ်ပါသည်!");
        return;
    }
    
    loginBtn.innerText = "⏳ စစ်ဆေးနေပါသည်...";
    loginBtn.disabled = true;

    // 📡 Google Sheet ဆီကို လှမ်းစစ်ခိုင်းခြင်း
    fetch(google_script_url, {
        method: "POST",
        body: JSON.stringify({ action: "check_login", phoneNumber: phoneInput })
    })
    .then(res => res.json())
    .then(response => {
        loginBtn.innerText = "🔐 အကောင့်အတည်ပြုမည်";
        loginBtn.disabled = false;
        
        if (response.status === "approved") {
            // အကယ်၍ အောင်မြင်ရင် Sheet ကပေးတဲ့ Acc Type အတိုင်း (Acc1 သို့မဟုတ် Acc2) Auto မှတ်သားမည်
            localStorage.setItem('logged_phone', phoneInput);
            localStorage.setItem('logged_acc_type', response.accType);
            current_phone = phoneInput;
            current_acc_type = response.accType;
            
            alert(`🎉 အကောင့်ဝင်ရောက်မှု အောင်မြင်သည်။ သင့်အား [${response.accType}] အဖြစ် သတ်မှတ်ပေးလိုက်ပါသည်။`);
            checkLoginStatus();
        } else {
            // ၃ လုံးမြောက်ဆိုရင် ပိတ်ပင်မည်
            alert(response.message);
        }
    })
    .catch(err => {
        loginBtn.innerText = "🔐 အကောင့်အတည်ပြုမည်";
        loginBtn.disabled = false;
        alert("❌ ချိတ်ဆက်မှု အဆင်မပြေပါ။ ခေတ္တစောင့်ပြီး ပြန်ကြိုးစားပါ။");
    });
}

function logoutUser() {
    if (confirm("🏃 အကောင့်ထဲမှ ထွက်ရန် သေချာပါသလား?")) {
        localStorage.removeItem('logged_phone');
        localStorage.removeItem('logged_acc_type');
        current_phone = "";
        current_acc_type = "";
        document.getElementById('user-phone').value = "";
        checkLoginStatus();
    }
}

function toggleBankNameInput() {
    const method = document.getElementById('method').value;
    const bankSelect = document.getElementById('bank-select');
    if (method === "Banking") {
        bankSelect.style.display = "block";
        toggleCustomBankInput();
    } else {
        bankSelect.style.display = "none";
        document.getElementById('custom-bank-name').style.display = "none";
    }
}

function toggleCustomBankInput() {
    const bankSelect = document.getElementById('bank-select').value;
    const customBankInput = document.getElementById('custom-bank-name');
    if (bankSelect === "Other") {
        customBankInput.style.display = "block";
    } else {
        customBankInput.style.display = "none";
        customBankInput.value = ""; 
    }
}

function convertBurmeseToEnglish(input) {
    const burmeseNumbers = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
    let output = input.toString();
    for (let i = 0; i < 10; i++) {
        output = output.replace(new RegExp(burmeseNumbers[i], 'g'), i);
    }
    return output;
}

function fetchDataFromGoogleSheets() {
    if (!navigator.onLine || !current_phone) return;

    fetch(`${google_script_url}?phoneNumber=${current_phone}&accType=${current_acc_type}`)
        .then(response => response.json())
        .then(data => {
            transactions = data;
            unsynced_items.forEach(item => {
                if (!transactions.some(t => t.id === item.id)) {
                    transactions.push(item);
                }
            });
            localStorage.setItem(`off_tx_${current_phone}_${current_acc_type}`, JSON.stringify(transactions));
            render();
        })
        .catch(error => console.log("အော့ဖ်လိုင်း ဆက်သုံးနိုင်ပါသည်"));
}

function addTransaction(type) {
    const amountInput = document.getElementById('amount');
    const descInput = document.getElementById('description');
    const methodInput = document.getElementById('method');
    const bankSelect = document.getElementById('bank-select');
    const customBankInput = document.getElementById('custom-bank-name');
    
    if (!amountInput.value || !descInput.value) {
        alert("📊 ပမာဏနှင့် အကြောင်းအရာကို ဖြည့်ပါ။");
        return;
    }

    let finalBankName = methodInput.value === "Banking" ? (bankSelect.value === "Other" ? customBankInput.value.trim() : bankSelect.value) : "Cash";
    if (methodInput.value === "Banking" && bankSelect.value === "Other" && !finalBankName) {
        alert("✏️ ဘဏ်နာမည် ရိုက်ထည့်ပေးပါ။"); return;
    }

    let cleanAmount = convertBurmeseToEnglish(amountInput.value).replace(/,/g, '').trim();
    const parsedAmount = parseFloat(cleanAmount);
    if (isNaN(parsedAmount)) { alert("❌ ဂဏန်း မှန်ကန်စွာ ရိုက်ထည့်ပါ။"); return; }

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 
    const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const new_item = {
        id: Date.now().toString(), type: type, amount: parsedAmount, description: descInput.value,
        date: formattedDate, time: formattedTime, method: methodInput.value, bankName: finalBankName 
    };

    transactions.push(new_item);
    localStorage.setItem(`off_tx_${current_phone}_${current_acc_type}`, JSON.stringify(transactions));
    
    unsynced_items.push(new_item);
    localStorage.setItem(`un_syn_${current_phone}_${current_acc_type}`, JSON.stringify(unsynced_items));
    
    render();
    amountInput.value = ''; descInput.value = ''; customBankInput.value = '';

    if (navigator.onLine) { syncOfflineDataToGoogle(); }
}
function syncOfflineDataToGoogle() {
    if (!navigator.onLine || unsynced_items.length === 0 || !current_phone) return;

    const item_to_sync = unsynced_items[0];
    const payload = {
        action: "add",
        phoneNumber: current_phone, 
        accType: current_acc_type,   
        id: item_to_sync.id, type: item_to_sync.type, amount: item_to_sync.amount,
        description: item_to_sync.description, date: item_to_sync.date, time: item_to_sync.time,
        method: item_to_sync.method, bankName: item_to_sync.bankName 
    };

    fetch(google_script_url, { method: "POST", body: JSON.stringify(payload) })
    .then(res => res.json())
    .then(response => {
        if (response.status === "success") {
            unsynced_items = unsynced_items.filter(item => item.id !== item_to_sync.id);
            localStorage.setItem(`un_syn_${current_phone}_${current_acc_type}`, JSON.stringify(unsynced_items));
            syncOfflineDataToGoogle();
        }
    })
    .catch(err => console.log("လိုင်းပြန်တက်လာသည်အထိ စောင့်နေပါသည်"));
}

function cleanDate(dateStr) {
    if (!dateStr) return "ရက်စွဲမရှိ";
    let s = dateStr.toString().trim();
    if (s.length > 10 && (s.includes("GMT") || s.includes("00:00:00"))) {
        try {
            const d = new Date(s);
            if (!isNaN(d.getTime())) {
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
        } catch(e){}
    }
    return s.includes("T") ? s.split("T")[0] : s;
}

function cleanTime(timeStr) {
    if (!timeStr) return "";
    let s = timeStr.toString().trim();
    if (s.includes("GMT") && s.includes(":")) {
        let match = s.match(/\d{2}:\d{2}/); if (match) return match[0];
    }
    return s;
}
function render() {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    if(!current_phone) return;
    
    let totalIncome = 0, totalExpense = 0, bankingBalance = 0, cashBalance = 0;

    transactions.forEach(t => {
        const amt = Number(t.amount);
        const m = t.method ? t.method : "Banking";
        if (t.type === 'ဝင်ငွေ') {
            totalIncome += amt; if (m === "Banking") bankingBalance += amt; else cashBalance += amt;
        } else {
            totalExpense += amt; if (m === "Banking") bankingBalance -= amt; else cashBalance -= amt;
        }
    });

    const filterDate = document.getElementById('filter-date').value; 
    const filterBank = document.getElementById('filter-bank').value;
    const filterText = document.getElementById('filter-text').value.toLowerCase().trim();
    let filteredSelectedBankBalance = 0;

    const displayedTransactions = transactions.filter(t => {
        const matchDate = filterDate ? (cleanDate(t.date) === filterDate) : true;
        let matchBank = true; const bName = t.bankName ? t.bankName : "";
        if (filterBank === "Cash") matchBank = (t.method === "Cash" || bName === "Cash");
        else if (filterBank === "Other") {
            matchBank = (t.method === "Banking" && !["Kpay", "Wavepay", "AYAPay", "CBPay", "KBZ Bank", "CB Bank", "AYA Bank", "Cash"].includes(bName));
        } else if (filterBank !== "All") matchBank = (bName === filterBank);

        const matchText = filterText ? (t.description ? t.description.toLowerCase().includes(filterText) : false) : true;
        return matchDate && matchBank && matchText;
    });

    if (filterBank !== "All") {
        transactions.forEach(t => {
            let isThisBank = false; const bName = t.bankName ? t.bankName : "";
            if (filterBank === "Cash" && (t.method === "Cash" || bName === "Cash")) isThisBank = true;
            else if (filterBank === "Other" && t.method === "Banking" && !["Kpay", "Wavepay", "AYAPay", "CBPay", "KBZ Bank", "CB Bank", "AYA Bank", "Cash"].includes(bName)) isThisBank = true;
            else if (bName === filterBank) isThisBank = true;

            if (isThisBank) { if (t.type === 'ဝင်ငွေ') filteredSelectedBankBalance += Number(t.amount); else filteredSelectedBankBalance -= Number(t.amount); }
        });
        const balDiv = document.getElementById('filter-balance-div'); balDiv.style.display = "block";
        balDiv.innerHTML = `💡 လက်ကျန်စုစုပေါင်း: <span style="color:#2ecc71;">${filteredSelectedBankBalance.toLocaleString()} ကျပ်</span>`;
    } else { document.getElementById('filter-balance-div').style.display = "none"; }

    if (displayedTransactions.length === 0) { list.innerHTML = '<li>📭 မှတ်တမ်းမရှိသေးပါ။</li>'; }

    displayedTransactions.forEach(t => {
        const li = document.createElement('li'); li.classList.add(t.type === 'ဝင်ငွေ' ? 'inc' : 'exp');
        const sync_icon = unsynced_items.some(item => item.id === t.id) ? " ☁️ (Offline)" : "";
        let bankShowName = t.bankName === "Kpay" ? "KBZ Pay" : (t.bankName === "Wavepay" ? "Wave Pay" : (t.bankName ? t.bankName : "Banking"));
        
        li.innerHTML = `
            <div>
                <span style="display: block; font-weight: bold;">${t.description}${sync_icon}</span>
                <span style="font-size: 11px; color: #7f8c8d;">📅 ${cleanDate(t.date)} 🕒 ${cleanTime(t.time)} | <b>${t.method === "Cash" ? "💵 Cash" : `🏦 ${bankShowName}`}</b></span>
            </div>
            <div style="text-align: right;">
                <b>${t.type === 'ဝင်ငွေ' ? '+' : '-'}${Number(t.amount).toLocaleString()} ကျပ်</b>
                <button onclick="deleteItem('${t.id}')" style="background: none; color: #e74c3c; border: none; font-size: 16px; margin-left: 10px; cursor: pointer; display: inline;">❌</button>
            </div>
        `;
        list.appendChild(li);
    });

    document.getElementById('total-income').innerText = totalIncome.toLocaleString() + " ကျပ်";
    document.getElementById('total-expense').innerText = totalExpense.toLocaleString() + " ကျပ်";
    document.getElementById('banking-balance').innerText = bankingBalance.toLocaleString() + " ကျပ်";
    document.getElementById('cash-balance').innerText = cashBalance.toLocaleString() + " ကျပ်";
    document.getElementById('net-balance').innerText = (bankingBalance + cashBalance).toLocaleString() + " ကျပ်";
}

function clearFilter() {
    document.getElementById('filter-date').value = ''; document.getElementById('filter-bank').value = 'All'; document.getElementById('filter-text').value = ''; render(); 
}

function deleteItem(id) {
    const savedDeletePassword = localStorage.getItem('delete_password');
    if (!savedDeletePassword) {
        const newPassword = prompt("🔑 စာရင်းဖျက်ရန် စကားဝှက်အသစ် သတ်ပါ:");
        if (!newPassword || !newPassword.trim()) return;
        localStorage.setItem('delete_password', newPassword); alert("🎉 သတ်မှတ်ပြီးပါပြီ။"); return;
    }
    const inputPassword = prompt("🔐 စကားဝှက် ရိုက်ထည့်ပါ:"); if (inputPassword !== savedDeletePassword) { alert("❌ မှားယွင်းနေပါသည်။"); return; }

    if (confirm("⚠️ ဤမှတ်တမ်းကို အပြီးဖျက်မည်လား?")) {
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem(`off_tx_${current_phone}_${current_acc_type}`, JSON.stringify(transactions));
        unsynced_items = unsynced_items.filter(item => item.id !== id);
        localStorage.setItem(`un_syn_${current_phone}_${current_acc_type}`, JSON.stringify(unsynced_items));
        render();

        if (navigator.onLine) {
            fetch(google_script_url, { method: "POST", body: JSON.stringify({ action: "delete", phoneNumber: current_phone, accType: current_acc_type, id: id }) });
        }
    }
}
