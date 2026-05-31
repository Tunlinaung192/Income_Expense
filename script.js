// ⚠️ သင်ရရှိလာသော Google Web App URL ကို အောက်ကနေရာမှာ အစားထိုးပါ
const google_script_url = "သင်ရလာတဲ့_Google_Web_App_URL_ကို_ဒီမှာထည့်ပါ";

let current_phone = localStorage.getItem('logged_phone') ? localStorage.getItem('logged_phone') : "";
let current_acc_type = localStorage.getItem('logged_acc_type') ? localStorage.getItem('logged_acc_type') : "";

let transactions = [];
let unsynced_items = [];

// App စတင်ပွင့်လာချိန်တွင် အလုပ်လုပ်မည့်နေရာ
window.onload = function() {
    checkLoginStatus();
    toggleBankNameInput(); 
};

// မြန်မာဂဏန်းကို အင်္ဂလိပ်ဂဏန်းသို့ ပြောင်းပေးသည့် ဖန်ရှင်
function convertMyanmarToEnglishDigits(input) {
    const myanmarDigits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
    return input.toString().replace(/[၀-၉]/g, function(ch) {
        return myanmarDigits.indexOf(ch);
    });
}

// အသုံးပြုသူ၏ အကောင့်ဝင်မှုအခြေအနေအလိုက် ပိတ်/ဖွင့် စစ်ဆေးခြင်း
function checkLoginStatus() {
    if (current_phone && current_acc_type) {
        document.getElementById('login-section').style.display = "none";
        document.getElementById('main-app').style.display = "block";
        document.getElementById('active-user-display').innerText = `📱 ${current_phone} (${current_acc_type})`;

        // Admin ဖြစ်ပါက User တိုးသည့် ဘောင်ကိုပါ တွဲဖွင့်ပေးမည်
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
// အကောင့်ဝင်ရန် လုပ်ဆောင်ချက်
function loginUser() {
    let phoneInput = document.getElementById('user-phone').value.trim();
    let passInput = document.getElementById('user-password').value.trim();
    const loginBtn = document.getElementById('login-btn');
    
    phoneInput = convertMyanmarToEnglishDigits(phoneInput);
    passInput = convertMyanmarToEnglishDigits(passInput);
    
    if (!phoneInput || !passInput) { alert("❌ ကျေးဇူးပြု၍ ဖုန်းနံပါတ်နှင့် ဝင်ခွင့်ကုဒ် နှစ်ခုလုံး ဖြည့်သွင်းပါ!"); return; }
    if (!navigator.onLine) { alert("🌐 အကောင့်ဝင်ရောက်ရန် အင်တာနက် လိုအပ်ပါသည်!"); return; }
    
    loginBtn.innerText = "⏳ စစ်ဆေးနေပါသည်..."; loginBtn.disabled = true; loginBtn.classList.add("btn-loading");

    fetch(google_script_url, {
        method: "POST",
        body: JSON.stringify({ action: "check_login", phoneNumber: phoneInput, password: passInput })
    })
    .then(res => res.json())
    .then(response => {
        loginBtn.innerText = "🔐 အကောင့်အတည်ပြုမည်"; loginBtn.disabled = false; loginBtn.classList.remove("btn-loading");
        
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
        loginBtn.innerText = "🔐 အကောင့်အတည်ပြုမည်"; loginBtn.disabled = false; loginBtn.classList.remove("btn-loading");
        alert("❌ ချက်ဆက်မှု အဆင်မပြေပါ။ ခေတ္တစောင့်ပြီး ပြန်ကြိုးစားပါ။");
    });
}

// အကောင့်မှ ထွက်ရန် (Logout)
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

// 🔐 အသုံးပြုသူ User အသစ် တိုးရန် တောင်းဆိုခြင်း (Main Admin Password တောင်းခံသည့်စနစ်)
function adminRegisterUser() {
    let rPhone = document.getElementById('reg-phone').value.trim();
    let rPass = document.getElementById('reg-password').value.trim();
    
    rPhone = convertMyanmarToEnglishDigits(rPhone);
    rPass = convertMyanmarToEnglishDigits(rPass);
    
    if (!rPhone || !rPass) { alert("❌ ဖုန်းနံပါတ်နှင့် Password ဖြည့်ပါ!"); return; }
    if (!navigator.onLine) { alert("🌐 အင်တာနက် ချိတ်ဆက်ထားရန် လိုအပ်သည်!"); return; }

    const adminVerifyPass = prompt("🔑 ဤအကောင့်အသစ်ကို စောင့်ဆိုင်းစာရင်းသို့ တင်သွင်းရန် Admin Password ကို ရိုက်ထည့်ပါ:");
    if (adminVerifyPass === null) return;
    if (adminVerifyPass.trim() !== "038858") {
        alert("❌ Admin Password မှားယွင်းနေသဖြင့် အကောင့်တိုးခွင့် မရှိပါ။"); return;
    }
    
    fetch(google_script_url, {
        method: "POST",
        body: JSON.stringify({ action: "admin_register_user", regPhoneNumber: rPhone, regPassword: rPass })
    })
    .then(res => res.json())
    .then(response => {
        alert(response.message);
        if (response.status === "pending" || response.status === "success") {
            document.getElementById('reg-phone').value = "";
            document.getElementById('reg-password').value = "";
            if(current_acc_type === "Admin") { fetchPendingUsers(); }
        }
    })
    .catch(err => alert("❌ အကောင့်တိုး၍ မရသေးပါ။ ပြန်ကြိုးစားကြည့်ပါ။"));
}
// စာရင်းအသစ်ထည့်သွင်းရန် လုပ်ဆောင်ချက်
function addTransaction(type) {
    let amountInput = document.getElementById('amount').value.trim();
    const descInput = document.getElementById('description').value.trim();
    const methodInput = document.getElementById('method').value;
    
    amountInput = convertMyanmarToEnglishDigits(amountInput);

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

    if (navigator.onLine) {
        fetch(google_script_url, {
            method: "POST",
            body: JSON.stringify({ action: "add", phoneNumber: current_phone, ...newTx })
        })
        .then(res => res.json())
        .then(resData => {
            alert(resData.message);
            if (resData.status === "success") {
                transactions.unshift(newTx); saveToLocal(); render();
            }
        });
    } else {
        alert("🌐 အော့ဖ်လိုင်းဖြစ်နေပါသဖြင့် စာရင်းသွင်း၍မရနိုင်ပါ။ အင်တာနက်ချိတ်ဆက်မှု လိုအပ်သည်။");
    }

    document.getElementById('amount').value = "";
    document.getElementById('description').value = "";
}

function sendDataToGoogle(item) {} // Background sync ဖန်ရှင်ဟောင်းနေရာ (ဒုက္ခမပေးရန် ချန်ထားခဲ့ပါသည်)

// 🔐 စာရင်းမှတ်တမ်းဖျက်ရန် (လုံခြုံရေး Password စနစ်ဖြင့်)
function deleteTransaction(id) {
    const deletePass = prompt("🔑 ဤစာရင်းအား ဖြတ်ပစ်ရန်အတွက် လုံခြုံရေး Password ကို ရိုက်ထည့်ပါ:");
    if (deletePass === null) return;
    if (!deletePass.trim()) { alert("❌ Password ရိုက်ထည့်ရန် လိုအပ်ပါသည်!"); return; }
    if (!navigator.onLine) { alert("🌐 စာရင်းဖျက်ရန်အတွက် အင်တာနက်ချိတ်ဆက်မှု လိုအပ်ပါသည်!"); return; }

    fetch(google_script_url, {
        method: "POST",
        body: JSON.stringify({ action: "delete", phoneNumber: current_phone, id: id, deletePassword: deletePass.trim() })
    })
    .then(res => res.json())
    .then(response => {
        if (response.status === "success") {
            alert("🗑️ စာရင်းကို အောင်မြင်စွာ ဖျက်သိမ်းပြီးပါပြီ။");
            transactions = transactions.filter(t => t.id.toString() !== id.toString());
            saveToLocal(); render();
        } else { alert(response.message); }
    });
}

function fetchDataFromGoogleSheets() {
    if (!navigator.onLine) return;
    fetch(`${google_script_url}?phoneNumber=${current_phone}&accType=${current_acc_type}`)
    .then(res => res.json())
    .then(data => {
        if (data && data.length > 0) { transactions = data.reverse(); saveToLocal(); render(); }
    });
}

function syncOfflineDataToGoogle() {}

function saveToLocal() {
    localStorage.setItem(`off_tx_${current_phone}_${current_acc_type}`, JSON.stringify(transactions));
    localStorage.setItem(`un_syn_${current_phone}_${current_acc_type}`, JSON.stringify(unsynced_items));
}
// စာရင်းဇယားများကို တွက်ချက်ပြီး မျက်နှာပြင်ပေါ်တွင် ပြသရန်
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

    // Admin ဝင်ထားပါက အကောင့်သစ် စောင့်ဆိုင်းစာရင်းကိုပါ ဆွဲတင်ပြသမည်
    if (current_acc_type === "Admin") { fetchPendingUsers(); }
}

// ⏳ Admin ကြည့်ရန် ခွင့်ပြုချက်စောင့်ဆိုင်းနေသော အကောင့်အသစ်များအား ဆွဲယူပြသခြင်း
function fetchPendingUsers() {
    if (!navigator.onLine || current_acc_type !== "Admin") return;
    
    fetch(`${google_script_url}?phoneNumber=${current_phone}&accType=${current_acc_type}&getPendingUsers=true`)
    .then(res => res.json())
    .then(data => {
        const uList = document.getElementById('admin-pending-users-list');
        uList.innerHTML = "";
        if (!data || data.length === 0) { uList.innerHTML = "<li style='font-size:13px; color:gray;'>စောင့်ဆိုင်းနေသော အကောင့်သစ်မရှိပါ။</li>"; return; }
        
        data.forEach(u => {
            const li = document.createElement('li');
            li.style.background = "#e3fafc";
            li.style.padding = "10px";
            li.style.marginBottom = "10px";
            li.style.borderRadius = "6px";
            li.style.borderLeft = "5px solid #0c8599";
            li.style.fontSize = "13px";
            li.style.display = "flex";
            li.style.justify = "space-between";
            li.style.alignItems = "center";
            
            li.innerHTML = `
                <div>
                    📱 ဖုန်းနံပါတ်: <strong>${u.requestedPhone}</strong><br>
                    🔑 Password: <code>${u.requestedPassword}</code>
                </div>
                <div style="display:flex; gap:5px;">
                    <button onclick="adminUserApprovalAction('${u.id}', 'approve')" style="background:#2ecc71; padding:5px 8px; font-size:11px; width:auto;">✅ ခွင့်ပြု</button>
                    <button onclick="adminUserApprovalAction('${u.id}', 'reject')" style="background:#e74c3c; padding:5px 8px; font-size:11px; width:auto;">❌ ပယ်ဖျက်</button>
                </div>
            `;
            uList.appendChild(li);
        });
    });
}

// 🔐 အကောင့်သစ်ကို ခွင့်ပြုမည် (Approve) သို့မဟုတ် ပယ်ဖျက်မည်ကို နှိပ်သည့်အခါ လုပ်ဆောင်ချက် (Admin Password စစ်ဆေးခြင်းပါဝင်သည်)
function adminUserApprovalAction(id, subAction) {
    if (!navigator.onLine) { alert("အင်တာနက် လိုအပ်ပါသည်။"); return; }

    if (subAction === "approve") {
        const adminApprovePass = prompt("🔑 ဤအကောင့်အသစ်အား Users စာရင်းထဲသို့ လုံးဝအတည်ပြုထည့်သွင်းရန် Admin Password ရိုက်ထည့်ပါ:");
        if (adminApprovePass === null) return;
        if (adminApprovePass.trim() !== "038858") {
            alert("❌ Admin Password မှားယွင်းနေသဖြင့် ခွင့်ပြုခွင့်မရှိပါ။"); return;
        }
    } else {
        if (!confirm("⚠️ ဤအကောင့်တောင်းဆိုမှုကို ပယ်ဖျက်ရန် သေချာပါသလား?")) return;
    }

    fetch(google_script_url, {
        method: "POST",
        body: JSON.stringify({ action: "admin_action_user_approval", id: id, subAction: subAction })
    })
    .then(res => res.json())
    .then(resData => {
        alert(resData.message);
        fetchPendingUsers();
    });
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
