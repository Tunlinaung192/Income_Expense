// ⚠️ သင်ရရှိလာသော Google Web App URL ကို အောက်ကနေရာမှာ အစားထိုးပါ
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

        // ✨ Admin ဖြစ်ပါက User တိုးသည့် ဘောင်ကိုပါ တွဲဖွင့်ပေးမည်
        if (current_acc_type === "Admin") {
            document.getElementById('admin-panel').style.display = "block";
        } else {
            document.getElementById('admin-panel').style.display = "none";
        }
        
        transactions = localStorage.getItem(`off_tx_${current_phone}_${current_acc_type}`) ? JSON.parse(localStorage.getItem(`off_tx_${current_phone}_${current_acc_type}`)) : [];
        unsynced_items = localStorage.getItem(`un_syn_${current_phone}_${current_acc_type}`) ? JSON.parse(localStorage.getItem(`un_syn_${current_phone}_${current_acc_type}`)) : [];
        
        render();
        fetchDataFromGoogleSheets();
        window.addEventListener('online', syncOfflineDataToGoogle);
        if (navigator.onLine) { syncOfflineDataToGoogle(); }
    } else {
        document.getElementById('login-section').style.display = "block";
        document.getElementById('main-app').style.display = "none";
        document.getElementById('admin-panel').style.display = "none";
    }
}
function loginUser() {
    const phoneInput = document.getElementById('user-phone').value.trim();
    const passInput = document.getElementById('user-password').value.trim();
    const loginBtn = document.getElementById('login-btn');
    
    if (!phoneInput || !passInput) {
        alert("❌ ကျေးဇူးပြု၍ ဖုန်းနံပါတ်နှင့် ဝင်ခွင့်ကုဒ် နှစ်ခုလုံး ဖြည့်သွင်းပါ!"); return;
    }
    if (!navigator.onLine) { alert("🌐 အကောင့်ဝင်ရောက်ရန် အင်တာနက် လိုအပ်ပါသည်!"); return; }
    
    loginBtn.innerText = "⏳ စစ်ဆေးနေပါသည်..."; loginBtn.disabled = true;

    fetch(google_script_url, {
        method: "POST",
        body: JSON.stringify({ action: "check_login", phoneNumber: phoneInput, password: passInput })
    })
    .then(res => res.json())
    .then(response => {
        loginBtn.innerText = "🔐 အကောင့်အတည်ပြုမည်"; loginBtn.disabled = false;
        
        if (response.status === "approved") {
            localStorage.setItem('logged_phone', phoneInput);
            localStorage.setItem('logged_acc_type', response.accType);
            current_phone = phoneInput; current_acc_type = response.accType;
            
            if(response.accType === "Admin") { alert("👑 မင်္ဂလာပါ Admin။ စာရင်းသွင်းခြင်းနှင့် စီမံခန့်ခွဲခြင်းကို ပြုလုပ်နိုင်ပါပြီ။"); }
            else { alert(`🎉 အကောင့်ဝင်ရောက်မှု အောင်မြင်သည်။ [${response.accType}] အဖြစ် သတ်မှတ်ပေးလိုက်ပါသည်။`); }
            
            document.getElementById('user-password').value = "";
            checkLoginStatus();
        } else { alert(response.message); }
    })
    .catch(err => {
        loginBtn.innerText = "🔐 အကောင့်အတည်ပြုမည်"; loginBtn.disabled = false;
        alert("❌ ချิตဆက်မှု အဆင်မပြေပါ။ ခေတ္တစောင့်ပြီး ပြန်ကြိုးစားပါ။");
    });
}

function logoutUser() {
    if (navigator.onLine && current_phone) {
        fetch(google_script_url, {
            method: "POST",
            body: JSON.stringify({ action: "logout_release", phoneNumber: current_phone, accType: current_acc_type })
        });
    }
    localStorage.removeItem('logged_phone');
    localStorage.removeItem('logged_acc_type');
    current_phone = ""; current_acc_type = "";
    checkLoginStatus();
}

function adminRegisterUser() {
    const rPhone = document.getElementById('reg-phone').value.trim();
    const rPass = document.getElementById('reg-password').value.trim();
    
    if (!rPhone || !rPass) { alert("❌ ဖုန်းနံပါတ်နှင့် Password ဖြည့်ပါ!"); return; }
    if (!navigator.onLine) { alert("🌐 အင်တာနက် ချိတ်ဆက်ထားရန် လိုအပ်သည်!"); return; }
    
    fetch(google_script_url, {
        method: "POST",
        body: JSON.stringify({ action: "admin_register_user", regPhoneNumber: rPhone, regPassword: rPass })
    })
    .then(res => res.json())
    .then(response => {
        alert(response.message);
        if (response.status === "success") {
            document.getElementById('reg-phone').value = "";
            document.getElementById('reg-password').value = "";
        }
    })
    .catch(err => alert("❌ အကောင့်တိုး၍ မရသေးပါ။ ပြန်ကြိုးစားကြည့်ပါ။"));
}
function addTransaction(type) {
    const amountInput = document.getElementById('amount').value.trim();
    const descInput = document.getElementById('description').value.trim();
    const methodInput = document.getElementById('method').value;
    
    let bankNameInput = "Cash";
    if (methodInput === "Banking") {
        const bankSelect = document.getElementById('bank-select').value;
        bankNameInput = (bankSelect === "Other") ? document.getElementById('custom-bank-name').value.trim() : bankSelect;
        if (!bankNameInput) { alert("❌ ကျေးဇူးပြု၍ ဘဏ်နာမည် ထည့်ပါ!"); return; }
    }

    if (!amountInput || !descInput) { alert("❌ ကျေးဇူးပြု၍ ပမာဏနှင့် အကြောင်းအရာ ဖြည့်စွက်ပါ!"); return; }

    const now = new Date();
    const newTx = {
        id: now.getTime().toString(),
        accType: current_acc_type,
        type: type,
        amount: parseFloat(amountInput),
        description: descInput,
        date: now.toLocaleDateString('en-CA'),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        method: methodInput,
        bankName: bankNameInput
    };

    transactions.unshift(newTx);
    saveToLocal(); render();

    document.getElementById('amount').value = "";
    document.getElementById('description').value = "";

    if (navigator.onLine) { sendDataToGoogle(newTx); } 
    else {
        unsynced_items.push(newTx); saveToLocal();
        alert("⚠️ အော့ဖ်လိုင်းဖြစ်နေ၍ ဖုန်းထဲတွင်သာ သိမ်းထားပါသည်။ လိုင်းရလျှင် Sheet သို့ Auto ပို့ပေးပါမည်။");
    }
}

function sendDataToGoogle(item) {
    fetch(google_script_url, {
        method: "POST",
        body: JSON.stringify({ action: "add", phoneNumber: current_phone, ...item })
    }).catch(err => { unsynced_items.push(item); saveToLocal(); });
}

function deleteTransaction(id) {
    if (!confirm("⚠️ ဤစာရင်းအား ဖြတ်ပစ်ရန် သေချာပါသလား?")) return;
    transactions = transactions.filter(t => t.id.toString() !== id.toString());
    saveToLocal(); render();

    if (navigator.onLine) {
        fetch(google_script_url, {
            method: "POST",
            body: JSON.stringify({ action: "delete", phoneNumber: current_phone, id: id })
        });
    }
}

function fetchDataFromGoogleSheets() {
    if (!navigator.onLine) return;
    // Admin ဖတ်လျှင် အကောင့်အမျိုးအစားကိုပါ လှမ်းပို့၍ အော်တိုဖတ်မည်
    fetch(`${google_script_url}?phoneNumber=${current_phone}&accType=${current_acc_type}`)
    .then(res => res.json())
    .then(data => {
        if (data && data.length > 0) { transactions = data.reverse(); saveToLocal(); render(); }
    });
}

function syncOfflineDataToGoogle() {
    if (unsynced_items.length === 0) return;
    let itemsToSync = [...unsynced_items]; unsynced_items = []; saveToLocal();
    itemsToSync.forEach(item => { sendDataToGoogle(item); });
}

function saveToLocal() {
    localStorage.setItem(`off_tx_${current_phone}_${current_acc_type}`, JSON.stringify(transactions));
    localStorage.setItem(`un_syn_${current_phone}_${current_acc_type}`, JSON.stringify(unsynced_items));
}

function render() {
    const list = document.getElementById('transaction-list');
    const filterDate = document.getElementById('filter-date').value;
    const filterBank = document.getElementById('filter-bank').value;
    const filterText = document.getElementById('filter-text').value.toLowerCase().trim();
    
    list.innerHTML = "";
    let income = 0, expense = 0, bankingBal = 0, cashBal = 0;
    let filteredIncome = 0, filteredExpense = 0;
    let isFiltering = (filterDate || filterBank !== "All" || filterText);

    transactions.forEach(t => {
        let amt = parseFloat(t.amount);
        if (t.type === "ဝင်ငွေ") {
            income += amt; if (t.method === "Banking") bankingBal += amt; else cashBal += amt;
        } else {
            expense += amt; if (t.method === "Banking") bankingBal -= amt; else cashBal -= amt;
        }

        if (filterDate && t.date !== filterDate) return;
        if (filterBank !== "All") {
            if (filterBank === "Cash" && t.method !== "Cash") return;
            if (filterBank === "Other" && (t.method !== "Banking" || ["Kpay","Wavepay","AYAPay","CBPay","KBZ Bank","CB Bank","AYA Bank"].includes(t.bankName))) return;
            if (filterBank !== "Cash" && filterBank !== "Other" && t.bankName !== filterBank) return;
        }
        if (filterText && !t.description.toLowerCase().includes(filterText)) return;

        if (t.type === "ဝင်ငွေ") filteredIncome += amt; else filteredExpense += amt;

        const li = document.createElement('li');
        li.className = t.type === "ဝင်ငွေ" ? "list-inc" : "list-exp";
        li.innerHTML = `
            <div class="list-details">
                <strong>${t.description}</strong> <small>(${t.method === "Cash" ? "💵 ငွေသား" : "🏦 " + t.bankName})</small><br>
                <span class="list-time">📅 ${t.date} | ⏰ ${t.time}</span>
            </div>
            <div class="list-action">
                <span class="list-amt">${t.type === "ဝင်ငွေ" ? "+" : "-"}${amt.toLocaleString()} ကျပ်</span>
                <button onclick="deleteTransaction('${t.id}')">❌</button>
            </div>
        `;
        list.appendChild(li);
    });

    document.getElementById('total-income').innerText = `${income.toLocaleString()} ကျပ်`;
    document.getElementById('total-expense').innerText = `${expense.toLocaleString()} ကျပ်`;
    document.getElementById('net-balance').innerText = `${(income - expense).toLocaleString()} ကျပ်`;
    document.getElementById('banking-balance').innerText = `${bankingBal.toLocaleString()} ကျပ်`;
    document.getElementById('cash-balance').innerText = `${cashBal.toLocaleString()} ကျပ်`;

    const filterDiv = document.getElementById('filter-balance-div');
    if (isFiltering) {
        filterDiv.style.display = "block";
        filterDiv.innerHTML = `🔍 ရှာဖွေထားသောပြကွက်လက်ကျန်: <strong style="color:${(filteredIncome - filteredExpense) >= 0 ? '#27ae60':'#e74c3c'}">${(filteredIncome - filteredExpense).toLocaleString()} ကျပ်</strong><br>
        <small>(ဝင်ငွေ: +${filteredIncome.toLocaleString()} | ထွက်ငွေ: -${filteredExpense.toLocaleString()})</small>`;
    } else { filterDiv.style.display = "none"; }
}

function clearFilter() {
    document.getElementById('filter-date').value = "";
    document.getElementById('filter-bank').value = "All";
    document.getElementById('filter-text').value = "";
    render();
}

function toggleBankNameInput() {
    const method = document.getElementById('method').value;
    const bankSelect = document.getElementById('bank-select');
    if (method === "Cash") {
        bankSelect.style.display = "none"; document.getElementById('custom-bank-name').style.display = "none";
    } else { bankSelect.style.display = "block"; toggleCustomBankInput(); }
}

function toggleCustomBankInput() {
    const bankSelect = document.getElementById('bank-select').value;
    document.getElementById('custom-bank-name').style.display = (bankSelect === "Other") ? "block" : "none";
}
