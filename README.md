# 🎭 Azure Config Ninja

Because life's too short to copy-paste environment variables into Azure Portal.

## Why? (The Villain Origin Story)

After the 427th time of manually updating Azure app settings through the CLI, I snapped. There had to be a better way than:

```bash
az webapp config appsettings set --name my-precious-app --resource-group ...
# *falls asleep on keyboard*
```

## What's This?

A tiny but mighty CLI tool that takes your beautiful `.env` files and yeets them into Azure App Service configurations. Built by a developer who's too lazy to do things manually (aka efficiently minded 🧠).

## Features

- 🚀 Uploads your `.env` straight to Azure
- 🎯 Handles production and staging slots like a boss
- 🧠 Remembers your choices (because your brain has better things to store)
- 🔐 Secure enough that it won't make your security team cry
- 👻 Zero ghosts of past configuration haunting your deployments

## Installation

```bash
# npm users
npm install

# yarn admirers
yarn
```

## Usage

```bash
# npm believers
npm run yeet-env

# yarn enthusiasts
yarn yeet-env

# Watch your env vars fly into the cloud ☁️
```

## Future Plans (Maybe?)

Planning to expand this to other Azure services and possibly other cloud providers because developers deserve peace of mind (and more coffee breaks ☕).

## Contributing

Found a bug? Have a feature request? Want to make this even more awesome? PRs welcome! Just don't judge my commit messages too harshly.

## License

MIT - Because sharing is caring, and lawyers need something to read too.

---

Built with 💻 and mild frustration by a developer who got tired of clicking buttons.
