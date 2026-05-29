let transactions = JSON.stringify(localStorage.getItem('transactions')) ? JSON.parse(localStorage.getItem('transactions')) || [] : [];

function addTransaction(type) {
    const amountInput = document.getElementById('amount');
    const descInput = document.getElementById('description');
    
    if (!amountInput.value || !descInput.value) {
        alert("📊 ပမာဏနှင့် အကြောင်းအရာကို ပြည့်စုံစွာဖြည့်ပါ။");
        return;
    }

    const transaction = {
        id: Date.now(),
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
        li.innerHTML = `<span>${t.description}</span> <b>${t.type === 'ဝင်ငွေ' ? '+' : '-'}${t.amount.toLocaleString()} ကျပ်</b>`;
        list.appendChild(li);

        if (t.type === 'ဝင်ငွေ') totalIncome += t.amount;
        else totalExpense += t.amount;
    });

    document.getElementById('total-income').innerText = totalIncome.toLocaleString();
    document.getElementById('total-expense').innerText = totalExpense.toLocaleString();
    document.getElementById('net-balance').innerText = (totalIncome - totalExpense).toLocaleString();
}

function clearAll() {
    if(confirm("⚠️ စာရင်းအားလုံးကို ဖျက်ပစ်ရန် သေချာပါသလား?")) {
        transactions = [];
        updateLocalStorage();
        render();
    }
}

// ပရိုဂရမ်စဖွင့်ချင်း data ဆွဲတင်ရန်
render();
