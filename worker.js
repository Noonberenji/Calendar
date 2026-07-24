// Cloudflare Worker: Secure OAuth Token Exchanger
// This script takes temporary Auth Codes from your frontend and securely exchanges 
// them with Google using your hidden Client Secret.

export default {
  async fetch(request, env) {
    // 1. Handle CORS (Crucial so your frontend is allowed to talk to this backend)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // You can restrict this to your github.io URL later
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // 2. ENDPOINT: /auth
    // Swaps a 1-time authorization code for a Refresh Token & Access Token
    if (request.method === "POST" && url.pathname === "/auth") {
      try {
        const { code } = await request.json();
        
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: env.CLIENT_ID,
            client_secret: env.CLIENT_SECRET, // Hidden safely in Cloudflare!
            code: code,
            grant_type: "authorization_code",
            redirect_uri: "postmessage" // Required for popup-based OAuth
          })
        });

        const data = await tokenResponse.json();
        return new Response(JSON.stringify(data), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // 3. ENDPOINT: /refresh
    // Swaps a permanent Refresh Token for a fresh 1-hour Access Token
    if (request.method === "POST" && url.pathname === "/refresh") {
      try {
        const { refresh_token } = await request.json();
        
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: env.CLIENT_ID,
            client_secret: env.CLIENT_SECRET,
            refresh_token: refresh_token,
            grant_type: "refresh_token"
          })
        });

        const data = await tokenResponse.json();
        return new Response(JSON.stringify(data), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // Fallback for unknown routes
    return new Response(JSON.stringify({ error: "Endpoint not found" }), { 
      status: 404, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};
