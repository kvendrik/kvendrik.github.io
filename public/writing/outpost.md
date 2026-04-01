# Outpost

Give your AI assistant a remote shell

![](/cat-mini-laptop.webp)

AI assistants like [Claude](https://claude.ai/) can use MCPs to access external services, but the library of available MCPs is limited. If a service doesn't have an MCP, you're stuck searching for third-party providers.

[Outpost](https://github.com/kvendrik/outpost) solves this. It lets Claude (or any other AI assistant) use the command line on a remote machine through an **exec** tool, so it can access whatever CLIs you already use — no custom MCP needed.

## Quick example

Say you use the [Strava CLI](https://github.com/kvendrik/strava). Instead of hunting for a third-party MCP provider you just tell Claude to install and use the CLI within Outpost. Done.

## Getting started

```bash
git clone git@github.com:kvendrik/outpost.git
brew install railway
railway login
railway up
```

> Add your Railway app URL as an MCP in Claude and you'll be prompted for a passphrase found in the startup logs.

## How it works

- **OAuth protected.** Only clients that complete the OAuth flow can call the exec tool.
- **Short-lived tokens.** Access tokens expire every hour and refresh automatically.
- **Passphrase-gated.** The consent screen requires a passphrase before issuing tokens.

## Security considerations

Outpost gives the AI unrestricted shell access on its host machine. Keep the following in mind:

1. Deploy on an isolated, ephemeral machine (Railway spins fresh containers on every deploy).
2. Don't store secrets on the machine — use environment variables and your provider's secret management.
3. Treat the machine as disposable.

The tradeoff is intentional: unrestricted access is what makes it flexible enough to use _any_ CLI.
