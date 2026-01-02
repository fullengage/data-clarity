
const WEBHOOK_URL = 'https://autowebhook.chathook.com.br/webhook/dc/full-pipeline';

const payload = {
    user_id: "test-user-id",
    intent: "sales",
    file: {
        name: "test_sales.xlsx",
        type: "excel",
        columns: ["Data", "Produto", "Valor", "Cliente"],
        row_count: 50
    },
    sample_data: [
        { "Data": "2024-01-01", "Produto": "Widget A", "Valor": 100, "Cliente": "Cust1" },
        { "Data": "2024-01-02", "Produto": "Widget B", "Valor": 200, "Cliente": "Cust2" }
    ],
    timestamp: new Date().toISOString()
};

async function testWebhook() {
    console.log("Sending payload to:", WEBHOOK_URL);
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Raw Response Body:", text);

        try {
            const json = JSON.parse(text);
            console.log("Parsed JSON:", JSON.stringify(json, null, 2));

            if (!Array.isArray(json.metrics) && !Array.isArray(json.charts)) {
                console.error("FAIL: metrics and charts are missing or not arrays.");
                console.log("Metrics type:", typeof json.metrics, Array.isArray(json.metrics));
                console.log("Charts type:", typeof json.charts, Array.isArray(json.charts));
            } else {
                console.log("PASS: Schema check passed.");
            }
        } catch (e) {
            console.error("Response is not JSON");
        }

    } catch (error) {
        console.error("Request failed:", error);
    }
}

testWebhook();
