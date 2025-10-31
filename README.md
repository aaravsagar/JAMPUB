# JAMPUB Discord Bot 🤖

A powerful, feature-rich Discord bot with moderation, auto-moderation, welcome/leave messages, and more.

## Features ✨

- **Moderation Commands**
  - Ban, Kick, Timeout
  - Warning System with Configurable Thresholds
  - Action Logging

- **Auto-Moderation**
  - Invite Link Detection
  - URL Filtering
  - Caps Lock Detection
  - Blacklisted Words
  - Role-based Exemptions

- **Welcome & Leave Messages**
  - Customizable Messages
  - Embed Support
  - Member Counting
  - User Mentions

## Setup Guide 🚀

### Prerequisites

- Node.js 16.9.0 or higher
- Discord.js v14
- A Discord Bot Token
- Basic knowledge of JSON

### Creating a Discord Bot

1. Visit the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name your application and click "Create"
4. Go to the "Bot" section
5. Click "Add Bot"
6. Enable these Privileged Gateway Intents:
   - PRESENCE INTENT
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT

### Installation 📥

```bash
# Clone the repository
git clone https://github.com/aaravsagar/JAMPUB.git

# Navigate to the directory
cd JAMPUB

# Install dependencies
npm install

# Create environment file
touch .env
```

### Configuration ⚙️

1. Create a `.env` file in the root directory:

```env
TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
```

2. Configure `config.json`:

```json
{
    "GUILD_ID": "your_server_id",
    "LOG_CHANNEL_ID": "channel_id_for_logs",
    "TEST_CHANNEL_ID": "test_channel_id",
    "TEST_MODE": false,
    
    "WARN_THRESHOLD": 3,
    "WARN_THRESHOLD_ACTION": "TIMEOUT",
    "WARN_THRESHOLD_DURATION": 15,

    "AUTOMOD_ENABLED": true,
    "AUTOMOD_CHECK_INVITES": true,
    "AUTOMOD_CHECK_LINKS": true,
    "AUTOMOD_CHECK_CAPS": true,
    "AUTOMOD_MAX_CAPS_PERCENT": 70,
    "AUTOMOD_MIN_LENGTH": 8,
    "AUTOMOD_ALLOW_ALL_CAPS": false,
    "AUTOMOD_BLACKLIST_WORDS": ["word1", "word2"],
    "AUTOMOD_EXEMPT_ROLES": ["role_id1", "role_id2"],

    "WELCOME_ENABLED": true,
    "WELCOME_CHANNEL_ID": "welcome_channel_id",
    "WELCOME_USE_EMBED": true,
    "WELCOME_MESSAGE": "Welcome {user} to {server}! You are member #{count}",
    "WELCOME_EMBED_COLOR": "#00ff00",

    "LEAVE_ENABLED": true,
    "LEAVE_CHANNEL_ID": "leave_channel_id",
    "LEAVE_USE_EMBED": true,
    "LEAVE_MESSAGE": "Goodbye {user}! We hope to see you again!",
    "LEAVE_EMBED_COLOR": "#ff0000"
}
```

### Available Commands 🎮

- `/ban` - Ban a user
- `/kick` - Kick a user
- `/timeout` - Timeout a user
- `/warn` - Warn a user
- `/automod` - Configure automod settings
- `/welcome` - Configure welcome messages
- `/leave` - Configure leave messages
- `/help` - Show all commands

### Message Placeholders 📝

Welcome/Leave messages support these placeholders:
- `{user}` - Shows both mention and username (e.g. @User (User#1234))
- `{server}` - Server name
- `{count}` - Member count (welcome only)

### Running the Bot 🏃‍♂️

```bash
# Start the bot
node index.js
```

### Required Bot Permissions 🔑

Add the bot to your server with these permissions:
- Manage Messages
- Kick Members
- Ban Members
- Moderate Members
- View Channels
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Use External Emojis

### Invite Link Generator 🔗

Replace `YOUR_CLIENT_ID` with your bot's client ID:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=1099511627775&scope=bot%20applications.commands
```

## Auto-Moderation Features 🛡️

The bot automatically moderates:
- Discord invite links
- External URLs
- Excessive caps usage
- Blacklisted words
- Configurable warning thresholds
- Customizable actions (Ban/Kick/Timeout)

## Support & Troubleshooting 💡

Common issues:
1. Bot not responding:
   - Check if TOKEN is correct in .env
   - Verify all intents are enabled
   - Ensure proper permissions in server

2. Commands not working:
   - Run `node deploy-commands.js` to update slash commands
   - Check bot's role hierarchy
   - Verify command permissions

3. Auto-mod not triggering:
   - Confirm AUTOMOD_ENABLED is true
   - Check exempt roles configuration
   - Verify bot's permissions

## License 📜

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ using Discord.js