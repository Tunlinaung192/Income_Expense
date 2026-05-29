// ⚠️ သင်ရရှိလာသော Google Web App URL ကို အောက်ကနေရာမှာ အစားထိုးပါ
const google_script_url = "https://script.google.com/macros/s/AKfycbxpy275b7G2RpA-f0GC7DpNSA0u2z67pxmhcADCZok5rp9B8rZak3cxNx9VehYyM6-F/exec";

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

    // မြန်မာလို ရိုက်ထားခဲ့ရင် အင်္ဂလိပ်ဂဏန်း ပြောင်းပစ်မယ်
    let cleanAmount = convertBurmeseToEnglish(amountInput.value);
    
    // ကော်မာ (,) တွေ သို့မဟုတ် ဟာကွက်တွေ ပါလာရင် ဖယ်ထုတ်ပစ်မယ်
    cleanAmount = cleanAmount.replace(/,/g, '').trim();
    
    const parsedAmount = parseFloat(cleanAmount);

    if (isNaN(parsedAmount)) {
        alert("❌ ကျေးဇူးပြု၍ ဂဏန်း မှန်ကန်စွာ ရိုက်ထည့်ပေးပါ။");
        return;
    }

    const new_item = {
        id: Date.now().toString(),
        type: type,
        amount: parsedAmount,
        description: descInput.value
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
        description: item_to_sync.description
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

    if (transactions.length === 0) {
        list.innerHTML = '<li>📭 မှတ်တမ်းမရှိသေးပါ။</li>';
    }

    transactions.forEach(t => {
        const li = document.createElement('li');
        li.classList.add(t.type === 'ဝင်ငွေ' ? 'inc' : 'exp');
        
        const is_unsynced = unsynced_items.some(item => item.id === t.id);
        const sync_icon = is_unsynced ? " ☁️ (Offline)" : "";

        li.innerHTML = `
            <span>${t.description}${sync_icon}</span> 
            <div>
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
