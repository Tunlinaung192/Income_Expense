// ⚠️ သင်ရရှိလာသော Google Web App URL ကို အောက်ကနေရာမှာ အစားထိုးပါ
const google_script_url = "https://script.google.com/macros/s/AKfycbzEzRmewtz3q93A6GkaHTk9xgsRtGwW1PUkP3Fpp7MwoOp1f0S0qjrinyw31djjWUDr/exec";

let transactions = localStorage.getItem('offline_transactions') ? JSON.parse(localStorage.getItem('offline_transactions')) : [];
let unsynced_items = localStorage.getItem('unsynced_items') ? JSON.parse(localStorage.getItem('unsynced_items')) : [];

window.onload = function() {
    render(); // ဖွင့်ဖွင့်ချင်း ဖုန်းထဲရှိပြီးသား စာရင်းတွေကို တန်းပြမယ်
    fetchDataFromGoogleSheets(); // ပြီးမှ လိုင်းရှိရင် နောက်ဆုံး Data လှမ်းဆွဲမယ်
    
    window.addEventListener('online', syncOfflineDataToGoogle);
    if (navigator.onLine) {
        syncOfflineDataToGoogle();
    }
};

// မြန်မာဂဏန်းများကို အင်္ဂလိပ်ဂဏန်းသို့ ပြောင်းပေးသည့် Function
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
    
    if (!amountInput.value || !descInput.value) {
        alert("📊 ပမာဏနှင့် အကြောင်းအရာကို ပြည့်စုံစွာဖြည့်ပါ။");
        return;
    }

    let cleanAmount = convertBurmeseToEnglish(amountInput.value);
    cleanAmount = cleanAmount.replace(/,/g, '').trim();
    const parsedAmount = parseFloat(cleanAmount);

    if (isNaN(parsedAmount)) {
        alert("❌ ကျေးဇူးပြု၍ ဂဏန်း မှန်ကန်စွာ ရိုက်ထည့်ပေးပါ။");
        return;
    }

    // 📅 လက်ရှိ နေ့စွဲနှင့် အချိန်ကို စက်ထဲကနေ Auto ယူခြင်း
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const formattedDate = `${year}-${month}-${date}`; // ရှာရလွယ်အောင် သိမ်းမယ့် ပုံစံ (YYYY-MM-DD)
    const formattedTime = `${hours}:${minutes}`;

    const new_item = {
        id: Date.now().toString(),
        type: type,
        amount: parsedAmount,
        description: descInput.value,
        date: formattedDate, // ရက်စွဲအသစ် ထည့်သွင်းမှတ်သားခြင်း
        time: formattedTime  // အချိန်အသစ် ထည့်သွင်းမှတ်သားခြင်း
    };

    transactions.push(new_item);
    localStorage.setItem('offline_transactions', JSON.stringify(transactions));
    
    unsynced_items.push(new_item);
    localStorage.setItem('unsynced_items', JSON.stringify(unsynced_items));
    
    render();

    amountInput.value = '';
    descInput.value = '';

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
        date: item_to_sync.date,   // Google Sheet သို့ ရက်စွဲပါ ပို့ရန်
        time: item_to_sync.time    // Google Sheet သို့ အချိန်ပါ ပို့ရန်
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

function render() {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    
    let totalIncome = 0;
    let totalExpense = 0;

    const filterDate = document.getElementById('filter-date').value; // ပြက္ခဒိန်က ရွေးထားတဲ့ရက်ကို ယူတယ်

    // ပြက္ခဒိန်မှာ ရက်စွဲရွေးထားရင် အဲဒီရက်တူတာပဲ စစ်ထုတ်မယ်၊ မရွေးထားရင် အကုန်ပြမယ်
    const displayedTransactions = filterDate 
        ? transactions.filter(t => t.date === filterDate) 
        : transactions;

    if (displayedTransactions.length === 0) {
        list.innerHTML = '<li>📭 ဤရက်စွဲတွင် မှတ်တမ်းမရှိသေးပါ။</li>';
    }

    // စစ်ထုတ်ထားတဲ့ list ကိုပဲ screen ပေါ်တင်ပြမယ်
    displayedTransactions.forEach(t => {
        const li = document.createElement('li');
        li.classList.add(t.type === 'ဝင်ငွေ' ? 'inc' : 'exp');
        
        const is_unsynced = unsynced_items.some(item => item.id === t.id);
        const sync_icon = is_unsynced ? " ☁️ (Offline)" : "";

        // စာရင်းရဲ့ အောက်ခြေမှာ ဘယ်ရက် ဘယ်အချိန် သွင်းထားလဲဆိုတာကို သေးသေးလေး ပြထားပါမယ်
        const displayDate = t.date ? t.date : "ရက်စွဲမရှိ";
        const displayTime = t.time ? t.time : "";

        li.innerHTML = `
            <div>
                <span style="display: block; font-weight: bold;">${t.description}${sync_icon}</span>
                <span style="font-size: 11px; color: #7f8c8d;">📅 ${displayDate} 🕒 ${displayTime}</span>
            </div>
            <div style="text-align: right;">
                <b>${t.type === 'ဝင်ငွေ' ? '+' : '-'}${Number(t.amount).toLocaleString()} ကျပ်</b>
                <button onclick="deleteItem('${t.id}')" style="background: none; color: #e74c3c; border: none; font-size: 16px; margin-left: 10px; padding: 0; cursor: pointer; display: inline;">❌</button>
            </div>
        `;
        list.appendChild(li);

        if (t.type === 'ဝင်ငွေ') totalIncome += Number(t.amount);
        else totalExpense += Number(t.amount);
    });

    document.getElementById('total-income').innerText = totalIncome.toLocaleString();
    document.getElementById('total-expense').innerText = totalExpense.toLocaleString();
    document.getElementById('net-balance').innerText = (totalIncome - totalExpense).toLocaleString();
}

function clearFilter() {
    document.getElementById('filter-date').value = ''; // ပြက္ခဒိန်ကို reset လုပ်တယ်
    render(); // စာရင်းအားလုံး ပြန်ပြမယ်
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
