let transactions = localStorage.getItem('transactions') ? JSON.parse(localStorage.getItem('transactions')) : [];

// ဝင်ငွေထွက်ငွေ ထည့်သည့် လုပ်ဆောင်ချက်
function addTransaction(type) {
    const amountInput = document.getElementById('amount');
    const descInput = document.getElementById('description');
    
    if (!amountInput.value || !descInput.value) {
        alert("📊 ပမာဏနှင့် အကြောင်းအရာကို ပြည့်စုံစွာဖြည့်ပါ။");
        return;
    }

    const transaction = {
        id: Date.now(), // အိုင်ဒီကို အချိန်နဲ့ပေးထားလို့ တစ်ခုစီ ခွဲခြားလို့ရပါတယ်
        type: type,
        amount: parseFloat(amountInput.value),
        description: descInput.value
    };

    transactions.push(transaction);
    updateLocalStorage();
    render();
    
    amountInput.value = '';
    descInput.value = '';
}

function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function render() {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        const li = document.createElement('li');
        li.classList.add(t.type === 'ဝင်ငွေ' ? 'inc' : 'exp');
        
        // စာရင်းတစ်ခုချင်းစီရဲ့ ဘေးမှာ ❌ (ဖျက်ရန်) ခလုတ်လေး ထည့်ပေးထားပါတယ်
        li.innerHTML = `
            <span>${t.description}</span> 
            <div>
                <b>${t.type === 'ဝင်ငွေ' ? '+' : '-'}${t.amount.toLocaleString()} ကျပ်</b>
                <button onclick="deleteItem(${t.id})" style="background: none; color: #e74c3c; border: none; font-size: 16px; margin-left: 10px; padding: 0; cursor: pointer; flex: none; display: inline;">❌</button>
            </div>
        `;
        list.appendChild(li);

        if (t.type === 'ဝင်ငွေ') totalIncome += t.amount;
        else totalExpense += t.amount;
    });

    document.getElementById('total-income').innerText = totalIncome.toLocaleString();
    document.getElementById('total-expense').innerText = totalExpense.toLocaleString();
    document.getElementById('net-balance').innerText = (totalIncome - totalExpense).toLocaleString();
}

// 🔐 စကားဝှက်စစ်ဆေးပြီးမှ ရွေးချယ်ထားသော စာရင်းတစ်ခုကို ဖျက်မည့်စနစ်
function deleteItem(id) {
    const savedDeletePassword = localStorage.getItem('delete_password');

    // ပထမဆုံးအကြိမ်ဆိုရင် Password အသစ် အရင်ပေးခိုင်းမယ်
    if (!savedDeletePassword) {
        const newPassword = prompt("🔑 စာရင်းဖျက်ရန်အတွက် စကားဝှက်အသစ်တစ်ခု သတ်မှတ်ပေးပါ (ကျန်တဲ့သူ မသိစေချင်တဲ့ ကုဒ် ရိုက်ပါ):");
        if (newPassword === null) return;
        if (newPassword.trim() === "") {
            alert("❌ စကားဝှက် အလွတ်မဖြစ်ရပါ။");
            return;
        }
        localStorage.setItem('delete_password', newPassword);
        alert("🎉 စကားဝှက် သတ်မှတ်ပြီးပါပြီ။ ဖျက်ရန် ၎င်းစကားဝှက်ကို ပြန်ရိုက်ပေးပါ။");
        return;
    }

    // နောက်ခေါက်တွေမှာ သတ်မှတ်ထားတဲ့ Password တောင်းမယ်
    const inputPassword = prompt("🔐 ဤစာရင်းကို ဖျက်ရန် စကားဝှက် ရိုက်ထည့်ပါ:");
    if (inputPassword === null) return; 

    if (inputPassword === savedDeletePassword) {
        if(confirm("⚠️ ဤမှတ်တမ်းကို ဖျက်ပစ်ရန် သေချာပါသလား?")) {
            // ရွေးလိုက်တဲ့ အိုင်ဒီကလွဲပြီး ကျန်တဲ့စာရင်းတွေကိုပဲ ချန်ထားခဲ့တာပါ
            transactions = transactions.filter(t => t.id !== id);
            updateLocalStorage();
            render();
            alert("🧹 စာရင်းကို ဖျက်ပြီးပါပြီ။");
        }
    } else {
        alert("❌ စကားဝှက် မှားယွင်းနေပါသည်။ ဖျက်ခွင့်မရှိပါ။");
    }
}

// ပရိုဂရမ်စဖွင့်ချင်း data ဆွဲတင်ရန်
render();
