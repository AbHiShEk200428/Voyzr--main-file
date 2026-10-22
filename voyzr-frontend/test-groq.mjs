// Quick Groq API key test — run with: node test-groq.mjs
const GROQ_KEY = "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";

console.log("[Test] Sending request to Groq...");

try {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a travel assistant." },
        { role: "user", content: "Say hello in one sentence." },
      ],
      max_tokens: 100,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const text = await res.text();
  console.log("[Test] Status:", res.status);
  console.log("[Test] Response:", text.substring(0, 500));

  if (res.ok) {
    const data = JSON.parse(text);
    console.log("\n✅ SUCCESS! Reply:", data.choices?.[0]?.message?.content);
  } else {
    console.log("\n❌ FAILED! Groq returned error:", res.status);
  }
} catch (err) {
  console.error("\n❌ NETWORK ERROR:", err.message);
}
