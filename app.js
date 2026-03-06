let data;
let chart;

async function loadData(){
    const res = await fetch("data.json");
    data = await res.json();

    renderPrices();
    calculate();
}

function renderPrices(){
    const table = document.getElementById("priceTable");

    let html="<tr><th>Item</th><th>Price</th></tr>";

    for(const item in data.prices){
        html+=`
        <tr>
            <td>${item}</td>
            <td>
                <input type="number" step="0.01"
                value="${data.prices[item]}"
                onchange="updatePrice('${item}',this.value)">
            </td>
        </tr>
        `;
    }

    table.innerHTML=html;
}

function updatePrice(item,val){
    data.prices[item]=parseFloat(val);
    calculate();
}

function calculate(){

    const rows=[];

    // RAW MATERIALS
    for(const r in data.rawPP){

        const price=data.prices[r];
        const pp=data.rawPP[r];

        rows.push({
            item:r,
            type:"Raw",
            sell:price,
            profit:price,
            pp:pp,
            profitPP:price/pp
        });
    }

    // PROCESSED ITEMS
    for(const item in data.recipes){

        const recipe=data.recipes[item];
        let rawCost=0;
        let totalPP=recipe.pp;

        for(const input in recipe.inputs){

            const qty=recipe.inputs[input];

            rawCost += qty * data.prices[input];
            totalPP += qty * data.rawPP[input];
        }

        const sell=data.prices[item];
        const profit=sell-rawCost;

        rows.push({
            item:item,
            type:"Processed",
            sell:sell,
            profit:profit,
            pp:totalPP,
            profitPP:profit/totalPP
        });
    }

    rows.sort((a,b)=>b.profitPP-a.profitPP);

    renderTable(rows);
    renderChart(rows);
}

function renderTable(rows){

    const table=document.getElementById("profitTable");

    let html=`
    <tr>
    <th>Type</th>
    <th>Item</th>
    <th>Sell</th>
    <th>Profit/unit</th>
    <th>Total PP</th>
    <th>Profit/PP</th>
    </tr>
    `;

    rows.forEach(r=>{
        html+=`
        <tr>
        <td>${r.type}</td>
        <td>${r.item}</td>
        <td>${r.sell.toFixed(2)}</td>
        <td>${r.profit.toFixed(2)}</td>
        <td>${r.pp}</td>
        <td>${r.profitPP.toFixed(4)}</td>
        </tr>
        `;
    });

    table.innerHTML=html;
}

function renderChart(rows){

    const labels=rows.map(r=>r.item);
    const values=rows.map(r=>r.profitPP);

    if(chart) chart.destroy();

    chart=new Chart(document.getElementById("profitChart"),{
        type:"bar",
        data:{
            labels:labels,
            datasets:[{
                label:"Profit per PP",
                data:values
            }]
        }
    });
}

loadData();
