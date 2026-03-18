async function run() {
  try {
    const credRes = await fetch('http://localhost:4000/api/credentials');
    const dest = await credRes.json();
    if (!dest || dest.length === 0) {
        console.log("ERRO: Nenhum banco de dados de destino cadastrado.");
        return;
    }

    const payload = {
      name: 'Teste Debugger',
      destinationId: dest[0].id,
      apiVersion: 'v24.0',
      datePreset: 'last_30d',
      timeIncrement: '1',
      level: 'ad',
      accounts: [],
      fields: { basicMetrics: true }
    };

    console.log("Enviando Payload:", payload);

    const res = await fetch('http://localhost:4000/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("HTTP CODE:", res.status);
    console.log("RESPONSE:", data);

  } catch (error) {
    console.error("Fetch falhou internamente:", error);
  }
}
run();
