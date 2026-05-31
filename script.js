// ⚠️ သင်ရရှိလာသော Google Web App URL ကို အောက်ကနေရာမှာ အစားထိုးပါ
const google_script_url = "https://script.google.com/macros/s/AKfycbzEzRmewtz3q93A6GkaHTk9xgsRtGwW1PUkP3Fpp7MwoOp1f0S0qjrinyw31djjWUDr/exec";

let transactions = localStorage.getItem('offline_transactions') ? JSON.parse(localStorage.getItem('offline_transactions')) : [];
let unsynced_items = localStorage.getItem('unsynced_items') ? JSON.parse(localStorage.getItem('unsynced_items')) : [];

window.onload = function() {
    toggleBankNameInput(); 
    render(); 
    fetchDataFromGoogleSheets(); 
    
    window.addEventListener('online', syncOfflineDataToGoogle);
    if (navigator.onLine) {
        syncOfflineDataToGoogle();
    }
};

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
    if (!navigator.onLine) return;

    fetch(google_script_url)
        .then(response => response.json())
        .then(data => {
            transactions = data;
            unsynced_items.forEach(item => {
                if (!transactions.some(t => t.id === item.id)) {
                    transactions.push(item);
                }
            });
            localStorage.setItem('offline_transactions', JSON.stringify(transactions));
            render();
        })
        .catch(error => console.log("Google Sheets ဆွဲမရသော်လည်း ဖုန်းထဲကစာရင်းနှင့် ဆက်သုံးနိုင်ပါသည်"));
}

function addTransaction(type) {
    const amountInput = document.getElementById('amount');
    const descInput = document.getElementById('description');
    const methodInput = document.getElementById('method');
    const bankSelect = document.getElementById('bank-select');
    const customBankInput = document.getElementById('custom-bank-name');
    
    if (!amountInput.value || !descInput.value) {
        alert("📊 ပမာဏနှင့် အကြောင်းအရာကို ပြည့်စုံစွာဖြည့်ပါ။");
        return;
    }

    let finalBankName = "";
    if (methodInput.value === "Banking") {
        if (bankSelect.value === "Other") {
            if (!customBankInput.value.trim()) {
                alert("✏️ ကျေးဇူးပြု၍ ဘဏ်နာမည် ရိုက်ထည့်ပေးပါ။");
                return;
            }
            finalBankName = customBankInput.value.trim();
        } else {
            finalBankName = bankSelect.value;
        }
    } else {
        finalBankName = "Cash";
    }

    let cleanAmount = convertBurmeseToEnglish(amountInput.value);
    cleanAmount = cleanAmount.replace(/,/g, '').trim();
    const parsedAmount = parseFloat(cleanAmount);

    if (isNaN(parsedAmount)) {
        alert("❌ ကျေးဇူးပြု၍ ဂဏန်း မှန်ကန်စွာ ရိုက်ထည့်ပေးပါ။");
        return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const formattedDate = `${year}-${month}-${date}`; 
    const formattedTime = `${hours}:${minutes}`;

    const new_item = {
        id: Date.now().toString(),
        type: type,
        amount: parsedAmount,
        description: descInput.value,
        date: formattedDate, 
        time: formattedTime,
        method: methodInput.value,
        bankName: finalBankName 
    };

    transactions.push(new_item);
    localStorage.setItem('offline_transactions', JSON.stringify(transactions));
    
    unsynced_items.push(new_item);
    localStorage.setItem('unsynced_items', JSON.stringify(unsynced_items));
    
    render();

    amountInput.value = '';
    descInput.value = '';
    customBankInput.value = '';

    if (navigator.onLine) {
        syncOfflineDataToGoogle();
    }
}
function syncOfflineDataToGoogle() {
    if (!navigator.onLine || unsynced_items.length === 0) return;

    const item_to_sync = unsynced_items[0];
    const payload = {
        action: "add",
        id: item_to_sync.id,
        type: item_to_sync.type,
        amount: item_to_sync.amount,
        description: item_to_sync.description,
        date: item_to_sync.date,   
        time: item_to_sync.time,
        method: item_to_sync.method,
        bankName: item_to_sync.bankName 
    };

    fetch(google_script_url, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(response => {
        if (response.status === "success") {
            unsynced_items = unsynced_items.filter(item => item.id !== item_to_sync.id);
            localStorage.setItem('unsynced_items', JSON.stringify(unsynced_items));
            syncOfflineDataToGoogle();
        }
    })
    .catch(err => console.log("လိုင်းမတည်ငြိမ်သေးသဖြင့် ခေတ္တစောင့်ဆိုင်းနေပါသည်"));
}

function cleanDate(dateStr) {
    if (!dateStr) return "ရက်စွဲမရှိ";
    let s = dateStr.toString().trim();
    if (s.length > 10 && (s.includes("GMT") || s.includes("00:00:00"))) {
        try {
            const d = new Date(s);
            if (!isNaN(d.getTime())) {
                let y = d.getFullYear();
                let m = String(d.getMonth() + 1).padStart(2, '0');
                let date = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${date}`;
            }
        } catch(e){}
    }
    if (s.includes("T")) return s.split("T")[0];
    return s;
}

function cleanTime(timeStr) {
    if (!timeStr) return "";
    let s = timeStr.toString().trim();
    if (s.includes("GMT") && s.includes(":")) {
        let match = s.match(/\d{2}:\d{2}/);
        if (match) return match[0];
    }
    return s;
}
function render() {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    
    let totalIncome = 0;
    let totalExpense = 0;
    let bankingBalance = 0;
    let cashBalance = 0;

    // ၁။ စာရင်းစုစုပေါင်းတွေကို အရင်တွက်ချက်ခြင်း
    transactions.forEach(t => {
        const amt = Number(t.amount);
        const m = t.method ? t.method : "Banking";
        
        if (t.type === 'ဝင်ငွေ') {
            totalIncome += amt;
            if (m === "Banking") bankingBalance += amt;
            else cashBalance += amt;
        } else {
            totalExpense += amt;
            if (m === "Banking") bankingBalance -= amt;
            else cashBalance -= amt;
        }
    });

    // ၂။ 🔍 အဆင့်မြင့် Filter စစ်ထုတ်မှုအပိုင်း
    const filterDate = document.getElementById('filter-date').value; 
    const filterBank = document.getElementById('filter-bank').value;
    const filterText = document.getElementById('filter-text').value.toLowerCase().trim();

    let filteredSelectedBankBalance = 0; // ဘဏ်တစ်ခုချင်းစီရဲ့ သီးသန့်လက်ကျန်တွက်ရန်

    const displayedTransactions = transactions.filter(t => {
        const matchDate = filterDate ? (cleanDate(t.date) === filterDate) : true;
        
        // ဘဏ်အမျိုးအစား စစ်ဆေးခြင်း
        let matchBank = true;
        const bName = t.bankName ? t.bankName : "";
        if (filterBank === "Cash") {
            matchBank = (t.method === "Cash" || bName === "Cash");
        } else if (filterBank === "Other") {
            const staticBanks = ["Kpay", "Wavepay", "AYAPay", "CBPay", "KBZ Bank", "CB Bank", "AYA Bank", "Cash"];
            matchBank = (t.method === "Banking" && !staticBanks.includes(bName));
        } else if (filterBank !== "All") {
            matchBank = (bName === filterBank);
        }

        // စာသားမှတ်ချက် ရှာဖွေခြင်း
        const desc = t.description ? t.description.toLowerCase() : "";
        const matchText = filterText ? desc.includes(filterText) : true;
        
        return matchDate && matchBank && matchText;
    });

    // ၃။ ရွေးချယ်ထားတဲ့ ဘဏ်ရဲ့ လက်ကျန်ငွေ သီးသန့်တွက်ချက်ခြင်း
    if (filterBank !== "All") {
        transactions.forEach(t => {
            let isThisBank = false;
            const bName = t.bankName ? t.bankName : "";
            if (filterBank === "Cash" && (t.method === "Cash" || bName === "Cash")) isThisBank = true;
            else if (filterBank === "Other") {
                const staticBanks = ["Kpay", "Wavepay", "AYAPay", "CBPay", "KBZ Bank", "CB Bank", "AYA Bank", "Cash"];
                if (t.method === "Banking" && !staticBanks.includes(bName)) isThisBank = true;
            } else if (bName === filterBank) {
                isThisBank = true;
            }

            if (isThisBank) {
                if (t.type === 'ဝင်ငွေ') filteredSelectedBankBalance += Number(t.amount);
                else filteredSelectedBankBalance -= Number(t.amount);
            }
        });
        
        const balDiv = document.getElementById('filter-balance-div');
        balDiv.style.display = "block";
        balDiv.innerHTML = `💡 ရွေးထားသော အမျိုးအစား၏ လက်ကျန်စုစုပေါင်း: <span style="color:#2ecc71;">${filteredSelectedBankBalance.toLocaleString()} ကျပ်</span>`;
    } else {
        document.getElementById('filter-balance-div').style.display = "none";
    }

    if (displayedTransactions.length === 0) {
        list.innerHTML = '<li>📭 ရှာဖွေမှုနှင့် ကိုက်ညီသော မှတ်တမ်းမရှိသေးပါ။</li>';
    }

    // ၄။ မျက်နှာပြင်ပေါ်တင်ပြခြင်း
    displayedTransactions.forEach(t => {
        const li = document.createElement('li');
        li.classList.add(t.type === 'ဝင်ငွေ' ? 'inc' : 'exp');
        
        const is_unsynced = unsynced_items.some(item => item.id === t.id);
        const sync_icon = is_unsynced ? " ☁️ (Offline)" : "";

        const displayDate = cleanDate(t.date);
        const displayTime = cleanTime(t.time);
        
        let bankShowName = t.bankName ? t.bankName : "Banking";
        if (bankShowName === "Kpay") bankShowName = "KBZ Pay";
        if (bankShowName === "Wavepay") bankShowName = "Wave Pay";
        
        const methodType = t.method === "Cash" ? "💵 Cash" : `🏦 ${bankShowName}`;

        li.innerHTML = `
            <div>
                <span style="display: block; font-weight: bold;">${t.description}${sync_icon}</span>
                <span style="font-size: 11px; color: #7f8c8d;">📅 ${displayDate} 🕒 ${displayTime} | <b>${methodType}</b></span>
            </div>
            <div style="text-align: right;">
                <b>${t.type === 'ဝင်ငွေ' ? '+' : '-'}${Number(t.amount).toLocaleString()} ကျပ်</b>
                <button onclick="deleteItem('${t.id}')" style="background: none; color: #e74c3c; border: none; font-size: 16px; margin-left: 10px; padding: 0; cursor: pointer; display: inline;">❌</button>
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
    document.getElementById('filter-date').value = ''; 
    document.getElementById('filter-bank').value = 'All';
    document.getElementById('filter-text').value = ''; 
    render(); 
}

function deleteItem(id) {
    const savedDeletePassword = localStorage.getItem('delete_password');

    if (!savedDeletePassword) {
        const newPassword = prompt("🔑 စာရင်းဖျက်ရန်အတွက် စကားဝှက်အသစ်တစ်ခု သတ်မှတ်ပေးပါ:");
        if (newPassword === null) return;
        if (newPassword.trim() === "") {
            alert("❌ စကားဝှက် အလွတ်မဖြစ်ရပါ။");
            return;
        }
        localStorage.setItem('delete_password', newPassword);
        alert("🎉 စကားဝှက် သတ်မှတ်ပြီးပါပြီ။ ဖျက်ရန် ၎င်းစကားဝှက်ကို ပြန်ရိုက်ပေးပါ။");
        return;
    }

    const inputPassword = prompt("🔐 ဤစာရင်းကို ဖျက်ရန် စကားဝှက် ရိုက်ထည့်ပါ:");
    if (inputPassword === null) return; 

    if (inputPassword === savedDeletePassword) {
        if (confirm("⚠️ ဤမှတ်တမ်းကို အပြီးဖျက်ပစ်ရန် သေချာပါသလား?")) {
            
            transactions = transactions.filter(t => t.id !== id);
            localStorage.setItem('offline_transactions', JSON.stringify(transactions));
            
            unsynced_items = unsynced_items.filter(item => item.id !== id);
            localStorage.setItem('unsynced_items', JSON.stringify(unsynced_items));
            
            render();

            if (navigator.onLine) {
                fetch(google_script_url, {
                    method: "POST",
                    body: JSON.stringify({ action: "delete", id: id })
                })
                .then(res => res.json())
                .then(response => {
                    if (response.status === "success") {
                        alert("🧹 စာရင်းကို Google Sheet ထဲမှပါ ဖျက်ပြီးပါပြီ။");
                    }
                });
            } else {
                alert("🧹 ဖုန်းထဲမှ စာရင်းကို ဖျက်လိုက်ပါပြီ။ (အင်တာနက်ပြန်ရလျှင် Sheet ထဲကပါ ပျက်သွားပါလိမ့်မည်)");
            }
        }
    } else {
        alert("❌ စကားဝှက် မှားယွင်းနေပါသည်။ ဖျက်ခွင့်မရှိပါ။");
    }
}
