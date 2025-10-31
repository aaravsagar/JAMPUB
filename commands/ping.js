import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Shows bot latency and system stats'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Calculating...', fetchReply: true });

    // Basic stats
    const ping = sent.createdTimestamp - interaction.createdTimestamp;
    const uptime = formatUptime(interaction.client.uptime);
    const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    // Embed message
    const embed = new EmbedBuilder()
      .setColor(0x00ff99)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'WebSocket Ping', value: `${interaction.client.ws.ping} ms`, inline: true },
        { name: 'Message Latency', value: `${ping} ms`, inline: true },
        { name: 'Uptime', value: uptime, inline: true },
        { name: 'Memory Usage', value: `${memory} MB`, inline: true },
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });
  }
};

// Helper to format uptime nicely
function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
