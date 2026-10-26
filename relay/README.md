# voip.ms relay (n8n)

voip.ms only accepts API calls from IP addresses you whitelist, and Vercel's outbound IPs change. So the Vercel functions send their voip.ms calls to an n8n webhook on a server with a fixed IP, and n8n forwards each one to voip.ms. Only the n8n server's IP needs whitelisting.

```
Vercel (sms-send, SMS handler) --POST + X-Relay-Key--> n8n webhook --GET--> voip.ms API
```

Receiving texts doesn't go through the relay: voip.ms calls `/api/sms-inbound` on Vercel directly.

The workflow has three nodes: a webhook that only accepts requests carrying the right `X-Relay-Key` header, an HTTP request that forwards the fields to `https://voip.ms/api/v1/rest.php`, and a reply with voip.ms's answer. Its settings turn off saving execution data, because each request contains the voip.ms API password.

## Setup

1. **Make the relay secret.** Generate one:

   ```bash
   openssl rand -hex 32
   ```

2. **Create the credential in n8n.** Credentials → Create → **Header Auth**. Name: `X-Relay-Key`. Value: the secret from step 1.

3. **Import the workflow.** Create workflow → in the editor's **⋯** menu, **Import from File…** → `n8n-voipms-relay.json`. (Or copy the file with `pbcopy < relay/n8n-voipms-relay.json` and press ⌘V on the empty canvas.) Open the **Webhook (X-Relay-Key)** node and pick the credential from step 2. Save, then **Publish** the workflow (older n8n versions: switch it to Active). Copy the node's **Production URL**: `https://<your-n8n-host>/webhook/voipms-relay`.

4. **Whitelist the n8n server in voip.ms.** On the n8n server, find its public IP:

   ```bash
   curl https://api.ipify.org
   ```

   In the voip.ms portal, go to Main Menu → **SOAP & REST/JSON API**: enable the API, set the API password, and add that IP.

5. **Point Vercel at the relay.** In the btw project's environment variables, set:
   - `VOIPMS_API_URL` = the Production URL from step 3
   - `VOIPMS_RELAY_KEY` = the secret from step 1

   Then redeploy, since env var changes only apply to new deployments.

6. **Test it** at https://btw-dusky.vercel.app/admin, in the **Text messaging** panel at the top.

   **Check connection** tests each step a text takes:
   - **Relay**: `VOIPMS_API_URL` and `VOIPMS_RELAY_KEY` are set.
   - **Reaching voip.ms**: a `getIP` call got through the relay. It shows the IP voip.ms sees, which should be the n8n server's public IP from step 4.
   - **Account**: a `getBalance` call worked, so the API credentials are right and that IP is whitelisted. It shows your balance.

   Then enter your mobile number under **Send a test text to** and click **Send test**.

   If something fails, the panel says why. Common cases:
   - *"refused the caller's IP"*: whitelist the IP it names (step 4).
   - *"Couldn't reach the relay ... 403"*: the relay key in Vercel doesn't match the n8n credential.
   - *"Couldn't reach the relay"* with anything else: the workflow isn't published, or the URL is the Test one rather than the Production one.

   If your n8n host is behind a Cloudflare Tunnel (ours is), note: That only affects incoming traffic: Vercel reaches n8n through Cloudflare, while n8n's calls out to voip.ms leave from the server's own public IP, which is the one to whitelist. If the test fails with a 403, or an error that mentions Cloudflare, then Cloudflare Access, Bot Fight Mode or a WAF rule is stopping Vercel's server-to-server request. Add a bypass for the path `/webhook/voipms-relay`; the `X-Relay-Key` check still protects it.

## If the relay is down

Sending fails with a 500 until it's back; nothing is queued. Receiving keeps working.
