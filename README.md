# vendel-sdk

Official JavaScript/TypeScript SDK for the [Vendel](https://vendel.cc) SMS gateway API.

## Install

```bash
npm install vendel-sdk
```

## Usage

```typescript
import { VendelClient } from "vendel-sdk";

const client = new VendelClient({
  baseUrl: "https://app.vendel.cc",
  apiKey: "vk_your_api_key",
});

// Send an SMS
const result = await client.sendSms(
  ["+1234567890"],
  "Hello from Vendel!"
);
console.log(result.batch_id);

// Check quota
const quota = await client.getQuota();
console.log(`${quota.sms_sent_this_month}/${quota.max_sms_per_month} SMS used`);
```

## Webhook verification

```typescript
import { verifyWebhookSignature } from "vendel-sdk";

const isValid = verifyWebhookSignature(
  rawBody,                    // raw request body string
  req.headers["x-webhook-signature"],
  "your_webhook_secret"
);
```

## Requirements

- Node.js >= 18

## License

MIT
