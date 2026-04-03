---
title: Claude.ai but with CLIs instead of MCPs
description: How I gave Claude.ai its own Linux machine so it can use any CLI I need. No more MCPs needed.
image: /writing/cat-mini-laptop.webp
show_on_desktop: yes
---

# Claude.ai but with CLIs instead of MCPs

_Friday, April 3rd 2026 • 3 minute read_

![](/writing/cat-mini-laptop.webp)

---

I use the Claude app all the time. I've tried using Telegram, WhatsApp, and Slack to talk to my agents, but using Claude in its native iOS app has always been a more pleasant experience.

A major downside however has been not being able to connect Claude to all the services I use. Their library of MCPs is pretty limited, and I'd prefer to not use a 3rd party MCP provider. I could use [Cowork](https://www.anthropic.com/product/claude-cowork) but I'd prefer to not have to keep my laptop open when I'm away. It would be much more ideal if Claude was able to directly use the CLIs I use locally to access the services it doesn't have an existing MCP integration for.

The thing is, in theory, it can. Claude has a sandboxed bash environment it can use to run commands. The issue is, however, that 1. it has a domain allowlist you can't modify, and 2. it is not capable of retaining sandbox state between conversations.

In practice that means that if you want to use a CLI like [Strava](https://github.com/kvendrik/strava), it can install it but when it tries to use it 1. the Strava domain will be blocked, and 2. it won’t be there if you start a new chat.

But what if it could? What if it had a sandboxed environment with minimal restrictions, that would persist state across sessions. That way it could use any CLI and you wouldn't be restricted to using MCPs. Wouldn't that be neat?

## Giving Claude its own Linux machine

The core idea is simple: set up a Linux machine and give Claude access to the command line. Easy.

So that's what I did. The first implementation exposed a MCP server with a single `shell` tool from a Linux machine that I ran on [Railway](https://railway.com/).

It made a big difference for me right away because it immediately gave Claude access to the CLIs I usually use, like [Strava](https://github.com/kvendrik/strava) and [Google Tasks](https://github.com/steipete/gogcli), and removed the need for everything to be exposed through an MCP.

## Memory

One of the first things I noticed was that Claude forgets what CLIs it had already installed when you start a new chat. So one of the first things I did was instruct it to keep track of things by saving notes for itself in a `MEMORY.md` file.

That did improve things but instructing Claude through the top-level MCP instructions to always read the `MEMORY.md` file doesn't work as well as you might expect it to. I'm still not entirely sure why, but my assumption is that it's because of the way it dynamically loads its tools.

Claude has so many tools that it performs a search to see if it has tools needed for a certain task. When it finds the `Backoffice:shell` tool it seems it doesn't always care to follow the top-level MCP instructions that come with it. A simple fix though because it started already working a lot better when I just put the instruction inside the `shell` tool's description directly:

```
Important: before you use this tool always read /data/MEMORY.md
```

This worked well for a while. The only thing I didn't like about it was that the LLM would have to rewrite the entire memory file each time it wanted to save something. That felt error-prone. So I added a `memory_append` tool and ended up swapping the read and write instructions out for a `memory_read` and `memory_write` tool.

## Managing `env`

Next I noticed it would use the memory file to store secrets. Not ideal. I mean it has bash access so it can access the env whenever it wants but that doesn't mean secrets should by default end up in Claude's context. So I added `env_set` and `env_delete` tools to be able to manage env variables without directly promoting Claude reading the env into the conversation.

This allows you to set up something like the [Strava CLI](https://github.com/kvendrik/strava) and the env variables it needs once, and afterwards not have Claude read the secrets you give it back into its context every time it reads the memory file.

Giving Claude access to the env variables at all isn't ideal because it means it can read secrets whenever it wants to. But it's hard to prevent. You can restrict access to `env` and `printenv`, but Claude could just use an interpreter to do the same thing: `bun -c "console.log(process.env)"`.

You could solve this by adding a human to the loop, but that would require you to approve commands Claude tries to run. Which is also a can of worms as Claude doesn't allow MCPs to push messages into the chat, so you'd need to prompt the user for permission on another application or device.

Better to just beware of this security risk and take it into account when working with the Linux machine. After all, your coding agents have access to secrets as well and just like you manage what you give them, you can also manage what you give the Linux machine access to.

## Seatbelt

At this point it was working pretty well. I had decided to treat the new Linux system like a coding agent. It wouldn't be doing autonomous work so it seemed fine to not get too restrictive with permissions. I did however want to make sure that we would block shell commands it might run by accident and would blow up the machine completely.

Initially I considered switching the `shell` tool to a `execve` tool and resolving binaries to block potentially dangerous commands. But even that ended up feeling too restrictive for the tool I wanted to build.

After some contemplation I ended up configuring better OS level permissions in the `Dockerfile`. That helped me prevent most of the dangerous commands I wanted to block by only allowing the LLM to write to `/data`.

This of course doesn’t protect against a compromised LLM, but it does provide a seatbelt so it’s less likely the LLM does something crazy by accident.

And even if it does, hosting it on [Railway](https://railway.com) gives us fresh container deploys each time. So if something does go wrong Railway just restarts and gives us a new machine. That however does also pose a challenge...

## Persisting data

One of the things that’s great about the [Railway](https://railway.com) setup is that it provides a fresh container on each restart. That does however also mean that the data gets wiped every time. Which of course isn’t what we want.

Fixing this however wasn’t difficult. Railway allows you to specify what [paths to retain between restarts](https://docs.railway.com/volumes), which allowed me to make sure the `/data` folder persists. So all I had to do was ensure that all env variables, logs, OAuth sessions, and installed Bun and Homebrew packages, end up there.

## No more MCPs

And that's it! No more MCPs needed. I now use the Claude app wherever I am to use whatever CLI I feel like using.

If you're interested in setting it up for yourself, or just checking out the code: the project is called Backoffice and you can find it [here](https://github.com/kvendrik/backoffice).

---

_Oh and hey. If you liked reading this let me know what you think. Shoot me an email at hey@kvendrik.com!_
