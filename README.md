# Workers MCP Server

> **Talk to your Cloudflare Workers from Claude Desktop!**

This is a proof-of-concept of writing a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) Server in a Cloudflare Worker. This gives you a way to extend Claude Desktop (among other MCP clients) by invoking functions in your Worker, which gives you access to any Cloudflare or third-party binding.

You write worker code that looks like this:

```ts
export class ExampleWorkerMCP extends WorkerEntrypoint<Env> {
	/**
	 * Generates a random number. This is extra random because it had to travel all the way to
	 * your nearest Cloudflare PoP to be calculated which... something something lava lamps?
	 *
	 * @return {string} A message containing a super duper random number
	 * */
	async getRandomNumber() {
		return `Your random number is ${Math.random()}`
	}
}
```

And, using the provided MCP proxy, your Claude Desktop can see & invoke these messages:

![image](https://github.com/user-attachments/assets/c16b2631-4eba-4914-8e26-d6ccea0fc578)

> <sub>Yes, I know that `Math.random()` works the same on a Worker as it does on your local machine, but don't tell Claude</sub> 🤫

## Neat! How do I play?

0. **Download Claude Desktop** https://claude.ai/download
1. **Clone this repo.**<br/>There's a few pieces of novel code that need to hang together to make this work, so for now the way to play with it is to clone this repo first. Then, from within this folder:
2. **`pnpm install`**
3. **Check `wrangler.json`**<br/>The current demo uses both the [Email Routing](https://developers.cloudflare.com/email-routing/) API and [Browser Rendering](https://developers.cloudflare.com/browser-rendering/. If you don't have access to these, or they're not enabled, comment out the relevant sections in `wrangler.json` or your deploy will fail.
4. **`pnpm deploy:worker`**<br/>This takes your `src/index.ts` file and generate `generated/docs.json` from it, then deploys it using Wrangler.
5. **`pnpm update:secret`**<br/>This generates `generated/.shared-secret` and set its contents as a secret on your worker using `wrangler secret put`. You only need to this once.
6. **`pnpm install:claude <server-alias> <worker-url>`**<br/>For me, that's `pnpm install:claude workers-mcp-server https://workers-mcp-server.glen.workers.dev`
7. **Restart Claude Desktop** You have to do this pretty often, but you _definitely_ have to do it after running the install step above.

To iterate on your server, do the following:

0. Make your change to `src/index.ts`
1. **`pnpm deploy:worker`**
2. (usually) **Restart Claude Desktop**.<br/>You have to do this whenever you add/remove/change your methods or any of the documentation (Claude doesn't detect changes while it's running). But if you're just updating the code within a method then `pnpm deploy:worker` is enough.

## How it works

Separately to your MCP code inside `src/index.ts`, there are three pieces required to make this work:

### 1. Docs generation: `scripts/generate-docs.ts`

The [MCP Specification](https://spec.modelcontextprotocol.io/specification/server/tools/#listing-tools) separates the `tools/list` and `tools/call` operations into separate steps, and most MCP servers have naturally followed suit and separated their schema definition from the implementation. However, combining them provides a much better DX for the author.

I'm using [ts-blank-space](https://github.com/bloomberg/ts-blank-space) and [jsdoc-api](https://www.npmjs.com/package/jsdoc-api) to parse the TS and emit the schema, slightly tweaked. This gives you LLM-friendly documentation at build time:

```ts
/**
 * Send a text or HTML email to an arbitrary recipient.
 *
 * @param {string} recipient - The email address of the recipient.
 * @param {string} subject - The subject of the email.
 * @param {string} contentType - The content type of the email. Can be text/plain or text/html
 * @param {string} body - The body of the email. Must match the provided contentType parameter
 * @return {Promise<string>} A success message.
 * @throws {Error} If the email fails to send, or if that destination email address hasn't been verified.
 */
async sendEmail(recipient: string, subject: string, contentType: string, body: string) {
  // ...
}
```

```json
{
  "ExampleWorkerMCP": {
    "exported_as": "ExampleWorkerMCP",
    "description": null,
    "methods": [
      {
        "name": "sendEmail",
        "description": "Send a text or HTML email to an arbitrary recipient.",
        "params": [
          {
            "description": "The email address of the recipient.",
            "name": "recipient",
            "type": "string"
          },
          {
            "description": "The subject of the email.",
            "name": "subject",
            "type": "string"
          },
          {
            "description": "The content type of the email. Can be text/plain or text/html",
            "name": "contentType",
            "type": "string"
          },
          {
            "description": "The body of the email. Must match the provided contentType parameter",
            "name": "body",
            "type": "string"
          }
        ],
        "returns": {
          "description": "A success message.",
          "type": "Promise.<string>"
        }
      }
    ]
  }
}
```

This list of methods is very similar to the required MCP format for `tools/list`, but also gives us a list of the `WorkerEntrypoint` exports names to look up our service bindings later.

To iterate on your docs, run `pnpm generate:docs:watch` and you'll see the output change as you tweak your JSDoc in your `src/index.ts` (you'll need [watchexec](https://github.com/watchexec/watchexec) installed).

## 2. Public HTTP handler: `lib/WorkerMCP.ts`

Since our `WorkerEntrypoint` is not directly accessible, we need something that defines a default export with a `fetch()` handler. This is what `lib/WorkerMCP.ts` does.

This exposes a single endpoint, `/rpc`, which takes a JSON payload of `{ method: string, args?: any[] }`, then calls that method on your `WorkerEntrypoint`.

### 3. Local MCP proxy: `scripts/local-proxy.ts`

This file uses the `@modelcontextprotocol/sdk` library to build up a normal, local MCP server. This responds to `tools/list` by producing the data from `docs.json` for the specified entrypoint.

On `tools/call`, a `.fetch` call is made to the remote worker on the `/rpc` route, providing a `Bearer` token with the contents of `generated/.shared-secret`. The responses are then piped back to Claude.

Calling `pnpm install:claude <server-alias> <worker-url>` adds a sever definition that points to this file in your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "<server-alias>": {
      "command": "<absolute-path-to>/node",
      "args": [
        "<project-dir>/node_modules/tsx/dist/cli.mjs",
        "<project-dir>/scripts/local-proxy.ts",
        "<server-alias>",
        "<worker-url>",
        "<entrypoint-name>"
      ]
    }
  }
}
```

In this way you can install as many of these as you like, as long as they each have a distinct `<server-alias>`.

## Limitations

There are lots. This pizza is straight out of the oven. You may well burn your mouth.

1. `docs.json` is only generated from `src/index.ts`. It doesn't currently crawl imports like a bundler, because no bundler I could find preserved comments in-place in order for me to run the docs generator afterwards.
2. Documentation generation only works for class exports. It can, at least, parse `class X {}; export { X as Y }`, but in general most people do `export default class X {}` anyway so this is fine for now.
3. The local proxy <-> remote proxy communication doesn't follow any particular RPC spec, but it probably should.
4. Error handling, non-text return values, streaming responses, etc have not really been thought through but do sorta work.
5. No `wrangler dev` support yet, but `wrangler dev --remote` should be possible so you don't have to deploy so often
6. Following on from the above, the spec includes a [`notifications/tools/list_changed` notification](https://spec.modelcontextprotocol.io/specification/server/tools/#list-changed-notification) that should trigger Claude to refresh its list of the tools available, meaning fewer restarts of Claude Desktop. But I haven't implemented that yet.
7. The docs parsing doesn't yet use TS types to either augment or replace the need for `@param` blocks in the JSDoc
8. The doc generation might be completely superfluous if someone was using a validator like zod or a schema library like typebox. However, I wanted build-time docs generation (i.e. static extraction) and wanted to be as generic as possible, so JSDoc will do for now.

## Future ideas

Obviously, having Claude Desktop talk directly to the Worker would be ideal. Also, `wrangler dev --remote` support would be great: you could iterate on your worker without redeploying, but still access your production bindings.

The docs generator needs to be extracted into a library so we can publish changes, as it needs to grow in scope to be really useful, and likely incorporate other sources of data (`d.ts` files, zod schemas, etc).

## Feedback & Contributions

Give it a try! Then, raise an issue or send a PR . This is all very new, so it could really go in a lot of different directions. We'd love to hear from you!
