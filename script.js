// ⚠️ သင်ရရှိလာသော Google Web App URL ကို အောက်ကနေရာမှာ အစားထိုးပါ
const google_script_url = "https://script.google.com/macros/s/AKfycbxpy275b7G2RpA-f0GC7DpNSA0u2z67pxmhcADCZok5rp9B8rZak3cxNx9VehYyM6-F/exec";

let transactions = [];

// App စဖွင့်တာနဲ့ Google Sheet ထဲက Data တွေကို လှမ်းယူမယ်
window.onload = function() {
    fetchDataFromGoogleSheets();
};

function fetchDataFromGoogleSheets() {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '<li>⌛ Google Sheet ထဲက စာရင်းများဆွဲနေသည်...</li>';
    
    fetch(google_script_url)
        .then(response => response.json())
        .then(data => {
            transactions = data;
            render();
        })
        .catch(error => {
            alert("Google Sheet နှင့် ချိတ်ဆက်ရ အဆင်မပြေပါ။");
            console.error(error);
        });
}

function addTransaction(type) {
    const amountInput = document.getElementById('amount');
    const descInput = document.getElementById('description');
    
    if (!amountInput.value || !descInput.value) {
        alert("📊 ပမာဏနှင့် အကြောင်းအရာကို ပြည့်စုံစွာဖြည့်ပါ။");
        return;
    }

    const transaction = {
        action: "add",
        id: Date.now().toString(),
        type: type,
        amount: parseFloat(amountInput.value),
        description: descInput.value
    };

    // ခလုတ်ကို ခဏပိတ်ထားပြီး စောင့်ခိုင်းခြင်း (မတော်တဆ နှစ်ခါ အမြန်နှိပ်မိရင် Double မဝင်အောင်)
    const list = document.getElementById('transaction-list');
    list.innerHTML = '<li>⌛ Google Sheet ထဲသို့ စာရင်းသွင်းနေပါသည်...</li>';

    // Google Sheet ထံသို့ Data ပို့ခြင်း
    fetch(google_script_url, {
        method: "POST",
        body: JSON.stringify(transaction)
    })
    .then(res => res.json())
    .then(response => {
        if(response.status === "success") {
            // Sheet ထဲဝင်သွားမှ ဖုန်းထဲမှာ ပြပေးမယ်
            delete transaction.action;
            transactions.push(transaction);
            render();
            amountInput.value = '';
            descInput.value = '';
        }
    })
    .catch(error => {
        alert("စာရင်းသွင်းရတာ အဆင်မပြေပါ။ ဖုန်းလိုင်း သို့မဟုတ် URL လွဲနေနိုင်ပါသည်။");
        render();
    });
}

function render() {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    
    let totalIncome = 0;
    let totalExpense = 0;

    if(transactions.length === 0) {
        list.innerHTML = '<li>📭 မှတ်တမ်းမရှိသေးပါ။</li>';
    }

    transactions.forEach(t => {
        const li = document.createElement('li');
        li.classList.add(t.type === 'ဝင်ငွေ' ? 'inc' : 'exp');
        
        li.innerHTML = `
            <span>${t.description}</span> 
            <div>
                <b>${t.type === 'ဝင်ငွေ' ? '+' : '-'}${Number(t.amount).toLocaleString()} ကျပ်</b>
                <button onclick="deleteItem('${t.id}')" style="background: none; color: #e74c3c; border: none; font-size: 16px; margin-left: 10px; padding: 0; cursor: pointer; display: inline;">❌</button>
            </div>
        `;
        list.appendChild(li);

        if (t.type === 'ဝင်ငွေ') totalIncome += Number(t.amount);
        else totalExpense += Number(t.amount); // 👈 အရင်က ဒီနေရာမှာ ကွင်းပိတ် ) ကျန်ခဲ့လို့ပါ
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
        if(confirm("⚠️ ဤမှတ်တမ်းကို Google Sheet ထဲမှပါ အပြီးဖျက်ပစ်ရန် သေချာပါသလား?")) {
            
            const list = document.getElementById('transaction-list');
            list.innerHTML = '<li>⌛ Google Sheet ထဲမှ ဖျက်နေပါသည်...</li>';

            // Google Sheet ထံသို့ ဖျက်ရန် တောင်းဆိုခြင်း
            fetch(google_script_url, {
                method: "POST",
                body: JSON.stringify({ action: "delete", id: id })
            })
            .then(res => res.json())
            .then(response => {
                if(response.status === "success") {
                    transactions = transactions.filter(t => t.id !== id);
                    render();
                    alert("🧹 စာရင်းကို ဖျက်ပြီးပါပြီ။");
                }
            })
            .catch(error => {
                alert("ဖျက်ရတာ အဆင်မပြေပါ။");
                render();
            });
        }
    } else {
        alert("❌ စကားဝှက် မှားယွင်းနေပါသည်။ ဖျက်ခွင့်မရှိပါ။");
    }
}
